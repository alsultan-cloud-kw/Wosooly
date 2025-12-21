from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from database import get_db
from models import *  # Assuming Customer model is imported
from customers.operation_helper import *
from schemas import *
from utils.auth import get_current_client

router = APIRouter()

@router.get("/customers-table", response_model=List[dict])
def get_customers_table(
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

    response_data = function_get_customers_table(db=db, client_id = target_client_id)
    return response_data

@router.get("/customer-details/{id}", response_model=CustomerDetailsResponse)
def get_customers_details(
    id: int, 
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
    
    # Verify customer belongs to target client
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer.client_id != target_client_id:
        raise HTTPException(status_code=403, detail="Customer does not belong to the specified client")

    response_data = function_get_customers_details(db=db, id=id)
    return response_data

@router.get("/customer-order-items-summary/{id}", response_model=List[dict])
def get_customer_order_items_summary(
    id: int, 
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
    
    # Verify customer belongs to target client
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer.client_id != target_client_id:
        raise HTTPException(status_code=403, detail="Customer does not belong to the specified client")

    response_data = function_get_customer_order_items_summary(db=db, id=id)
    return response_data

@router.get("/customer-product-orders", response_model=List[ProductOrderData])
def get_customer_product_orders(
    customer_id: int, 
    product_external_id: int, 
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
    
    # Verify customer belongs to target client
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer.client_id != target_client_id:
        raise HTTPException(status_code=403, detail="Customer does not belong to the specified client")

    response_data = function_get_customer_product_orders(db=db, customer_id=customer_id, product_external_id=product_external_id)
    return response_data

@router.get("/customer-classification", response_model=List[CustomerClassificationResponse])
def get_customer_classification(
    db: Session = Depends(get_db),
    current_client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Note: This endpoint currently doesn't filter by client_id in the underlying function
    # For now, we'll add the parameter but it may need backend function updates
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    # TODO: Update function_get_customer_classification to accept client_id parameter
    response_data = function_get_customer_classification(db=db)
    return response_data

@router.get("/spending-customer-classification", response_model=List[CustomerClassificationResponse])
def get_spending_customer_classification(
    db: Session = Depends(get_db),
    current_client = Depends(get_current_client),
    client_id: int | None = Query(
        None,
        description="(Admin only) ID of client whose data to view",
    ),
):
    # Note: This endpoint currently doesn't filter by client_id in the underlying function
    # For now, we'll add the parameter but it may need backend function updates
    # Default: use logged-in user
    target_client_id = current_client.id

    # If admin and client_id is provided, override
    if getattr(current_client, "user_type", None) == "admin" and client_id is not None:
        target_client = db.query(Client).filter(Client.id == client_id).first()
        if not target_client:
            raise HTTPException(status_code=404, detail="Client not found")
        target_client_id = target_client.id

    # TODO: Update function_get_spending_customer_classification_data to accept client_id parameter
    response_data = function_get_spending_customer_classification_data(db=db)
    return response_data
    
@router.get("/full-customer-classification", response_model=List[CustomerClassificationResponse])
def get_full_customer_classification(
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

    response_data = function_get_full_customer_classification(db=db, client_id=target_client_id)
    return response_data

@router.get("/customers_with_low_churnRisk", response_model=List[CustomerClassificationResponse])
def get_customers_with_low_churnRisk(
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

    # This function calls function_get_full_customer_classification internally
    # We need to update it to accept client_id, but for now we'll filter the results
    all_customers = function_get_full_customer_classification(db=db, client_id=target_client_id)
    low_churn_customers = [c for c in all_customers if c.get("churn_risk") == "Low"]
    
    return low_churn_customers
