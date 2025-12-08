from sqlalchemy.orm import Session
from typing import Dict, Any
from fastapi import HTTPException
from models import UploadedFile, ColumnMapping, FileRow, Client
import pandas as pd
from sqlalchemy import or_

def get_top_selling_products_from_db(
    db: Session,
    current_client: Client,
    file_id: int | None = None,
    limit: int = 5
):
    client_id = current_client.id

    # 1️⃣ Determine target file (latest if not passed)
    base = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)
    
    if file_id:
        target_file = base.filter(UploadedFile.id == file_id).first()
        if not target_file:
            raise HTTPException(404, "File not found")
    else:
        target_file = base.order_by(UploadedFile.uploaded_at.desc()).first()
    print("file id ###########", target_file.id)
    if not target_file:
        return []

    # 2️⃣ Get mapping for this file
    mapping_obj = (
        db.query(ColumnMapping)
        .filter(
            ColumnMapping.client_id == client_id,
            ColumnMapping.file_id == target_file.id
        )
        .order_by(ColumnMapping.updated_at.desc())
        .first()
    )

    if not mapping_obj or not mapping_obj.mapping:
        return []

    mapping = mapping_obj.mapping

    # 3️⃣ Canonical mapping resolution
    canonical_product = ["product_name", "productName", "name"]
    canonical_qty = ["quantity", "qty", "quantity_ordered"]
    canonical_price = ["sales_price", "price", "unit_price", "rate"]
    canonical_amount = ["total_amount", "amount", "line_total"]

    col_product = next((mapping.get(k) for k in canonical_product if mapping.get(k)), None)
    col_qty = next((mapping.get(k) for k in canonical_qty if mapping.get(k)), None)
    col_price = next((mapping.get(k) for k in canonical_price if mapping.get(k)), None)
    col_amount = next((mapping.get(k) for k in canonical_amount if mapping.get(k)), None)

    # product name is required
    if not col_product:
        return []

    # 4️⃣ Fetch file rows
    rows = db.query(FileRow).filter(FileRow.file_id == target_file.id).all()
    if not rows:
        return []

    # 5️⃣ Aggregate
    product_bucket = {}

    for r in rows:
        data = r.data or {}

        product = data.get(col_product)
        if not product:
            continue

        bucket = product_bucket.setdefault(product, {
            "total_quantity_sold": 0,
            "total_sales": 0.0
        })

        # quantity
        qty_val = None
        if col_qty:
            qty_val = data.get(col_qty)
            try:
                qty_val = float(str(qty_val).replace(",", "").strip())
            except:
                qty_val = None

        # price or amount
        line_total = None

        # Prefer amount column
        if col_amount and data.get(col_amount) is not None:
            try:
                amt = float(str(data.get(col_amount)).replace(",", "").strip())
                line_total = amt
            except:
                line_total = None

        # If amount not available, compute price * qty
        elif col_price and qty_val is not None:
            try:
                price = float(str(data.get(col_price)).replace(",", "").strip())
                line_total = price * qty_val
            except:
                line_total = None

        # Update bucket
        if qty_val:
            bucket["total_quantity_sold"] += qty_val
        if line_total:
            bucket["total_sales"] += line_total

    # 6️⃣ Convert to sorted list
    result = [
        {
            "name": name,
            "total_quantity_sold": round(info["total_quantity_sold"], 2),
            "total_sales": round(info["total_sales"], 2),
        }
        for name, info in product_bucket.items()
    ]

    result.sort(key=lambda x: (-x["total_sales"], -x["total_quantity_sold"]))

    return result[:limit]

def get_top_selling_products_by_date_from_db(
    db: Session,
    current_client: Client,
    start_date: str,
    end_date: str,
    file_id: int | None = None,
    limit: int = 5
):
    client_id = current_client.id

    # 1️⃣ Determine target file
    base = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)

    if file_id:
        target_file = base.filter(UploadedFile.id == file_id).first()
        if not target_file:
            raise HTTPException(404, "File not found")
    else:
        target_file = base.order_by(UploadedFile.uploaded_at.desc()).first()
    print("@@@@@@@@@@@@@@", target_file.id)
    if not target_file:
        return []

    # 2️⃣ Get mapping
    mapping_obj = (
        db.query(ColumnMapping)
        .filter(
            ColumnMapping.client_id == client_id,
            ColumnMapping.file_id == target_file.id
        )
        .order_by(ColumnMapping.updated_at.desc())
        .first()
    )
    print("MAPPING:", mapping_obj.mapping if mapping_obj else None)
    if not mapping_obj or not mapping_obj.mapping:
        return []

    mapping = mapping_obj.mapping

    # 3️⃣ Canonical mapping resolution
    canonical_product = ["product_name", "productName", "name"]
    canonical_qty = ["quantity", "qty", "quantity_ordered"]
    canonical_price = ["sales_price", "price", "unit_price", "rate"]
    canonical_amount = ["total_amount", "amount", "line_total"]
    canonical_date = ["order_date", "date", "orderDate", "Date", "created_at"]

    col_product = next((mapping.get(k) for k in canonical_product if mapping.get(k)), None)
    col_qty = next((mapping.get(k) for k in canonical_qty if mapping.get(k)), None)
    col_price = next((mapping.get(k) for k in canonical_price if mapping.get(k)), None)
    col_amount = next((mapping.get(k) for k in canonical_amount if mapping.get(k)), None)
    col_date = next((mapping.get(k) for k in canonical_date if mapping.get(k)), None)

    if not col_product or not col_date:
        return []

    # 4️⃣ Load rows
    rows = db.query(FileRow).filter(FileRow.file_id == target_file.id).all()
    if not rows:
        return []

    # 5️⃣ Aggregate
    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)

    product_bucket = {}

    for r in rows:
        data = r.data or {}

        # date filter
        raw_date = data.get(col_date)
        try:
            order_dt = pd.to_datetime(raw_date)
        except:
            continue

        if not (start_dt <= order_dt <= end_dt):
            continue

        product = data.get(col_product)
        if not product:
            continue

        bucket = product_bucket.setdefault(product, {
            "total_quantity_sold": 0,
            "total_sales": 0.0
        })

        # quantity
        qty_val = None
        if col_qty:
            try:
                qty_val = float(str(data.get(col_qty)).replace(",", ""))
            except:
                qty_val = None

        # total amount or price×qty
        line_total = None

        if col_amount and data.get(col_amount) is not None:
            try:
                line_total = float(str(data.get(col_amount)).replace(",", ""))
            except:
                line_total = None

        elif col_price and qty_val:
            try:
                price = float(str(data.get(col_price)).replace(",", ""))
                line_total = price * qty_val
            except:
                line_total = None

        # update bucket
        if qty_val:
            bucket["total_quantity_sold"] += qty_val
        if line_total:
            bucket["total_sales"] += line_total

    # 6️⃣ Sort results
    result = [
        {
            "name": name,
            "total_quantity_sold": round(v["total_quantity_sold"], 2),
            "total_sales": round(v["total_sales"], 2)
        }
        for name, v in product_bucket.items()
    ]

    result.sort(key=lambda x: (-x["total_sales"], -x["total_quantity_sold"]))

    return result[:limit]

