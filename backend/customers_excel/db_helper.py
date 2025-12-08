from fastapi import HTTPException
from sqlalchemy.orm import Session
from models import Client, UploadedFile, ColumnMapping, FileRow
import pandas as pd

def get_customers_table_from_db(
    db: Session,
    current_client: Client,
    file_id: int | None = None
):
    client_id = current_client.id

    # ---------------- 1) Determine Target File ----------------
    base = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)

    if file_id:
        target_file = base.filter(UploadedFile.id == file_id).first()
        if not target_file:
            raise HTTPException(404, "File not found")
    else:
        target_file = base.order_by(UploadedFile.uploaded_at.desc()).first()

    if not target_file:
        return {"file_id": None, "columns": {}, "rows": []}

    # ---------------- 2) Get Column Mappings ----------------
    customer_map_obj = (
        db.query(ColumnMapping)
        .filter(
            ColumnMapping.client_id == client_id,
            ColumnMapping.file_id == target_file.id,
            # ColumnMapping.analysis_type == "customer"
        )
        .order_by(ColumnMapping.updated_at.desc())
        .first()
    )

    order_map_obj = (
        db.query(ColumnMapping)
        .filter(
            ColumnMapping.client_id == client_id,
            ColumnMapping.file_id == target_file.id,
            # ColumnMapping.analysis_type == "order"
        )
        .order_by(ColumnMapping.updated_at.desc())
        .first()
    )

    customer_map = customer_map_obj.mapping if customer_map_obj else {}
    order_map = order_map_obj.mapping if order_map_obj else {}

    if not customer_map and not order_map:
        return {"file_id": target_file.id, "columns": {}, "rows": []}

    # ---------------- 3) Canonical Fields ----------------
    canonical_name = ["customer_name", "name"]
    canonical_id = ["customer_id", "id"]
    canonical_phone = ["phone", "mobile", "contact"]
    canonical_city = ["city", "location", "area", "region"]

    # ---------------- 4) Load rows ----------------
    rows = db.query(FileRow).filter(FileRow.file_id == target_file.id).all()
    if not rows:
        return {"file_id": target_file.id, "columns": {}, "rows": []}

    df = pd.DataFrame([r.data for r in rows])
    if df.empty:
        return {"file_id": target_file.id, "columns": {}, "rows": []}

    df.columns = [str(c).strip() for c in df.columns]
    df = df.where(pd.notnull(df), None)

    # ---------------- Helper: resolve canonical field ----------------
    def resolve_column(canonical_list, primary_map, secondary_map=None):
        # 1) Explicit customer mapping
        col = next((primary_map.get(k) for k in canonical_list if primary_map.get(k)), None)

        # 2) fallback: order mapping (for phone mostly)
        if not col and secondary_map:
            col = next((secondary_map.get(k) for k in canonical_list if secondary_map.get(k)), None)

        # 3) auto detect
        if not col:
            col = next(
                (c for c in df.columns if any(key in c.lower() for key in canonical_list)),
                None
            )
        return col

    # ---------------- 5) Resolve final columns ----------------
    col_name = resolve_column(canonical_name, customer_map)
    col_id = resolve_column(canonical_id, customer_map)
    col_phone = resolve_column(canonical_phone, customer_map, order_map)
    col_city = resolve_column(canonical_city, customer_map)

    # If absolutely nothing mapped → return empty
    if not any([col_name, col_id, col_phone, col_city]):
        return {"file_id": target_file.id, "columns": {}, "rows": []}

    # ---------------- 6) ORDER AGGREGATION (from second API logic) ----------------
    # canonical fields for orders
    canonical_order_customer = ["customer_name"]
    canonical_amount_keys = ["total_amount","sales_price", "price"]

    order_customer_col = next((order_map.get(k) for k in canonical_order_customer if order_map.get(k)), None)
    amount_col = next((order_map.get(k) for k in canonical_amount_keys if order_map.get(k)), None)

    # aggregate dict = { customer_name: { total_orders, total_spending } }
    order_stats = {}

    for row in rows:
        payload = row.data or {}

        cust = payload.get(order_customer_col)
        if not cust:
            continue

        stat = order_stats.setdefault(cust, {"total_orders": 0, "total_spending": 0.0})
        stat["total_orders"] += 1

        if amount_col:
            value = payload.get(amount_col)
            if value:
                try:
                    stat["total_spending"] += float(str(value).replace(",", "").strip())
                except:
                    pass
    # ---------------- 6) Build rows & remove duplicates ----------------
    seen = set()
    result_rows = []

    for _, row in df.iterrows():
        cid = str(row.get(col_id)).strip() if col_id and row.get(col_id) else None
        cname = row.get(col_name).strip() if col_name and row.get(col_name) else None

        # Create unique key (use whichever exists)
        unique_key = cid or cname

        if not unique_key:
            continue

        if unique_key in seen:
            continue  # skip duplicate row
        seen.add(unique_key)

         # merge order stats
        stats = order_stats.get(cname, {"total_orders": 0, "total_spending": 0.0})

        customer = {
            "customer_name": cname,
            "customer_id": cid,
            "phone": row.get(col_phone),
            "city": row.get(col_city),
            "order_count": stats["total_orders"],
            "total_spending": round(stats["total_spending"], 3)
        }

        result_rows.append(customer)

    # ---------------- 7) Response ----------------
    return {
        "file_id": target_file.id,
        "columns": {
            "customer_name": col_name,
            "customer_id": col_id,
            "phone": col_phone,
            "city": col_city,
            "order_count": order_customer_col,
            "total_spending": amount_col
        },
        "rows": result_rows
    }

