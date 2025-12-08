from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from utils.auth import get_current_client
from products_excel.operation_helper import get_top_selling_products, get_top_selling_products_by_date, get_products_sales_table
from models import Client

router = APIRouter(prefix="/excel_products", tags=["excel_products"])

@router.get("/top-selling-products")
def top_selling_products(
    db: Session = Depends(get_db),
    identity: Client = Depends(get_current_client), 
    file_id: int | None = None, 
    limit: int = 5
    ):

    return get_top_selling_products(db=db, current_client=identity, file_id=file_id, limit=limit)

@router.get("/top-selling-products-by-date")
def top_selling_products_by_date(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    identity: Client = Depends(get_current_client),
    file_id: int | None = None,
    limit: int = 5
):
    return get_top_selling_products_by_date(
        db=db,
        current_client=identity,
        start_date=start_date,
        end_date=end_date,
        file_id=file_id,
        limit=limit
    )

@router.get("/products-sales-table")
def products_sales_table(
    start_date: str,
    end_date: str,
    file_id: int | None = None,
    db: Session = Depends(get_db),
    identity: Client = Depends(get_current_client)
):
    return get_products_sales_table(
        db=db,
        current_client=identity,
        start_date=start_date,
        end_date=end_date,
        file_id=file_id
    )
