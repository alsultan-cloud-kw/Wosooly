from fastapi import Depends, Query, HTTPException
from sqlalchemy.orm import Session
from models import Client, UploadedFile, FileRow, ColumnMapping
from typing import Optional, Dict, Any, List
from sqlalchemy import func
from utils.auth import get_current_client
from database import get_db

def _empty_response() -> dict:
  return {"file_id": None, "file_name": None, "rows": []}

def get_total_sales_from_db(
    db: Session,
    current_user: Client,
    file_id: int | None = None
):
    # 1️⃣ Pick file
    if file_id:
        target_file = db.query(UploadedFile)\
                        .filter(UploadedFile.id == file_id,
                                UploadedFile.client_id == current_user.id)\
                        .first()
        if not target_file:
            raise HTTPException(404, "File not found")
    else:
        target_file = db.query(UploadedFile)\
                        .filter(UploadedFile.client_id == current_user.id)\
                        .order_by(UploadedFile.uploaded_at.desc())\
                        .first()
        if not target_file:
            return {"file_id": None, "total_sales": 0.0, "row_count": 0}

    file_id = target_file.id

    # 2️⃣ Get mapping (ignore analysis_type)
    mapping = db.query(ColumnMapping)\
                .filter(ColumnMapping.file_id == file_id,
                        ColumnMapping.client_id == current_user.id)\
                .first()
    if not mapping or not mapping.mapping:
        return {"file_id": file_id, "total_sales": 0.0, "row_count": 0}

    mapping_dict = mapping.mapping

    # 3️⃣ Determine which column to sum
    canonical_keys = ["total_amount", "sales_price"]  # add more if needed
    amount_col = next((mapping_dict.get(k) for k in canonical_keys if mapping_dict.get(k)), None)

    if not amount_col:
        return {"file_id": file_id, "total_sales": 0.0, "row_count": 0}

    # 4️⃣ Sum the column
    rows = db.query(FileRow).filter(FileRow.file_id == file_id).all()
    total_sales = 0.0
    row_count = 0

    for row in rows:
        data = row.data or {}
        value = data.get(amount_col)
        try:
            total_sales += float(str(value).replace(",", "").strip())
            row_count += 1
        except Exception:
            continue

    return {
        "file_id": file_id,
        "total_sales": round(total_sales, 2),
        "row_count": row_count
    }

def get_total_products_from_db(
    db: Session,
    current_user: Client,
    file_id: Optional[int] = None,
) -> Dict[str, Any]:

    client_id = getattr(current_user, "id", None)
    if not client_id:
        return {"file_id": None, "total_products": 0, "row_count": 0}

    # 1️⃣ Determine target file
    base_query = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)

    if file_id:
        target_file = base_query.filter(UploadedFile.id == file_id).first()
        if not target_file:
            raise HTTPException(404, "File not found")
    else:
        target_file = base_query.order_by(UploadedFile.uploaded_at.desc()).first()
        if not target_file:
            return {"file_id": None, "total_products": 0, "row_count": 0}

    file_id = target_file.id

    # 2️⃣ Load product mapping
    mapping_obj = (
        db.query(ColumnMapping)
        .filter(
            ColumnMapping.file_id == file_id,
            ColumnMapping.client_id == client_id,
            # ColumnMapping.analysis_type == "product",
        )
        .first()
    )

    if not mapping_obj or not mapping_obj.mapping:
        return {"file_id": file_id, "total_products": 0, "row_count": 0}

    mapping = mapping_obj.mapping

    # 3️⃣ Canonical product keys
    canonical_id_keys = ["product_id"]
    canonical_name_keys = ["product_name"]
    canonical_price_keys = ["sales_price"]
    canonical_weight_keys = ["weight"]

    col_product_id = next((mapping.get(k) for k in canonical_id_keys if mapping.get(k)), None)
    col_product_name = next((mapping.get(k) for k in canonical_name_keys if mapping.get(k)), None)
    col_sales_price = next((mapping.get(k) for k in canonical_price_keys if mapping.get(k)), None)
    col_weight = next((mapping.get(k) for k in canonical_weight_keys if mapping.get(k)), None)

    # product_name is required in your schema → MUST exist
    if not col_product_name:
        
        return {"file_id": file_id, "total_products": 0, "row_count": 0}
    
    # 4️⃣ Load rows for this file
    rows = (
        db.query(FileRow)
        .filter(FileRow.file_id == file_id)
        .all()
    )
    
    if not rows:
        return {"file_id": file_id, "total_products": 0, "row_count": 0}

    unique_products = set()
    row_count = 0

    # 5️⃣ Composite identity logic
    for row in rows:
        data = row.data or {}

        pid = data.get(col_product_id)
        name = data.get(col_product_name)
        price = data.get(col_sales_price)
        weight = data.get(col_weight)

        # Skip empty names (required field)
        if not name and not pid:
            continue

        row_count += 1

        # Priority 1: Product ID → Always unique
        if pid:
            unique_products.add(str(pid).strip())
            continue

        # Priority 2: name + weight combo
        if name and weight:
            unique_products.add((str(name).strip(), float(weight)))
            continue

        # Priority 3: name only
        if name:
            unique_products.add(str(name).strip())
            continue

        # Priority 4: weight only  
        if weight:
            unique_products.add(float(weight))

    return {
        "file_id": file_id,
        "total_products": len(unique_products),
        "row_count": row_count,
    }

