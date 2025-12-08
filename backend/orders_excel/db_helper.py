from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from models import UploadedFile, ColumnMapping, FileRow, Client
import pandas as pd

def get_orders_in_range_from_db(
    start_date: str,
    end_date: str,
    granularity: str,
    db: Session,
    identity: Client,
    file_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Return aggregated orders in the given date range grouped by date.
    Uses stored column mappings with canonical name resolution.
    Returns: [{"date": "...", "total_amount": ..., "order_count": ...}]
    """
    client_id = identity.id if identity else None
    if not client_id:
        return []

    # --- Step 1: Determine target file ---
    base = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)
    
    if file_id:
        target_file = base.filter(UploadedFile.id == file_id).first()
        if not target_file:
            raise HTTPException(404, "File not found")
    else:
        target_file = base.order_by(UploadedFile.uploaded_at.desc()).first()
    
    if not target_file:
        return []

    # --- Step 2: Get column mapping ---
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

    # --- Step 3: Canonical mapping resolution ---
    canonical_order_id = ["order_id", "orderId", "id"]
    canonical_customer_name = ["customer_name", "customerName", "name"]
    canonical_order_date = ["order_date", "date", "orderDate", "Date", "created_at"]
    canonical_total_amount = ["total_amount", "amount", "totalAmount", "sales_price", "price"]

    col_order_id = next((mapping.get(k) for k in canonical_order_id if mapping.get(k)), None)
    col_customer_name = next((mapping.get(k) for k in canonical_customer_name if mapping.get(k)), None)
    col_order_date = next((mapping.get(k) for k in canonical_order_date if mapping.get(k)), None)
    col_total_amount = next((mapping.get(k) for k in canonical_total_amount if mapping.get(k)), None)

    # order_date is required
    if not col_order_date:
        return []

    # --- Step 4: Load rows ---
    rows = db.query(FileRow).filter(FileRow.file_id == target_file.id).all()
    if not rows:
        return []

    records = [r.data for r in rows]
    df = pd.DataFrame(records)
    
    if df.empty:
        return []

    df.columns = [str(c).strip() for c in df.columns]
    df = df.where(pd.notnull(df), None)

    # --- Step 5: Normalize dataframe ---
    # Build normalized dataframe with safe column access
    # Match the reference implementation pattern
    normalized_dict = {}
    
    if col_order_id and col_order_id in df.columns:
        normalized_dict["order_id"] = df[col_order_id]
    if col_customer_name and col_customer_name in df.columns:
        normalized_dict["customer_name"] = df[col_customer_name]
    normalized_dict["date"] = df[col_order_date]  # Required, already validated
    if col_total_amount and col_total_amount in df.columns:
        normalized_dict["amount"] = df[col_total_amount]
    
    df_orders = pd.DataFrame(normalized_dict)
    
    # Add missing columns as None with correct length (match source dataframe length)
    expected_len = len(df)
    for col in ["order_id", "customer_name", "amount"]:
        if col not in df_orders.columns:
            df_orders[col] = [None] * expected_len

    # --- Step 6: Convert and filter dates ---
    df_orders["date"] = pd.to_datetime(df_orders["date"], errors="coerce")
    df_orders = df_orders.dropna(subset=["date"])

    try:
        start_dt = pd.to_datetime(start_date)
        end_dt = pd.to_datetime(end_date)
    except Exception:
        raise ValueError("Invalid date format. Use YYYY-MM-DD.")

    df_filtered = df_orders.loc[(df_orders["date"] >= start_dt) & (df_orders["date"] <= end_dt)]

    if df_filtered.empty:
        return []

    # --- Step 7: Aggregate by date based on granularity ---
    # Convert amount to numeric, handling None values
    if "amount" in df_filtered.columns:
        df_filtered["amount"] = pd.to_numeric(df_filtered["amount"], errors="coerce").fillna(0)
    else:
        df_filtered["amount"] = 0

    # Group by date based on granularity
    if granularity == "daily":
        df_filtered["date_group"] = df_filtered["date"].dt.strftime("%Y-%m-%d")
    elif granularity == "monthly":
        df_filtered["date_group"] = df_filtered["date"].dt.strftime("%Y-%m")
    elif granularity == "yearly":
        df_filtered["date_group"] = df_filtered["date"].dt.strftime("%Y")
    else:
        # Default to daily
        df_filtered["date_group"] = df_filtered["date"].dt.strftime("%Y-%m-%d")

    # Aggregate: sum amounts and count orders per date group
    # Use size() to count all rows in each group, regardless of column values
    aggregated = df_filtered.groupby("date_group").agg({
        "amount": "sum"
    }).reset_index()
    
    # Add order count using size
    order_counts = df_filtered.groupby("date_group").size().reset_index(name="order_count")
    aggregated = aggregated.merge(order_counts, on="date_group", how="left")
    aggregated["order_count"] = aggregated["order_count"].fillna(0).astype(int)

    # Rename columns to match expected format
    aggregated.columns = ["date", "total_amount", "order_count"]

    # Convert to list of dicts and ensure proper types
    result = []
    for _, row in aggregated.iterrows():
        result.append({
            "date": str(row["date"]),
            "total_amount": float(row["total_amount"]) if pd.notnull(row["total_amount"]) else 0.0,
            "order_count": int(row["order_count"]) if pd.notnull(row["order_count"]) else 0
        })

    # Sort by date
    result.sort(key=lambda x: x["date"])

    return result

def get_all_orders_from_db(
    db: Session,
    identity: Client,
    file_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Return all individual orders (not aggregated) using canonical field mapping.
    Uses stored column mappings with canonical name resolution.
    Returns: [{"id": "...", "user": "...", "date": "...", "Amount": "...", "status": "..."}]
    """
    client_id = identity.id if identity else None
    if not client_id:
        return []

    # --- Step 1: Determine target file ---
    base = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)
    
    if file_id:
        target_file = base.filter(UploadedFile.id == file_id).first()
        if not target_file:
            raise HTTPException(404, "File not found")
    else:
        target_file = base.order_by(UploadedFile.uploaded_at.desc()).first()
    
    if not target_file:
        return []

    # --- Step 2: Get column mapping ---
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

    # --- Step 3: Canonical mapping resolution ---
    canonical_order_id = ["order_id", "orderId", "id"]
    canonical_customer_name = ["customer_name", "customerName", "name"]
    canonical_order_date = ["order_date", "date", "orderDate", "Date", "created_at"]
    canonical_total_amount = ["total_amount", "amount", "totalAmount", "sales_price", "price"]
    canonical_status = ["status", "order_status", "state"]

    col_order_id = next((mapping.get(k) for k in canonical_order_id if mapping.get(k)), None)
    col_customer_name = next((mapping.get(k) for k in canonical_customer_name if mapping.get(k)), None)
    col_order_date = next((mapping.get(k) for k in canonical_order_date if mapping.get(k)), None)
    col_total_amount = next((mapping.get(k) for k in canonical_total_amount if mapping.get(k)), None)
    col_status = next((mapping.get(k) for k in canonical_status if mapping.get(k)), None)

    # --- Step 4: Load rows ---
    rows = db.query(FileRow).filter(FileRow.file_id == target_file.id).all()
    if not rows:
        return []

    records = [r.data for r in rows]
    df = pd.DataFrame(records)
    
    if df.empty:
        return []

    df.columns = [str(c).strip() for c in df.columns]
    df = df.where(pd.notnull(df), None)

    # --- Step 5: Parse dates first for proper sorting ---
    # Convert date column to datetime for sorting
    if col_order_date and col_order_date in df.columns:
        df["_date_parsed"] = pd.to_datetime(df[col_order_date], errors="coerce")
    else:
        df["_date_parsed"] = pd.NaT
    
    # Sort by parsed date (most recent first)
    df = df.sort_values("_date_parsed", ascending=False, na_position="last")
    
    # --- Step 6: Build result list ---
    result = []
    for _, row in df.iterrows():
        # Format order ID
        order_id_val = row.get(col_order_id) if col_order_id and col_order_id in df.columns else None
        order_id = f"#OD{order_id_val}" if order_id_val else f"#OD{len(result) + 1}"
        
        # Get customer name
        customer_name = row.get(col_customer_name) if col_customer_name and col_customer_name in df.columns else "Unknown"
        
        # Format date using parsed date
        date_obj = row.get("_date_parsed")
        if pd.notnull(date_obj):
            formatted_date = date_obj.strftime("%d %b %Y")
        else:
            date_val = row.get(col_order_date) if col_order_date and col_order_date in df.columns else None
            formatted_date = str(date_val) if date_val else "N/A"
        
        # Format amount
        amount_val = row.get(col_total_amount) if col_total_amount and col_total_amount in df.columns else None
        if amount_val is not None:
            try:
                amount_float = float(str(amount_val).replace(",", ""))
                formatted_amount = f"KD:{amount_float:.2f}"
            except:
                formatted_amount = f"KD:0.00"
        else:
            formatted_amount = "KD:0.00"
        
        # Get status
        status_val = row.get(col_status) if col_status and col_status in df.columns else "completed"
        status = str(status_val) if status_val else "completed"
        
        result.append({
            "id": order_id,
            "user": str(customer_name) if customer_name else "Unknown",
            "date": formatted_date,
            "Amount": formatted_amount,
            "status": status,
            "attribution_referrer": None  # Excel data typically doesn't have attribution
        })

    return result

