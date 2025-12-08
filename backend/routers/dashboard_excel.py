from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from dashboard_excel.operation_helper import (
  get_latest_rows_data,
  get_total_orders_count,
  get_top_customers,
  get_total_sales,
  get_total_customers,
  get_total_products,
)
from database import get_db
from utils.auth import get_current_client
from models import Client

router = APIRouter(prefix="/dashboard_excel", tags=["dashboard_excel"])

@router.get("/total-sales")
def total_sales(
  db: Session = Depends(get_db),
  identity: Client = Depends(get_current_client),
  file_id: int | None = None
):
  return get_total_sales(db, identity, file_id)

@router.get("/total-products")
def total_products(
  db: Session = Depends(get_db),
  identity: Client = Depends(get_current_client),
  file_id: int | None = Query(
    None,
    description="Optional file ID to filter by",
  ),
):
  return get_total_products(db=db, identity=identity, file_id=file_id)

@router.get("/total-customers")
def total_customers(
  db: Session = Depends(get_db),
  identity: Client = Depends(get_current_client),
  file_id: int | None = Query(
    None,
    description="Optional file ID to filter by",
  ),
):
  return get_total_customers(db=db, identity=identity, file_id=file_id)

@router.get("/total-orders-count")
def total_orders_count(
  db: Session = Depends(get_db),
  identity: Client = Depends(get_current_client),
  file_id: int | None = Query(
    None,
    description="Optional file ID to filter by",
  ),
):
  return get_total_orders_count(db, identity, file_id)

@router.get("/top-customers")
def top_customers(
    db: Session = Depends(get_db),
    identity: Client = Depends(get_current_client),
    limit: int = Query(5, ge=1, le=50),
    file_id: int | None = None,
):
    return get_top_customers(db=db, identity=identity, limit=limit, file_id=file_id)

@router.get("/latest-rows")
def latest_rows(
  file_id: int | None = Query(
    default=None,
    description="Optional uploaded file ID to pull rows from",
  ),
  limit: int = Query(5, ge=1, le=50, description="Number of rows to return"),
  db: Session = Depends(get_db),
  identity: Client = Depends(get_current_client),
):
  """
  Return the latest rows for the authenticated client.
  If file_id is provided we verify ownership; otherwise the most recent file is used.
  """
  return get_latest_rows_data(
    db=db,
    identity=identity,
    file_id=file_id,
    limit=limit,
  )