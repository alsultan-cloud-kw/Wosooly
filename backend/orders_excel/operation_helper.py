from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from .db_helper import get_orders_in_range_from_db, get_all_orders_from_db, get_orders_by_location_from_db

def get_orders_in_range(start_date, end_date, granularity, db, identity, file_id):
    orders = get_orders_in_range_from_db(start_date, end_date, granularity, db, identity, file_id)
    return orders

def get_all_orders(db, identity, file_id):
    orders = get_all_orders_from_db(db, identity, file_id)
    return orders

def get_orders_by_location(db, identity, file_id):
    orders = get_orders_by_location_from_db(db, identity, file_id)
    return orders