def get_products_sales_table_from_db(
    db: Session,
    current_client: Client,
    start_date: str,
    end_date: str,
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
        return {"columns": {}, "rows": []}

    # ---------------- 2) Get Column Mapping ----------------
    mapping_obj = (
        db.query(ColumnMapping)
        .filter(
            ColumnMapping.client_id == client_id,
            ColumnMapping.file_id == target_file.id
        )
        .order_by(ColumnMapping.updated_at.desc())
        .first()
    )

    if not mapping_obj or not mapping_obj.mapping:
        return {"columns": {}, "rows": []}

    mapping = mapping_obj.mapping

    # ---------------- 3) Canonical Mapping Resolution ----------------
    canonical_product = ["product_name", "productName", "name"]
    canonical_category = ["category", "group", "type"]
    canonical_qty = ["quantity", "qty", "quantity_ordered", "units"]
    canonical_price = ["sales_price", "price", "unit_price", "rate"]
    canonical_amount = ["total_amount", "amount", "line_total"]
    canonical_date = ["order_date", "date", "orderDate", "created_at"]

    col_product = next((mapping.get(k) for k in canonical_product if mapping.get(k)), None)
    col_category = next((mapping.get(k) for k in canonical_category if mapping.get(k)), None)
    col_qty = next((mapping.get(k) for k in canonical_qty if mapping.get(k)), None)
    col_price = next((mapping.get(k) for k in canonical_price if mapping.get(k)), None)
    col_amount = next((mapping.get(k) for k in canonical_amount if mapping.get(k)), None)
    col_date = next((mapping.get(k) for k in canonical_date if mapping.get(k)), None)

    # product & date are required
    if not col_product or not col_date:
        return {"columns": {}, "rows": []}

    # ---------------- 4) Load File Rows ----------------
    rows = db.query(FileRow).filter(FileRow.file_id == target_file.id).all()
    if not rows:
        return {"columns": {}, "rows": []}

    df = pd.DataFrame([r.data for r in rows])
    if df.empty:
        return {"columns": {}, "rows": []}

    df.columns = [str(c).strip() for c in df.columns]
    df = df.where(pd.notnull(df), None)

    # ---------------- 5) Filter by Date Range ----------------
    df[col_date] = pd.to_datetime(df[col_date], errors="coerce")

    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)

    df = df[(df[col_date] >= start_dt) & (df[col_date] <= end_dt)]

    if df.empty:
        return {"columns": {}, "rows": []}

    # ---------------- 6) Fallback Column Detection ----------------
    if not col_product:
        col_product = next((c for c in df.columns if "product" in c.lower()), None)
    if not col_category:
        col_category = next((c for c in df.columns if "category" in c.lower()), None)
    if not col_qty:
        col_qty = next((c for c in df.columns if c.lower() in ["quantity", "qty", "units"]), None)
    if not col_price and not col_amount:
        col_price = next((c for c in df.columns if c.lower() in ["price", "unit_price", "rate"]), None)

    # ---------------- 7) Parse Numeric Fields ----------------
    if col_qty in df.columns:
        df[col_qty] = pd.to_numeric(df[col_qty], errors="coerce").fillna(1)
    else:
        df["__qty__"] = 1
        col_qty = "__qty__"

    if col_amount in df.columns:
        df[col_amount] = pd.to_numeric(df[col_amount], errors="coerce").fillna(0.0)
        df["__price__"] = df[col_amount]
        col_price = "__price__"
    else:
        if col_price in df.columns:
            df[col_price] = pd.to_numeric(df[col_price], errors="coerce").fillna(0.0)
        else:
            df["__price__"] = 0.0
            col_price = "__price__"

    # ---------------- 8) Build Response ----------------
    result_rows = []
    for idx, row in df.iterrows():
        result_rows.append({
            "id": idx + 1,
            "name": row.get(col_product),
            "category": row.get(col_category),
            "price": float(row.get(col_price) or 0),
            "quantity": float(row.get(col_qty) or 0),
            "date": row.get(col_date).strftime("%Y-%m-%d") if pd.notnull(row.get(col_date)) else None
        })

    return {
        "file_id": target_file.id,
        "columns": {
            "product": col_product,
            "category": col_category,
            "quantity": col_qty,
            "price": col_price,
            "date": col_date
        },
        "rows": result_rows
    }

