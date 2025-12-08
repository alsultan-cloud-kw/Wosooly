import httpx
import os
from sqlalchemy.orm import Session
from models import Customer, Address, Order, OrderItem, Product, SyncState
from tasks.send_whatsapp import send_whatsapp_template
from datetime import datetime, timedelta
from dotenv import load_dotenv
from dateutil.parser import isoparse
import psycopg2
from cryptography.fernet import Fernet
from database import SessionLocal
from celery import shared_task
from models import Client
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from utils.redis_lock import acquire_sync_lock, release_sync_lock

load_dotenv()

# WC_BASE_URL = "https://souqalsultan.com/wp-json/wc/v3/orders"
# WC_CONSUMER_KEY = os.getenv("WC_CONSUMER_KEY")
# WC_CONSUMER_SECRET = os.getenv("WC_CONSUMER_SECRET")

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

def get_current_client_id(authorization: str = Header(...)):
    """Extracts user_id (client_id) from JWT Authorization header."""
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid auth scheme")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        client_id = payload.get("user_id")
        if not client_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
        return client_id
    except (JWTError, ValueError, IndexError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

WHATSAPP_TEMPLATES = {
    "processing": "order_processing",
    "completed": "order_completed",
    "cancelled": "order_cancelled",
    "on-hold": "order_onhold",
    "failed": "order_failed"
    # Add more as needed
}

def normalize_phone(phone: str | None) -> str | None:
    """Remove spaces and country code prefix for consistency."""
    if phone:
        phone = phone.strip().replace(" ", "")
        if phone.startswith("+965"):
            phone = phone[4:]
        elif phone.startswith("00965"):
            phone = phone[5:]
        if not phone:
            return None
        return phone
    return None

def normalize_existing_phones(db: Session) -> None:
    customers = db.query(Customer).all()
    updated = False
    for customer in customers:
        original_phone = customer.phone
        normalized_phone = normalize_phone(original_phone)

        if normalized_phone != original_phone:
            existing = (
                db.query(Customer)
                .filter(Customer.phone == normalized_phone)
                .filter(Customer.id != customer.id)
                .first()
            )
            if existing:
                print(f"Skipping Customer ID {customer.id}: {original_phone} -> {normalized_phone} (conflict with Customer ID {existing.id})")
                continue  # skip update

            print(f"Updating Customer ID {customer.id}: {original_phone} -> {normalized_phone}")
            customer.phone = normalized_phone
            updated = True

    if updated:
        db.commit()

def get_last_synced_time(db: Session) -> str:
    state = db.query(SyncState).filter_by(key="last_order_sync").first()
    return state.value if state else "2000-01-01T00:00:00Z"

def set_last_synced_time(db: Session, timestamp: str) -> None:
    state = db.query(SyncState).filter_by(key="last_order_sync").first()
    if state:
        state.value = timestamp
    else:
        db.add(SyncState(key="last_order_sync", value=timestamp))
    db.commit()

def process_order_data(db: Session, data: dict, client_id: int) -> None:
    email = data["billing"].get("email") or None
    raw_phone = data["billing"].get("phone") or None
    phone = normalize_phone(raw_phone)

    customer = None
    if phone:
        customer = db.query(Customer).filter_by(phone=phone).first()
    if not customer and email:
        customer = db.query(Customer).filter_by(email=email).first()

    if not customer:
        customer = Customer(
            first_name=data["billing"].get("first_name", ""),
            last_name=data["billing"].get("last_name", ""),
            email=email,
            phone=phone,
            client_id=client_id,
        )
        db.add(customer)
        db.flush()

    existing_address = db.query(Address).filter_by(
        customer_id=customer.id,
        address_1=data["billing"].get("address_1", ""),
        city=data["billing"].get("city", ""),
        postcode=data["billing"].get("postcode", "")
    ).first()

    if not existing_address:
        address = Address(
            customer_id=customer.id,
            company=data["billing"].get("company"),
            address_1=data["billing"].get("address_1"),
            address_2=data["billing"].get("address_2"),
            city=data["billing"].get("city"),
            state=data["billing"].get("state"),
            postcode=data["billing"].get("postcode"),
            country=data["billing"].get("country")
        )
        db.add(address)

    order_in_db = db.query(Order).filter_by(order_key=data["order_key"]).first()

    meta = data.get("meta_data", [])
    meta_dict = {entry.get("key"): entry.get("value") for entry in meta}

    if order_in_db:
        new_status = data["status"]
        updated = False

        if order_in_db.status != new_status:
            order_in_db.status = new_status
            updated = True

        new_payment_method = data.get("payment_method_title")
        if order_in_db.payment_method != new_payment_method:
            order_in_db.payment_method = new_payment_method
            updated = True

        if updated:
            db.add(order_in_db)
            db.flush()
            print(f"🔄 Updated order #{order_in_db.external_id} to status: {new_status}")

            if customer.phone:
                try:
                    full_name = f"{customer.first_name} {customer.last_name}".strip()
                    template_name = WHATSAPP_TEMPLATES.get(new_status)

                    if template_name:
                        send_whatsapp_template(
                            phone_number=customer.phone,
                            customer_name=full_name,
                            order_number=str(order_in_db.external_id),
                            template_name=template_name
                        )
                    else:
                        print(f"⚠️ No template configured for status: {new_status}")
                except Exception as e:
                    print(f"❌ WhatsApp send failed: {e}")

        return

    order = Order(
        order_key=data["order_key"],
        customer_id=customer.id,
        external_id=data["id"],
        status=data["status"],
        total_amount=float(data["total"]),
        created_at=isoparse(data["date_created"]),
        payment_method=data.get("payment_method_title"),
        attribution_referrer=meta_dict.get("_wc_order_attribution_referrer"),
        session_pages=int(meta_dict.get("_wc_order_attribution_session_pages", 0)),
        session_count=int(meta_dict.get("_wc_order_attribution_session_count", 0)),
        device_type=meta_dict.get("_wc_order_attribution_device_type")
    )
    db.add(order)
    db.flush()

    for item in data.get("line_items", []):
        product = db.query(Product).filter_by(external_id=item["product_id"]).first()
        product_id = product.external_id if product else None

        order_item = OrderItem(
            order_id=order.id,
            product_name=item["name"],
            product_id=product_id,
            quantity=item["quantity"],
            price=float(item["price"])
        )
        db.add(order_item)

    if customer.phone:
        try:
            full_name = f"{customer.first_name} {customer.last_name}".strip()
            template_name = WHATSAPP_TEMPLATES.get(order.status)

            if template_name:
                send_whatsapp_template(
                    phone_number=customer.phone,
                    customer_name=full_name,
                    order_number=str(order.external_id),
                    template_name=template_name
                )
            else:
                print(f"⚠️ No template configured for order status: {order.status}")
        except Exception as e:
            print(f"❌ WhatsApp send failed: {e}")

@shared_task(name="fetch_orders_task", bind=True, max_retries=3)
def fetch_orders_task(self, client_id: int = None, full_fetch: bool = False):
    """
    Fetch WooCommerce orders for a client with distributed locking.
    
    Args:
        client_id: ID of the client to fetch orders for
        full_fetch: If True, fetch all orders; if False, fetch only new orders
    """
    if not client_id:
        print("⚠️ No client_id provided. Skipping task.")
        return

    # Try to acquire lock - prevent concurrent syncs for same client
    if not acquire_sync_lock(client_id, timeout=300):
        print(f"⚠️ Sync already in progress for client {client_id}. Skipping.")
        return

    db = SessionLocal()

    try:
        client = db.query(Client).filter_by(id=client_id).first()
        if not client:
            print(f"❌ Client {client_id} not found. Skipping task.")
            return

        if not client.store_url or not client.consumer_key or not client.consumer_secret:
            print(f"⚠️ Client {client.email} missing WooCommerce credentials. Skipping task.")
            return

        consumer_key = client.consumer_key
        
        consumer_secret = client.consumer_secret
        if not consumer_key or not consumer_secret:
            print(f"⚠️ Decrypted credentials missing for {client.email}. Skipping task.")
            return
        
        wc_base_url = f"{client.store_url}/wp-json/wc/v3/orders"
        per_page = 100
        page = 1

        # Determine sync range
        state_key = f"last_order_sync_client_{client_id}"
        sync_state = db.query(SyncState).filter_by(key=state_key).first()

        if full_fetch or not sync_state:
            after_date = "2000-01-01T00:00:00Z"
            print(f"🌍 Full sync for client {client.email}")
        else:
            after_date = sync_state.value
            print(f"🕒 Incremental sync for {client.email} after {after_date}")

        total_orders_fetched = 0
        total_new_orders = 0
        total_updated_orders = 0

        # Fetch orders
        while True:
            url = f"{wc_base_url}?per_page={per_page}&page={page}&after={after_date}&orderby=date&order=asc"
            
            try:
                with httpx.Client(timeout=60.0) as client_http:
                    response = client_http.get(url, auth=(consumer_key, consumer_secret))
            except Exception as e:
                print(f"❌ Fetch error for {client.email}: {e}")
                # Retry with exponential backoff
                raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

            if response.status_code != 200:
                print(f"⚠️ API error ({client.email}): {response.status_code} - {response.text}")
                if response.status_code in [401, 403]:
                    # Don't retry authentication errors
                    break
                # Retry other errors
                raise self.retry(countdown=60)

            orders = response.json()
            if not orders:
                break

            print(f"📦 {client.email} - Page {page}: {len(orders)} orders")

            try:
                for order in orders:
                    # Track if order is new or updated
                    existing = db.query(Order).filter_by(order_key=order["order_key"]).first()
                    if existing:
                        total_updated_orders += 1
                    else:
                        total_new_orders += 1
                    
                    process_order_data(db, order, client_id=client.id)
                
                db.commit()
                total_orders_fetched += len(orders)
            except Exception as e:
                db.rollback()
                print(f"❌ Error processing {client.email}: {e}")
                raise self.retry(exc=e, countdown=60)

            page += 1

        # Update last sync timestamp
        latest_time = datetime.utcnow().isoformat() + "Z"
        if sync_state:
            sync_state.value = latest_time
        else:
            db.add(SyncState(key=state_key, value=latest_time))
        
        # Update client's last_synced_at
        client.last_synced_at = datetime.utcnow()
        db.commit()

        print(f"✅ Sync complete for {client.email}")
        print(f"   📊 Total processed: {total_orders_fetched} | New: {total_new_orders} | Updated: {total_updated_orders}")

    except Exception as e:
        print(f"❌ Unexpected error for client {client_id}: {e}")
        db.rollback()
        # Retry the task
        raise self.retry(exc=e, countdown=120, max_retries=3)
    
    finally:
        db.close()
        # Always release the lock, even if there was an error
        release_sync_lock(client_id)

# def fetch_all_orders_once(db: Session) -> None:
#     print(f"[DB INFO] Starting full order fetch...")

#     auth = (WC_CONSUMER_KEY, WC_CONSUMER_SECRET)
#     per_page = 100
#     page = 1

#     while True:
#         url = f"{WC_BASE_URL}?per_page={per_page}&page={page}"
#         try:
#             with httpx.Client() as client:
#                 response = client.get(url, auth=auth)
#         except Exception as e:
#             print(f"Exception while fetching orders: {e}")
#             break

#         if response.status_code != 200:
#             print(f"Error fetching orders: {response.text}")
#             break

#         orders = response.json()
#         if not orders:
#             print("No more orders to fetch.")
#             break

#         print(f"Processing page {page}, {len(orders)} orders")

#         try:
#             for data in orders:
#                 process_order_data(db, data)

#             db.commit()
#             print(f"✅ Committed page {page}")
#         except Exception as e:
#             db.rollback()
#             print(f"❌ Error processing page {page}: {e}")
#             break

#         page += 1

#     latest_time = datetime.utcnow().isoformat() + "Z"
#     set_last_synced_time(db, latest_time)