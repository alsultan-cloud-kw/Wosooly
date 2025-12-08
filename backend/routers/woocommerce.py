from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from utils.auth import get_current_client
from schemas import WooCommerceCredentialsRequest
from models import Client

router = APIRouter()

@router.post("/woocommerce-credentials")
def update_woocommerce_credentials(
    credentials: WooCommerceCredentialsRequest,
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """
    Update WooCommerce credentials for the current authenticated user.
    Credentials are automatically encrypted before storage.
    """
    # Validate that all required fields are provided
    if not credentials.store_url or not credentials.consumer_key or not credentials.consumer_secret:
        raise HTTPException(
            status_code=400,
            detail="All fields (store_url, consumer_key, consumer_secret) are required"
        )
    
    # Validate URL format
    try:
        from urllib.parse import urlparse
        parsed = urlparse(credentials.store_url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError("Invalid URL format")
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid store URL format. Please provide a valid URL (e.g., https://yourstore.com)"
        )
    
    # Update credentials (encryption is handled by model setters)
    current_user.store_url = credentials.store_url
    current_user.consumer_key = credentials.consumer_key
    current_user.consumer_secret = credentials.consumer_secret
    
    # Update sync status to PENDING to trigger a new sync
    current_user.sync_status = "PENDING"
    
    db.commit()
    db.refresh(current_user)
    
    # Optionally trigger a sync task
    try:
        from tasks.fetch_orders import fetch_orders_task
        fetch_orders_task.delay(client_id=current_user.id, full_fetch=True)
        print(f"✅ Triggered full sync for client {current_user.id} after credential update")
    except Exception as e:
        # Log but don't fail the request - periodic task will handle it
        print(f"⚠️ Could not enqueue fetch_orders_task: {e}")
    
    return {
        "message": "WooCommerce credentials updated successfully",
        "store_url": current_user.store_url,
        "sync_status": current_user.sync_status
    }