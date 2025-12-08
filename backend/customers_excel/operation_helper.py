from .db_helper import get_customers_table_from_db, get_aggregate_customers_from_orders_from_db


def get_customers_table(db, current_client, file_id ):
    customers_data = get_customers_table_from_db(db, current_client, file_id)

    return customers_data

def aggregate_customers_from_orders(
    db, current_client, file_id
):
    full_customers_data = get_aggregate_customers_from_orders_from_db(db, current_client, file_id)
    return full_customers_data