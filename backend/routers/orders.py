from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from typing import Optional
from database import get_db
from models import Order, Customer  # Assuming Customer model is imported
from orders.operation_helper import *
from utils.auth import get_current_client

router = APIRouter()

@router.get("/latest-orders", response_model=List[dict])
def get_latest_orders(db: Session = Depends(get_db), current_client: Client = Depends(get_current_client)):

    response_data = get_latest_orders_dashboard(db=db, client_id=current_client.id)
    return response_data

@router.get("/total-orders-count", response_model = List[dict])
def get_total_orders_count(db: Session = Depends(get_db), current_client: Client = Depends(get_current_client)):

    response_data = function_get_total_orders_count(db=db, client_id=current_client.id)
    return response_data

@router.get("/total-sales", response_model = List[dict])
def get_total_sales(db: Session = Depends(get_db), current_client: Client = Depends(get_current_client)):

    response_data = function_get_total_sales(db=db, client_id=current_client.id)
    return response_data

@router.get("/aov", response_model = List[dict])
def get_average_order_value(db: Session = Depends(get_db), current_client: Client = Depends(get_current_client)):

    response_data = function_get_average_order_value(db=db, client_id=current_client.id)
    return response_data

@router.get("/total-customers", response_model = List[dict])
def get_total_customers_count(db: Session = Depends(get_db), current_client: Client = Depends(get_current_client)):

    response_data = function_get_total_customers_count(db=db, client_id=current_client.id)
    return response_data

@router.get("/top-customers", response_model=List[dict])
def get_top_customers(db: Session = Depends(get_db), current_client: Client = Depends(get_current_client)):

    response_data = function_get_top_customers(db=db, client_id=current_client.id)
    return response_data

@router.get("/sales-comparison")
def get_sales_comparison(db: Session = Depends(get_db), current_client: Client = Depends(get_current_client)):

    response_data = function_get_sales_comparison(db=db, client_id=current_client.id)
    return response_data

@router.get("/orders-in-range", response_model = List[dict])
def get_orders_in_range(start_date: str, end_date: str, granularity: Optional[str] = "daily", db: Session = Depends(get_db), current_client = Depends(get_current_client)):

    response_data = function_get_orders_in_range(db=db, start_date=start_date, end_date=end_date, granularity=granularity, client_id=current_client.id)

    return response_data

@router.get("/orders-data", response_model = List[dict])
def get_orders_data(db: Session = Depends(get_db), current_client = Depends(get_current_client)):

    response_data = function_get_orders_data(db=db, client_id = current_client.id)

    return response_data

@router.get("/attribution-summary", response_model = List[dict])
def get_attribution_summary_data(db: Session = Depends(get_db), current_client = Depends(get_current_client)):

    response_data = function_get_attribution_summary(db=db, client_id = current_client.id)
    return response_data

@router.get("/orders-by-location", response_model = List[dict])
def get_orders_by_location(db: Session = Depends(get_db)):

    response_data = function_get_orders_by_location(db=db)

    return response_data

@router.get("/orders-by-city", response_model = List[dict])
def get_orders_by_city(db: Session = Depends(get_db)):

    response_data = function_get_orders_orderid_city(db=db)

    return response_data