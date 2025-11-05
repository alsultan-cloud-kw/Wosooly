from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from database import get_db
from models import *  # Assuming Customer model is imported
from customers.operation_helper import *
from schemas import *
from utils.auth import get_current_client

router = APIRouter()

@router.get("/customers-table", response_model=List[dict])
def get_customers_table(db: Session = Depends(get_db), current_client = Depends(get_current_client) ):

    response_data = function_get_customers_table(db=db, client_id = current_client.id)
    return response_data

@router.get("/customer-details/{id}", response_model=CustomerDetailsResponse)
def get_customers_details(id: int, db: Session = Depends(get_db)):

    response_data = function_get_customers_details(db=db, id = id)
    return response_data

@router.get("/customer-order-items-summary/{id}", response_model=List[dict])
def get_customer_order_items_summary(id: int, db: Session = Depends(get_db)):

    response_data = function_get_customer_order_items_summary(db=db, id = id)
    return response_data

@router.get("/customer-product-orders", response_model=List[ProductOrderData])
def get_customer_product_orders(customer_id: int, product_external_id: int, db: Session = Depends(get_db)):

    response_data = function_get_customer_product_orders(db=db, customer_id=customer_id, product_external_id=product_external_id)
    return response_data

# @router.get("/customer-classification", response_model=List[CustomerClassificationResponse])
# def get_customer_classification(db: Session = Depends(get_db)):

#     response_data = function_get_customer_classification(db=db)

#     return response_data

# @router.get("/spending-customer-classification", response_model=List[CustomerClassificationResponse])
# def get_spending_customer_classification(db: Session = Depends(get_db)):

#     response_data = function_get_spending_customer_classification_data(db=db)

#     return response_data
    
@router.get("/full-customer-classification", response_model=List[CustomerClassificationResponse])
def get_full_customer_classification(db: Session = Depends(get_db), current_client = Depends(get_current_client)):

    response_data = function_get_full_customer_classification(db=db, client_id = current_client.id)
    
    return response_data

@router.get("/customers_with_low_churnRisk", response_model=List[CustomerClassificationResponse])
def get_customers_with_low_churnRisk(db: Session = Depends(get_db)):

    response_data = function_get_customers_with_low_churnRisk(db)

    return response_data
