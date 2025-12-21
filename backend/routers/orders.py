from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List
from typing import Optional
from database import get_db
from models import Order, Customer, Client  # Assuming Customer model is imported
from orders.operation_helper import *
from utils.auth import get_current_client

router = APIRouter()

@router.get("/latest-orders", response_model=List[dict])
def get_latest_orders(
    db: Session = Depends(get_db), 
    current_client: Client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    response_data = get_latest_orders_dashboard(db=db, client_id=target_client_id)
    return response_data

@router.get("/total-orders-count", response_model = List[dict])
def get_total_orders_count(
    db: Session = Depends(get_db), 
    current_client: Client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    response_data = function_get_total_orders_count(db=db, client_id=target_client_id)
    return response_data

@router.get("/total-sales", response_model = List[dict])
def get_total_sales(
    db: Session = Depends(get_db), 
    current_client: Client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    response_data = function_get_total_sales(db=db, client_id=target_client_id)
    return response_data

@router.get("/aov", response_model = List[dict])
def get_average_order_value(
    db: Session = Depends(get_db), 
    current_client: Client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    response_data = function_get_average_order_value(db=db, client_id=target_client_id)
    return response_data

@router.get("/total-customers", response_model = List[dict])
def get_total_customers_count(
    db: Session = Depends(get_db), 
    current_client: Client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    response_data = function_get_total_customers_count(db=db, client_id=target_client_id)
    return response_data

@router.get("/top-customers", response_model=List[dict])
def get_top_customers(
    db: Session = Depends(get_db), 
    current_client: Client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    response_data = function_get_top_customers(db=db, client_id=target_client_id)
    return response_data

@router.get("/sales-comparison")
def get_sales_comparison(
    db: Session = Depends(get_db), 
    current_client: Client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    response_data = function_get_sales_comparison(db=db, client_id=target_client_id)
    return response_data

@router.get("/orders-in-range", response_model = List[dict])
def get_orders_in_range(
    start_date: str, 
    end_date: str, 
    granularity: Optional[str] = "daily", 
    db: Session = Depends(get_db), 
    current_client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    response_data = function_get_orders_in_range(db=db, start_date=start_date, end_date=end_date, granularity=granularity, client_id=target_client_id)
    return response_data

@router.get("/orders-data", response_model = List[dict])
def get_orders_data(
    db: Session = Depends(get_db), 
    current_client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    response_data = function_get_orders_data(db=db, client_id=target_client_id)
    return response_data

@router.get("/attribution-summary", response_model = List[dict])
def get_attribution_summary_data(
    db: Session = Depends(get_db), 
    current_client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    response_data = function_get_attribution_summary(db=db, client_id=target_client_id)
    return response_data

@router.get("/orders-by-location", response_model = List[dict])
def get_orders_by_location(
    db: Session = Depends(get_db),
    current_client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    # Note: This endpoint may need to be updated to accept client_id in the underlying function
    # TODO: Update function_get_orders_by_location to accept client_id parameter
    response_data = function_get_orders_by_location(db=db)
    return response_data

@router.get("/orders-by-city", response_model = List[dict])
def get_orders_by_city(
    db: Session = Depends(get_db),
    current_client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    # Note: This endpoint may need to be updated to accept client_id in the underlying function
    # TODO: Update function_get_orders_orderid_city to accept client_id parameter
    response_data = function_get_orders_orderid_city(db=db)
    return response_data