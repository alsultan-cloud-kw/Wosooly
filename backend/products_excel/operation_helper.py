from sqlalchemy.orm import Session
from typing import Dict, Any
from models import Client
from .db_helper import get_top_selling_products_from_db, get_top_selling_products_by_date_from_db, get_products_sales_table_from_db

def get_top_selling_products(
    db: Session,
    current_client: Client,
    file_id: int | None = None,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Thin wrapper around DB helper to fetch top selling products for the current client.
    """
    return get_top_selling_products_from_db(
        db=db,
        current_client=current_client,
        file_id=file_id,
        limit=limit
    )

def get_top_selling_products_by_date(
    start_date: str,
    end_date: str,
    db: Session,
    current_client: Client,
    file_id: int | None = None,
    limit: int = 5
):
    return get_top_selling_products_by_date_from_db(
        start_date=start_date,
        end_date=end_date,
        db=db,
        current_client=current_client,
        file_id=file_id,
        limit=limit
    )

def get_products_sales_table(
    start_date: str,
    end_date: str,
    db: Session,
    current_client: Client,
    file_id: int | None = None,
):

    return get_products_sales_table_from_db(
        start_date=start_date,
        end_date=end_date,
        db=db,
        current_client=current_client,
        file_id=file_id,
    )