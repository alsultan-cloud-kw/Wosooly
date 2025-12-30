from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from utils.auth import get_current_client
from customers_excel.operation_helper import get_customers_table, aggregate_customers_from_orders
from customers_excel.db_helper import get_excel_customer_details_from_db
from models import Client
import math
from typing import Dict, Any
from schemas import CustomerDetailsResponse

router = APIRouter(prefix="/excel_customers", tags=["excel_customers"])

@router.get("/customers-table")
def customers_table(
    db: Session = Depends(get_db),
    identity: Client = Depends(get_current_client),
    file_id: int | None = None
):
    return get_customers_table(db=db, current_client=identity, file_id=file_id)

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

# FastAPI endpoint
@router.get("/full-customer-classification")
def full_customer_classification(
    db: Session = Depends(get_db),
    identity: Client = Depends(get_current_client),
    file_id: int | None = None
) -> Dict[str, Any]:
    results = aggregate_customers_from_orders(db=db, current_client=identity, file_id=file_id)
    safe_results = sanitize_for_json(results)
    return safe_results

@router.get("/customer-details/{customer_identifier}", response_model=CustomerDetailsResponse)
def get_excel_customer_details(
    customer_identifier: str,
    db: Session = Depends(get_db),
    identity: Client = Depends(get_current_client),
    file_id: int | None = None
):
    """
    Get detailed information for a specific Excel customer.
    customer_identifier can be customer_id, customer_name, or phone.
    """
    try:
        return get_excel_customer_details_from_db(
            db=db,
            current_client=identity,
            customer_identifier=customer_identifier,
            file_id=file_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching customer details: {str(e)}")