def get_total_customers_from_db(
    db: Session,
    current_user: Client,
    file_id: Optional[int] = None,
) -> Dict[str, int | None]:
    """
    Returns total unique customers for a given file (or latest file if file_id not provided).
    Uses canonical fields: `customer_name` and `phone`.
    Works for any language because it relies on the file mapping table.
    """
    # 1️⃣ Determine target file
    if file_id:
        target_file = (
            db.query(UploadedFile)
            .filter(UploadedFile.id == file_id, UploadedFile.client_id == current_user.id)
            .first()
        )
        if not target_file:
            raise HTTPException(404, "File not found")
    else:
        # Pick latest file for this client
        target_file = (
            db.query(UploadedFile)
            .filter(UploadedFile.client_id == current_user.id)
            .order_by(UploadedFile.uploaded_at.desc())
            .first()
        )
        if not target_file:
            return {"file_id": None, "total_customers": 0, "row_count": 0}

    file_id = target_file.id

    # 2️⃣ Get column mapping for this file
    mapping_obj = (
        db.query(ColumnMapping)
        .filter(ColumnMapping.file_id == file_id, ColumnMapping.client_id == current_user.id)
        .first()
    )
    if not mapping_obj or not mapping_obj.mapping:
        return {"file_id": file_id, "total_customers": 0, "row_count": 0}

    mapping_dict = mapping_obj.mapping

    # 3️⃣ Canonical fields for customer identity
    canonical_name_keys = ["customer_name"]
    canonical_phone_keys = ["phone"]
    name_col = next((mapping_dict.get(k) for k in canonical_name_keys if mapping_dict.get(k)), None)
    phone_col = next((mapping_dict.get(k) for k in canonical_phone_keys if mapping_dict.get(k)), None)

    if not name_col and not phone_col:
        return {"file_id": file_id, "total_customers": 0, "row_count": 0}

    # 4️⃣ Query all rows for this file
    rows = (
        db.query(FileRow)
        .filter(FileRow.file_id == file_id)
        .all()
    )

    row_count = 0
    uniques = set()

    for row in rows:
        data = row.data or {}
        name_val = data.get(name_col) if name_col else None
        phone_val = data.get(phone_col) if phone_col else None

        if name_val or phone_val:
            row_count += 1
            if name_val and phone_val:
                uniques.add((str(name_val).strip(), str(phone_val).strip()))
            elif phone_val:
                uniques.add(str(phone_val).strip())
            else:
                uniques.add(str(name_val).strip())

    return {
        "file_id": file_id,
        "total_customers": len(uniques),
        "row_count": row_count
    }

def get_total_orders_count_data_from_db(
    db: Session,
    identity: Client,
    file_id: Optional[int] = None,
) -> Dict[str, int | None]:

    client_id = getattr(identity, "id", None)
    if not client_id:
        return {"count": 0, "file_id": None}

    # 1️⃣ Determine target file
    base_query = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)

    if file_id:
        target_file = base_query.filter(UploadedFile.id == file_id).first()
        if not target_file:
            return {"count": 0, "file_id": None}
    else:
        target_file = base_query.order_by(UploadedFile.uploaded_at.desc()).first()
        if not target_file:
            return {"count": 0, "file_id": None}

    # 2️⃣ Get file-specific mapping (ignore analysis_type)
    mapping_obj = (
        db.query(ColumnMapping)
        .filter(ColumnMapping.client_id == client_id,
                ColumnMapping.file_id == target_file.id)
        .order_by(ColumnMapping.updated_at.desc())
        .first()
    )
    if not mapping_obj or not mapping_obj.mapping:
        return {"count": 0, "file_id": target_file.id}

    mapping_dict = mapping_obj.mapping

    # 3️⃣ Use canonical field
    canonical_order_keys = ["order_id"]

    order_col = next((mapping_dict.get(k) for k in canonical_order_keys if mapping_dict.get(k)), None)

    if not order_col:
        return {"count": 0, "file_id": target_file.id}

    # 4️⃣ Count rows where the mapped column exists
    count = (
        db.query(func.count(FileRow.id))
        .filter(FileRow.file_id == target_file.id)
        .filter(FileRow.data[order_col].astext.isnot(None))
        .filter(FileRow.data[order_col].astext != "")
    ).scalar() or 0

    return {"file_id": target_file.id, "count": count}

