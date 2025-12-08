from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from orders_excel.operation_helper import get_orders_in_range, get_all_orders, get_orders_by_location
import math
from utils.auth import get_current_client
from models import Client
from typing import Optional

router = APIRouter(prefix = "/excel_orders", tags=["excel_orders"])

def sanitize_for_json(obj):
    """Recursively replace NaN/inf floats with None so JSON is valid."""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    return obj

@router.get("/orders-in-range")
def orders_in_range(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    granularity: Optional[str] = Query("daily", description="Granularity: daily, monthly, or yearly"),
    db: Session = Depends(get_db),
    identity: Client = Depends(get_current_client),
    file_id: Optional[int] = Query(None, description="Optional file ID to filter by")
):
    """Return aggregated orders between given dates grouped by date."""
    data = get_orders_in_range(start_date=start_date, end_date=end_date, granularity=granularity, db=db, identity=identity, file_id=file_id)
    return sanitize_for_json(data)

@router.get("/orders-data")
def orders_data(
    db: Session = Depends(get_db),
    identity: Client = Depends(get_current_client),
    file_id: Optional[int] = Query(None, description="Optional file ID to filter by")
):
    """Return all individual orders (not aggregated) for table display."""
    data = get_all_orders(db=db, identity=identity, file_id=file_id)
    return sanitize_for_json(data)

@router.get("/orders-by-location")
def orders_by_location(
    db: Session = Depends(get_db),
    identity: Client = Depends(get_current_client),
    file_id: Optional[int] = Query(None, description="Optional file ID to filter by")
):
    """Return orders grouped by location (city) with order counts."""
    data = get_orders_by_location(db=db, identity=identity, file_id=file_id)
    return sanitize_for_json(data)
    