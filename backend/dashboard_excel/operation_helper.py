from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from dashboard_excel.db_helper import (
  get_latest_rows_data_from_db,
  get_total_orders_count_data_from_db,
  get_top_customers_from_db,
  get_total_sales_from_db,
  get_total_customers_from_db,
  get_total_products_from_db,
)
from models import Client

def get_total_sales(
  db: Session,
  identity: Client,
  file_id: Optional[int] = None,
) -> Dict[str, Any]:
  """
  Thin wrapper around DB helper to fetch total sales for the current client.
  """
  return get_total_sales_from_db(db, identity, file_id)

def get_total_products(
  db: Session,
  identity: Client,
  file_id: Optional[int] = None,
) -> Dict[str, Any]:
  """
  Thin wrapper around DB helper to fetch total products for the current client.
  """
  return get_total_products_from_db(db, identity, file_id)

def get_total_customers(
  db: Session,
  identity: Client,
  file_id: Optional[int] = None,
) -> Dict[str, Any]:
  """
  Thin wrapper around DB helper to fetch total unique customers for the current client.
  """
  return get_total_customers_from_db(db, identity, file_id)

def get_total_orders_count(
  db: Session,
  identity: Client,
  file_id: Optional[int] = None,
) -> Dict[str, Any]:
  """
  Thin wrapper around DB helper to fetch total orders for the current client.
  """
  return get_total_orders_count_data_from_db(db, identity, file_id)

def get_top_customers(
  db: Session,
  identity: Client,
  limit: int,
  file_id: Optional[int] = None,
) -> Dict[str, Any]:
  """
  Return aggregated top customers for the authenticated client.
  """
  safe_limit = max(1, min(limit or 5, 50))
  return get_top_customers_from_db(
    db=db,
    identity=identity,
    limit=safe_limit,
    file_id=file_id,
  )

def get_latest_rows_data(
  db: Session,
  identity: Client,
  file_id: Optional[int],
  limit: int,
):
  safe_limit = max(1, min(limit or 5, 50))  # keep reasonable bounds
  return get_latest_rows_data_from_db(
    db=db,
    identity=identity,
    file_id=file_id,
    limit=safe_limit,
  )