def get_aggregate_customers_from_orders_from_db(
    db: Session,
    identity: Client,
    file_id: int | None = None
) -> dict:
    """Return full per-customer aggregates using canonical mapping approach."""
    try:
        if not identity or not getattr(identity, "id", None):
            return {"file_id": None, "columns": {}, "rows": []}

        client_id = identity.id

        # Step 1: determine target file
        base = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)
        if file_id:
            target_file = base.filter(UploadedFile.id == file_id).first()
            if not target_file:
                return {"file_id": None, "columns": {}, "rows": []}
        else:
            target_file = base.order_by(UploadedFile.uploaded_at.desc()).first()
            if not target_file:
                return {"file_id": None, "columns": {}, "rows": []}

        # Step 2: get column mappings
        customer_map_obj = (
            db.query(ColumnMapping)
            .filter(ColumnMapping.client_id == client_id, ColumnMapping.file_id == target_file.id)
            .order_by(ColumnMapping.updated_at.desc())
            .first()
        )
        order_map_obj = (
            db.query(ColumnMapping)
            .filter(ColumnMapping.client_id == client_id, ColumnMapping.file_id == target_file.id)
            .order_by(ColumnMapping.updated_at.desc())
            .first()
        )

        customer_map = customer_map_obj.mapping if customer_map_obj else {}
        order_map = order_map_obj.mapping if order_map_obj else {}
        if not customer_map and not order_map:
            return {"file_id": target_file.id, "columns": {}, "rows": []}

        # Step 3: canonical fields
        canonical_name = ["customer_name", "name"]
        canonical_id = ["customer_id", "id"]
        canonical_phone = ["phone", "mobile", "contact"]
        canonical_city = ["city", "location", "area", "region"]
        canonical_order_amount = ["total_amount","sales_price","price"]
        canonical_order_customer = ["customer_name"]
        canonical_order_date = ["order_date", "date"]

        # Step 4: load rows
        rows = db.query(FileRow).filter(FileRow.file_id == target_file.id).all()
        if not rows:
            return {"file_id": target_file.id, "columns": {}, "rows": []}
        df = pd.DataFrame([r.data for r in rows])
        if df.empty:
            return {"file_id": target_file.id, "columns": {}, "rows": []}
        df.columns = [str(c).strip() for c in df.columns]
        df = df.where(pd.notnull(df), None)

        # Step 5: resolve column helper
        def resolve_column(canonical_list, primary_map, secondary_map=None):
            col = next((primary_map.get(k) for k in canonical_list if primary_map.get(k)), None)
            if not col and secondary_map:
                col = next((secondary_map.get(k) for k in canonical_list if secondary_map.get(k)), None)
            if not col:
                col = next((c for c in df.columns if any(key in c.lower() for key in canonical_list)), None)
            return col

        # Step 6: resolve final columns
        col_name = resolve_column(canonical_name, customer_map)
        col_id = resolve_column(canonical_id, customer_map)
        col_phone = resolve_column(canonical_phone, customer_map, order_map)
        col_city = resolve_column(canonical_city, customer_map)
        order_customer_col = resolve_column(canonical_order_customer, order_map)
        amount_col = resolve_column(canonical_order_amount, order_map)
        date_col = resolve_column(canonical_order_date, order_map)

        # Step 7: process amount and date columns
        if amount_col and amount_col in df.columns:
            df[amount_col] = pd.to_numeric(df[amount_col], errors="coerce").fillna(0)
        if date_col and date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce")

        # Step 8: aggregate order stats per customer
        order_stats = {}
        for row in rows:
            payload = row.data or {}
            cust = payload.get(order_customer_col)
            if not cust:
                continue
            stat = order_stats.setdefault(cust, {"total_orders": 0, "total_spending": 0.0, "last_order_date": None})
            stat["total_orders"] += 1
            if amount_col and payload.get(amount_col):
                try:
                    stat["total_spending"] += float(str(payload.get(amount_col)).replace(",", "").strip())
                except:
                    pass
            if date_col and payload.get(date_col):
                try:
                    dt = pd.to_datetime(payload.get(date_col), errors="coerce")
                    if dt and (not stat["last_order_date"] or dt > stat["last_order_date"]):
                        stat["last_order_date"] = dt
                except:
                    pass

        # Step 9: build unique customer rows
        seen = set()
        result_rows = []
        for _, row in df.iterrows():
            cname = row.get(col_name).strip() if col_name and row.get(col_name) else None
            cid = str(row.get(col_id)).strip() if col_id and row.get(col_id) else None
            unique_key = cid or cname
            if not unique_key or unique_key in seen:
                continue
            seen.add(unique_key)

            stats = order_stats.get(cname, {"total_orders": 0, "total_spending": 0.0, "last_order_date": None})
            result_rows.append({
                "customer_name": cname,
                "customer_id": cid,
                "phone": row.get(col_phone),
                "city": row.get(col_city),
                "order_count": stats["total_orders"],
                "total_spending": round(stats["total_spending"], 3),
                "last_order_date": stats["last_order_date"].isoformat() if stats["last_order_date"] else None
            })

        # Step 10: return response
        return {
            "file_id": target_file.id,
            "columns": {
                "customer_name": col_name,
                "customer_id": col_id,
                "phone": col_phone,
                "city": col_city,
                "order_count": order_customer_col,
                "total_spending": amount_col,
                "last_order_date": date_col
            },
            "rows": result_rows
        }
    except Exception as e:
        # Always return dict, never None
        return {"file_id": None, "columns": {}, "rows": []}