def get_orders_by_location_from_db(
    db: Session,
    identity: Client,
    file_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Return orders grouped by location (city) using canonical field mapping.
    Uses stored column mappings with canonical name resolution for location fields.
    Returns: [{"city": "...", "order_count": ...}]
    """
    client_id = identity.id if identity else None
    if not client_id:
        return []

    # --- Step 1: Determine target file ---
    base = db.query(UploadedFile).filter(UploadedFile.client_id == client_id)
    
    if file_id:
        target_file = base.filter(UploadedFile.id == file_id).first()
        if not target_file:
            raise HTTPException(404, "File not found")
    else:
        target_file = base.order_by(UploadedFile.uploaded_at.desc()).first()
    
    if not target_file:
        return []

    # --- Step 2: Get column mapping ---
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

    # --- Step 3: Canonical mapping resolution for location fields ---
    # Priority: city > location > area > region > address > state > country
    # Make lookup case-insensitive by checking both original and lowercase keys
    canonical_city = ["city", "location", "area", "region", "address", "state", "country"]
    canonical_country = ["country", "nation", "Country"]
    
    # Case-insensitive lookup: check both original key and lowercase key
    col_city = None
    for key in canonical_city:
        # Check exact match first
        if key in mapping and mapping.get(key):
            col_city = mapping.get(key)
            break
        # Check case-insensitive match
        for map_key, map_value in mapping.items():
            if map_key.lower() == key.lower() and map_value:
                col_city = map_value
                break
        if col_city:
            break
    
    # Also check for country field (case-insensitive)
    col_country = None
    for key in canonical_country:
        if key in mapping and mapping.get(key):
            col_country = mapping.get(key)
            break
        for map_key, map_value in mapping.items():
            if map_key.lower() == key.lower() and map_value:
                col_country = map_value
                break
        if col_country:
            break

    # At least one location field is required
    # If no city field found but country exists, use country as location
    if not col_city and col_country:
        col_city = col_country
    
    if not col_city:
        return []

    # --- Step 4: Load rows ---
    rows = db.query(FileRow).filter(FileRow.file_id == target_file.id).all()
    if not rows:
        return []

    records = [r.data for r in rows]
    df = pd.DataFrame(records)
    
    if df.empty:
        return []

    df.columns = [str(c).strip() for c in df.columns]
    df = df.where(pd.notnull(df), None)

    # --- Step 5: Extract location data ---
    # Case-insensitive column matching
    col_city_actual = None
    for col in df.columns:
        if str(col).strip() == str(col_city).strip():
            col_city_actual = col
            break
    
    if not col_city_actual:
        return []

    # Clean and normalize city names
    df["_location"] = df[col_city_actual].astype(str).str.strip().str.lower()
    df["_location"] = df["_location"].replace(["none", "nan", "null", ""], None)
    df = df.dropna(subset=["_location"])

    if df.empty:
        return []

    # Optional: Filter by country if country column exists
    if col_country and col_country in df.columns:
        # Normalize country values
        df["_country"] = df[col_country].astype(str).str.strip().str.upper()
        # You can add country filtering here if needed
        # df = df[df["_country"].isin(["KW", "KUWAIT", "KWT"])]

    # --- Step 6: Group by location and count orders ---
    location_counts = df.groupby("_location").size().reset_index(name="order_count")
    
    # Convert back to proper case for display
    location_counts["city"] = location_counts["_location"].str.title()
    
    # Sort by order count (descending)
    location_counts = location_counts.sort_values("order_count", ascending=False)

    # --- Step 7: Build result list ---
    result = []
    for _, row in location_counts.iterrows():
        result.append({
            "city": str(row["city"]),
            "order_count": int(row["order_count"])
        })

    return result