def get_top_customers_from_db(
    db: Session,
    identity: Client,
    limit: int,
    file_id: Optional[int] = None,
):
    client_id = identity.id

    # ---- Get target file ----
    base = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)

    if file_id:
        target_file = base.filter(UploadedFile.id == file_id).first()
    else:
        target_file = base.order_by(UploadedFile.uploaded_at.desc()).first()

    if not target_file:
        return {"file_id": None, "rows": []}

    # ---- Load mapping FOR THIS FILE ----
    mapping_obj = (
        db.query(ColumnMapping)
        .filter(
            ColumnMapping.client_id == client_id,
            ColumnMapping.file_id == target_file.id,
            # ColumnMapping.analysis_type == "order",
        )
        .order_by(ColumnMapping.updated_at.desc())
        .first()
    )

    if not mapping_obj or not mapping_obj.mapping:
        return {"file_id": target_file.id, "rows": []}

    mapping = mapping_obj.mapping

    # Canonical fields
    canonical_customer_keys = ["customer_name"]
    canonical_amount_keys = ["total_amount", "sales_price"]

    customer_column = next((mapping.get(k) for k in canonical_customer_keys if mapping.get(k)), None)
    amount_column = next((mapping.get(k) for k in canonical_amount_keys if mapping.get(k)), None)

    if not customer_column:
        return {"file_id": target_file.id, "rows": []}

    # ---- Load rows ----
    rows = (
        db.query(FileRow)
        .filter(FileRow.file_id == target_file.id)
        .all()
    )

    if not rows:
        return {"file_id": target_file.id, "rows": []}

    # ---- Load rows ----
    rows = db.query(FileRow).filter(FileRow.file_id == target_file.id).all()
    if not rows:
        return {"file_id": target_file.id, "rows": []}

    # ---- Aggregate ----
    agg = {}
    for row in rows:
        payload = row.data or {}

        customer = payload.get(customer_column)
        if not customer:
            continue

        bucket = agg.setdefault(customer, {"total_orders": 0, "total_spending": 0.0})
        bucket["total_orders"] += 1

        value = payload.get(amount_column) if amount_column else None
        if value:
            try:
                bucket["total_spending"] += float(str(value).replace(",", "").strip())
            except (ValueError, TypeError):
                pass

    # Convert to list and sort
    result = [
        {
            "user": name,
            "total_orders": v["total_orders"],
            "total_spending": round(v["total_spending"], 3),
        }
        for name, v in agg.items()
    ]

    # Sort by total_spending descending, then total_orders descending
    result.sort(key=lambda x: (-x["total_spending"], -x["total_orders"]))

    return {
        "file_id": target_file.id,
        "rows": result[:limit],
        "customer_column": customer_column,
        "amount_column": amount_column,
    }

def get_latest_rows_data_from_db(
  db: Session,
  identity: Client,
  file_id: Optional[int],
  limit: int,
) -> dict:
  """
  Fetch the latest rows for the requesting client.
  If file_id is provided we verify ownership, otherwise we fall back to the most
  recent uploaded file for that client.
  """

  client_id = getattr(identity, "id", None)
  if not client_id:
    return _empty_response()

  base_query = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)

  if file_id:
    target_file = base_query.filter(UploadedFile.id == file_id).first()
    if not target_file:
      return _empty_response()
  else:
    target_file = base_query.order_by(UploadedFile.uploaded_at.desc()).first()
    if not target_file:
      return _empty_response()

  rows_query = (
    db.query(FileRow)
    .join(UploadedFile, FileRow.file_id == UploadedFile.id)
    .filter(
      FileRow.file_id == target_file.id,
      UploadedFile.client_id == client_id,
    )
    .order_by(FileRow.id.desc())
    .limit(limit)
  )

  rows = [
    {
      "row_id": row.id,
      "file_id": row.file_id,
      "file_name": target_file.filename,
      "data": row.data,
      "uploaded_at": target_file.uploaded_at.isoformat()
      if target_file.uploaded_at
      else None,
    }
    for row in rows_query.all()
  ]

  return {
    "file_id": target_file.id,
    "file_name": target_file.filename,
    "rows": rows,
  }






