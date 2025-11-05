import httpx
from celery import shared_task
from models import Client
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
from datetime import datetime
from models import Product
from database import SessionLocal

db: Session = SessionLocal()

@shared_task(name="fetch_products_task", bind=True, max_retries=3)
def fetch_products_task(self, client_id: int = None):
    """
    Fetch WooCommerce products for a client and save/update to the DB.
    Handles client authentication and decryption as fetch_orders_task does.
    """
    

    try:
        if not client_id:
            print("⚠️ No client_id provided for product fetch.")
            return

        client = db.query(Client).filter_by(id=client_id).first()
        if not client:
            print(f"❌ Client {client_id} not found for product sync.")
            return

        if not client.store_url or not client.consumer_key or not client.consumer_secret:
            print(f"⚠️ Client {client_id} missing WooCommerce credentials.")
            return

        # Decrypt consumer_key and consumer_secret if encrypted
        consumer_key = client.consumer_key
        consumer_secret = client.consumer_secret

        if not consumer_key or not consumer_secret:
            print(f"⚠️ Decrypted credentials missing for client {client_id}.")
            return

        wc_base_url = f"{client.store_url}/wp-json/wc/v3/products"
        per_page = 100
        page = 1

        print(f"[DB INFO] Connected to: {db.bind.url} | [Client] {client.email}")

        while True:
            url = f"{wc_base_url}?per_page={per_page}&page={page}"
            print(f"[{client.email}] Fetching products page {page}...")

            try:
                with httpx.Client(timeout=60.0) as client_http:
                    response = client_http.get(url, auth=(consumer_key, consumer_secret))
            except Exception as e:
                print(f"❌ HTTP exception while fetching products for {client.email}: {e}")
                # Optionally: self.retry(exc=e, countdown=60)
                break

            if response.status_code != 200:
                print(f"❌ Failed to fetch products from {client.email}: {response.text}")
                if response.status_code in [401, 403]:
                    break  # Authentication problems: don't retry
                # Optionally: raise self.retry(countdown=60)
                break

            products = response.json()
            if not products:
                print(f"✅ [{client.email}] No more products to process.")
                break

            try:
                for data in products:
                    existing = db.query(Product).filter_by(external_id=data["id"]).first()

                    date_created = data.get("date_created")
                    date_modified = data.get("date_modified")

                    if date_created:
                        date_created = datetime.fromisoformat(date_created.replace("Z", "+00:00"))
                    if date_modified:
                        date_modified = datetime.fromisoformat(date_modified.replace("Z", "+00:00"))

                    if existing:
                        # Update existing product
                        existing.name = data["name"]
                        existing.short_description = data.get("short_description")
                        existing.regular_price = float(data.get("regular_price") or 0)
                        existing.sales_price = float(data.get("sale_price") or 0)
                        existing.total_sales = data.get("total_sales") or 0
                        existing.categories = ", ".join([cat["name"] for cat in data.get("categories", [])])
                        existing.stock_status = data.get("stock_status")
                        existing.weight = float(data.get("weight") or 0)
                        if date_created:
                            existing.date_created = date_created
                        if date_modified:
                            existing.date_modified = date_modified 
                    else:
                        product = Product(
                            external_id=data["id"],
                            name=data["name"],
                            short_description=data.get("short_description"),
                            regular_price=float(data.get("regular_price") or 0),
                            sales_price=float(data.get("sale_price") or 0),
                            total_sales=data.get("total_sales") or 0,
                            categories=", ".join([cat["name"] for cat in data.get("categories", [])]),
                            stock_status=data.get("stock_status"),
                            weight=float(data.get("weight") or 0),
                            date_created=date_created,
                            date_modified=date_modified,
                        )
                        db.add(product)
                db.commit()
                print(f"✅ [{client.email}] Committed page {page}")
            except Exception as e:
                db.rollback()
                print(f"❌ Failed to save products from page {page} for {client.email}: {e}")
                # Optionally: raise self.retry(exc=e, countdown=60)
                break
            page += 1
    except Exception as e:
        print(f"❌ Unexpected error in fetch_products_task for client {client_id}: {e}")
        db.rollback()
        # Optionally: raise self.retry(exc=e, countdown=120)
    finally:
        db.close()
