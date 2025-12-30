from fastapi import HTTPException
from sqlalchemy.orm import Session
from models import Client, UploadedFile, ColumnMapping, FileRow
import pandas as pd
from datetime import datetime as dt

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
    canonical_email = ["email", "e_mail", "email_address"]
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
    col_email = resolve_column(canonical_email, customer_map, order_map)
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
            "email": row.get(col_email),
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
            "email": col_email,
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
        canonical_email = ["email", "e_mail", "email_address"]
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
        col_email = resolve_column(canonical_email, customer_map, order_map)
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
                "email": row.get(col_email),
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
                "email": col_email,
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

def get_excel_customer_details_from_db(
    db: Session,
    current_client: Client,
    customer_identifier: str,
    file_id: int | None = None
):
    """
    Get detailed information for a specific Excel customer.
    customer_identifier can be customer_id, customer_name, or phone.
    Returns structure similar to WooCommerce customer details.
    """
    client_id = current_client.id

    # Step 1: Determine target file
    base = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)
    if file_id:
        target_file = base.filter(UploadedFile.id == file_id).first()
        if not target_file:
            raise HTTPException(404, "File not found")
    else:
        target_file = base.order_by(UploadedFile.uploaded_at.desc()).first()

    if not target_file:
        raise HTTPException(404, "No file found for this client")

    # Step 2: Get column mappings
    customer_map_obj = (
        db.query(ColumnMapping)
        .filter(
            ColumnMapping.client_id == client_id,
            ColumnMapping.file_id == target_file.id,
        )
        .order_by(ColumnMapping.updated_at.desc())
        .first()
    )

    order_map_obj = (
        db.query(ColumnMapping)
        .filter(
            ColumnMapping.client_id == client_id,
            ColumnMapping.file_id == target_file.id,
        )
        .order_by(ColumnMapping.updated_at.desc())
        .first()
    )

    customer_map = customer_map_obj.mapping if customer_map_obj else {}
    order_map = order_map_obj.mapping if order_map_obj else {}

    # Step 3: Load rows
    rows = db.query(FileRow).filter(FileRow.file_id == target_file.id).all()
    if not rows:
        raise HTTPException(404, "No data found in file")

    df = pd.DataFrame([r.data for r in rows])
    if df.empty:
        raise HTTPException(404, "No data found in file")

    df.columns = [str(c).strip() for c in df.columns]
    df = df.where(pd.notnull(df), None)

    # Step 4: Resolve columns
    def resolve_column(canonical_list, primary_map, secondary_map=None):
        col = next((primary_map.get(k) for k in canonical_list if primary_map.get(k)), None)
        if not col and secondary_map:
            col = next((secondary_map.get(k) for k in canonical_list if secondary_map.get(k)), None)
        if not col:
            col = next(
                (c for c in df.columns if any(key in c.lower() for key in canonical_list)),
                None
            )
        return col

    canonical_name = ["customer_name", "name"]
    canonical_id = ["customer_id", "id"]
    canonical_phone = ["phone", "mobile", "contact"]
    canonical_email = ["email", "e_mail", "email_address"]
    canonical_city = ["city", "location", "area", "region"]
    canonical_order_date = ["order_date", "date", "created_at"]
    canonical_order_id = ["order_id", "order_number", "external_order_id"]
    canonical_product_name = ["product_name", "product", "item_name"]
    canonical_product_qty = ["quantity", "qty", "product_quantity"]
    canonical_product_price = ["price", "product_price", "unit_price", "sales_price"]
    canonical_order_status = ["status", "order_status"]
    canonical_product_category = ["category", "product_category"]

    col_name = resolve_column(canonical_name, customer_map)
    col_id = resolve_column(canonical_id, customer_map)
    col_phone = resolve_column(canonical_phone, customer_map, order_map)
    col_email = resolve_column(canonical_email, customer_map, order_map)
    col_city = resolve_column(canonical_city, customer_map)
    col_order_date = resolve_column(canonical_order_date, order_map)
    col_order_id = resolve_column(canonical_order_id, order_map)
    col_product_name = resolve_column(canonical_product_name, order_map)
    col_product_qty = resolve_column(canonical_product_qty, order_map)
    col_product_price = resolve_column(canonical_product_price, order_map)
    col_order_status = resolve_column(canonical_order_status, order_map)
    col_product_category = resolve_column(canonical_product_category, order_map)

    # Step 5: Find customer info by identifier
    customer_info = None
    customer_identifier_str = str(customer_identifier).strip() if customer_identifier else ""

    # First, try to find customer info from DataFrame
    for _, row in df.iterrows():
        # Check if this row matches the customer identifier
        matches = False
        row_id = str(row.get(col_id, "")).strip() if col_id and row.get(col_id) else None
        row_name = str(row.get(col_name, "")).strip() if col_name and row.get(col_name) else None
        row_phone = str(row.get(col_phone, "")).strip() if col_phone and row.get(col_phone) else None

        if row_id and row_id == customer_identifier_str:
            matches = True
        elif row_name and row_name == customer_identifier_str:
            matches = True
        elif row_phone and row_phone == customer_identifier_str:
            matches = True

        if matches and not customer_info:
            # Extract customer info from first matching row
            full_name = row_name or ""
            name_parts = full_name.split() if full_name else []
            customer_info = {
                "customer_id": row_id,
                "first_name": name_parts[0] if name_parts else None,
                "last_name": " ".join(name_parts[1:]) if len(name_parts) > 1 else None,
                "email": row.get(col_email),
                "phone": row_phone,
                "address_1": row.get(col_city),  # Using city as address_1
                "city": row.get(col_city),
                "country": None,
                "state": None,
                "postcode": None,
                "company": None,
                "address_2": None,
            }
            break  # Found customer info, no need to continue

    if not customer_info:
        raise HTTPException(404, f"Customer '{customer_identifier}' not found")

    # Step 6: Build orders and products from all rows
    orders_dict = {}  # {order_id: {order_date, order_status, items: []}}
    products_dict = {}  # {product_name: {total_quantity, product_id}}

    # Use the identifier we found to match rows
    matching_identifier = customer_info.get("customer_id") or customer_info.get("first_name") or customer_info.get("phone")
    
    for row in rows:
        row_data = row.data or {}
        
        # Check if this row belongs to our customer
        row_customer_id = str(row_data.get(col_id, "")).strip() if col_id and row_data.get(col_id) else None
        row_customer_name = str(row_data.get(col_name, "")).strip() if col_name and row_data.get(col_name) else None
        row_customer_phone = str(row_data.get(col_phone, "")).strip() if col_phone and row_data.get(col_phone) else None

        matches_customer = False
        if row_customer_id and row_customer_id == customer_identifier_str:
            matches_customer = True
        elif row_customer_name and row_customer_name == customer_identifier_str:
            matches_customer = True
        elif row_customer_phone and row_customer_phone == customer_identifier_str:
            matches_customer = True
        # Also match by the identifier we found
        elif matching_identifier:
            if row_customer_id and str(row_customer_id) == str(matching_identifier):
                matches_customer = True
            elif row_customer_name and str(row_customer_name) == str(matching_identifier):
                matches_customer = True
            elif row_customer_phone and str(row_customer_phone) == str(matching_identifier):
                matches_customer = True

        if not matches_customer:
            continue

        # Extract order info
        order_id = row_data.get(col_order_id) or f"order_{len(orders_dict)}"
        order_date = row_data.get(col_order_date)
        order_status = row_data.get(col_order_status) or "completed"
        product_name = row_data.get(col_product_name) or "Unknown Product"
        product_qty = row_data.get(col_product_qty)
        product_price = row_data.get(col_product_price)
        product_category = row_data.get(col_product_category)

        # Parse quantities and prices
        try:
            qty = float(str(product_qty).replace(",", "")) if product_qty else 1
        except:
            qty = 1

        try:
            price = float(str(product_price).replace(",", "")) if product_price else 0.0
        except:
            price = 0.0

        # Add to orders
        if order_id not in orders_dict:
            # Try to parse order_id as int, otherwise use None
            order_id_int = None
            external_order_id_val = None
            try:
                if isinstance(order_id, (int, float)):
                    order_id_int = int(order_id)
                    external_order_id_val = order_id_int
                elif isinstance(order_id, str):
                    # Try to extract number from string like "order_123" or just "123"
                    if order_id.startswith("order_"):
                        num_str = order_id.replace("order_", "")
                        if num_str.isdigit():
                            order_id_int = int(num_str)
                            external_order_id_val = order_id_int
                    elif order_id.isdigit():
                        order_id_int = int(order_id)
                        external_order_id_val = order_id_int
                    else:
                        external_order_id_val = order_id  # Keep as string if not numeric
            except:
                external_order_id_val = order_id  # Keep original value if parsing fails
            
            # Handle order_date - convert to datetime if needed
            order_date_dt = None
            if order_date:
                if hasattr(order_date, 'to_pydatetime'):
                    # pandas Timestamp
                    order_date_dt = order_date.to_pydatetime()
                elif isinstance(order_date, dt):
                    # Already a datetime
                    order_date_dt = order_date
                elif isinstance(order_date, str):
                    # Try to parse string
                    try:
                        order_date_dt = pd.to_datetime(order_date).to_pydatetime()
                    except:
                        order_date_dt = None
            
            orders_dict[order_id] = {
                "order_id": order_id_int,
                "external_order_id": external_order_id_val,
                "order_date": order_date_dt,
                "order_status": order_status,
                "order_total": 0.0,
                "payment_method": None,  # Excel data may not have payment method
                "items": []
            }

        # Add item to order
        item = {
            "product_id": None,  # Excel data may not have product_id
            "product_name": product_name,
            "product_quantity": int(qty),
            "product_price": price,
            "product_category": product_category,
            "product_stock_status": None,  # Excel data may not have stock status
            "product_weight": None  # Excel data may not have weight
        }
        orders_dict[order_id]["items"].append(item)
        
        # For Excel data, product_price field contains the total order amount, not per-item price
        # Set order_total to the price value (which is the total order amount)
        # Only update if order_total is still 0 (first item sets it)
        if orders_dict[order_id]["order_total"] == 0.0 and price > 0:
            orders_dict[order_id]["order_total"] = price

        # Aggregate products
        if product_name not in products_dict:
            products_dict[product_name] = {
                "product_id": product_name,  # Use product_name as ID for Excel
                "product_name": product_name,
                "total_quantity": 0
            }
        products_dict[product_name]["total_quantity"] += int(qty)

    # Step 7: Format response
    orders_list = list(orders_dict.values())
    
    # Ensure order_date is properly formatted (already handled above, but double-check)
    for order in orders_list:
        if order["order_date"] and not isinstance(order["order_date"], dt):
            if isinstance(order["order_date"], str):
                try:
                    order["order_date"] = pd.to_datetime(order["order_date"]).to_pydatetime()
                except:
                    order["order_date"] = None
            elif hasattr(order["order_date"], 'to_pydatetime'):
                try:
                    order["order_date"] = order["order_date"].to_pydatetime()
                except:
                    order["order_date"] = None

    # Sort products by quantity
    all_products_summary = sorted(
        list(products_dict.values()),
        key=lambda x: x["total_quantity"],
        reverse=True
    )

    # Top 5 products
    top_products = all_products_summary[:5]

    return {
        "customer": customer_info,
        "orders": orders_list,
        "top_products": top_products,
        "all_products_summary": all_products_summary
    }