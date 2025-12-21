from fastapi import APIRouter,FastAPI, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from database import get_db
from models import Client, Base, Subscription, SubscriptionPlan
from utils.subscription import get_available_features
from utils.auth import get_current_client, hash_password, create_access_token, verify_password
from typing import Optional
from schemas import LoginRequest, RegisterRequest, WooCommerceCredentialsRequest, SelectSubscriptionPlanRequest
from tasks.fetch_orders import fetch_orders_task
from datetime import datetime
from celery.result import AsyncResult
from celery.exceptions import OperationalError
import time
from datetime import timedelta

router = APIRouter()

@router.post("/register")
def register_client(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new client and trigger initial full order sync.
    """
    # --- Check if Terms & Privacy are accepted ---
    if not request.accepted_terms:
        raise HTTPException(
            status_code=400,
            detail="You must accept the Terms of Service and Privacy Policy."
        )
    
    # --- Extract fields from request body ---
    email = request.email
    phone = request.phone
    password = request.password
    client_name = request.client_name
    store_url = request.store_url
    consumer_key = request.consumer_key
    consumer_secret = request.consumer_secret

    # --- Check if user already exists ---
    existing = db.query(Client).filter(Client.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if request.store_url or request.consumer_key or request.consumer_secret:
        if not (request.store_url and request.consumer_key and request.consumer_secret):
            raise HTTPException(
                status_code=400, 
                detail="WooCommerce credentials must include store_url, consumer_key, and consumer_secret"
            )
            
    # --- Create new client ---
    new_client = Client(
        email=email,
        phone=phone,
        hashed_password=hash_password(password),
        client_name=client_name,
        store_url=store_url,
        is_logged_in=True,
        last_login_time=datetime.utcnow(),
        accepted_terms=request.accepted_terms,
        terms_accepted_at=datetime.utcnow(),
        terms_version="1.0",
    )

    # --- Encrypt WooCommerce credentials (handled by model setters) ---
    new_client.consumer_key = consumer_key
    new_client.consumer_secret = consumer_secret

    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    # ------------------------------------------------------------------
    # 🚀 CREATE SUBSCRIPTION FOR THE CLIENT
    # ------------------------------------------------------------------
    # selected_plan = request.plan or "Free"
    # # Fetch the default subscription plan (e.g., "Standard")
    # plan = db.query(SubscriptionPlan).filter(
    #     SubscriptionPlan.name == selected_plan
    # ).first()

    # if not plan:
    #     raise HTTPException(
    #         status_code=500,
    #         detail="Default subscription plan not found. Admin must create it first."
    #     )

    # # Calculate trial end date
    # trial_end_date = datetime.utcnow() + timedelta(days=plan.trial_period_days)

    # # Create subscription
    # subscription = Subscription(
    #     client_id=new_client.id,
    #     plan_id=plan.id,
    #     status="trial",
    #     trial_end=trial_end_date,
    #     current_period_end=trial_end_date,  # renewal after trial
    # )

    # db.add(subscription)
    # db.commit()
    # db.refresh(subscription)

    # --- Create JWT token ---
    access_token = create_access_token(
        data={"sub": new_client.email, "user_id": new_client.id}
    )

    # Lazy import of the task to avoid early import-time side effects
    from celery_app import onboard_new_client_task

    # Retry enqueueing so transient broker/worker startup delays don't fail registration
    task_id = None
    max_attempts = 5
    for attempt in range(1, max_attempts + 1):
        try:
            task = onboard_new_client_task.apply_async(kwargs={'client_id': new_client.id})
            task_id = task.id
            print(f"🚀 Triggered onboarding for client {new_client.email} (task_id={task_id})")
            break
        except OperationalError as e:
            # kombu/celery raises OperationalError on connection refused
            print(f"⚠️ Celery broker not ready (attempt {attempt}/{max_attempts}): {e}")
            if attempt < max_attempts:
                time.sleep(2)
            else:
                print("❌ Could not enqueue onboarding after retries; periodic sync will handle it.")
                task_id = None
        except Exception as e:
            # fallback catch-all (keeps registration from failing)
            print(f"⚠️ Could not enqueue onboarding for {new_client.email}: {e}")
            task_id = None
            break

    return {
        "message": "Client registered successfully",
        "client_id": new_client.id,
        "email": new_client.email,
        # "subscription_status": subscription.status,
        # "plan_name": plan.name,
        "available_features": get_available_features(new_client, db),
        # "trial_end": subscription.trial_end.isoformat(),
        "access_token": access_token,
        "token_type": "bearer",
        "task_id": task_id,
    }

@router.get("/task-status/{task_id}")
def get_task_status(task_id: str):
    """
    Check Celery task progress.
    Returns one of: PENDING, STARTED, SUCCESS, FAILURE
    """
    result = AsyncResult(task_id)
    return {"task_id": task_id, "status": result.status}

@router.get("/sync-status/{email}")
def get_sync_status(email: str, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.email == email).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return {
        "sync_status": client.sync_status,
        "sync_complete": client.sync_status == "COMPLETE",
        "last_synced_at": client.last_synced_at
    }

@router.post("/login")
def login_client(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login client and trigger incremental order sync.
    """
    # --- Check if user exists ---
    user = db.query(Client).filter(Client.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # --- Check if account is active ---
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is disabled. Please contact support."
        )

    # --- Update login status ---
    user.is_logged_in = True
    user.last_login_time = datetime.utcnow()
    db.commit()

    # --- Fetch subscription info ---
    subscription = db.query(Subscription).filter(Subscription.client_id == user.id).first()
    plan_name = subscription.plan.name if subscription and subscription.plan else "Free"
    trial_end = subscription.trial_end.isoformat() if subscription else None

    # Optional: you can define available features per plan here
    available_features = get_available_features(user, db)  # implement this based on plan


    # --- Create JWT token ---
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id}
    )

    # --- Trigger background sync since last login ---
    # Only if credentials exist - fetch products first, then orders
    if user.store_url and user.consumer_key and user.consumer_secret:
        try:
            from tasks.fetch_products import fetch_products_task
            from tasks.fetch_orders import fetch_orders_task
            from celery import chain
            
            # Chain products first, then incremental orders
            workflow = chain(
                fetch_products_task.si(client_id=user.id),
                fetch_orders_task.si(client_id=user.id, full_fetch=False)
            )
            workflow.apply_async()
            print(f"✅ Triggered product + incremental order sync for client {user.id} on login")
        except Exception as e:
            # Log but don't fail login - periodic task will handle it
            print(f"⚠️ Could not enqueue sync tasks: {e}")
            print(f"⚠️ Periodic task will handle sync for client {user.id}")
    else:
        print(f"⚠️ Client {user.id} missing WooCommerce credentials. Skipping sync.")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "client_name": user.client_name,
        "plan_name": plan_name,
        "trial_end": trial_end,
        "available_features": available_features,
    }

@router.post("/logout")
def logout_client(
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """
    Logout client and update status.
    """
    current_user.is_logged_in = False
    db.commit()
    
    return {
        "message": "Logged out successfully",
        "email": current_user.email
    }

@router.post("/cancel_subscription")
def cancel_subscription(
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """
    Cancel the user's subscription.
    - If in trial: cancel immediately.
    - If active: stop renewal but allow access until period end.
    """
    subscription = current_user.subscription

    if not subscription:
        raise HTTPException(status_code=400, detail="No subscription found.")

    # Already canceled
    if subscription.status == "canceled":
        return {"message": "Subscription is already canceled."}

    now = datetime.utcnow()

    # --- If user is still in trial ---
    if subscription.status == "trial":
        subscription.status = "canceled"
        subscription.current_period_end = subscription.trial_end  # trial end
        subscription.updated_at = now
        db.commit()
        db.refresh(subscription)

        return {
            "message": "Trial subscription canceled successfully.",
            "status": subscription.status,
            "trial_end": subscription.trial_end
        }

    # --- If user is on a paid active plan ---
    if subscription.status == "active":
        subscription.status = "canceled"
        # Keep access until renewal date
        subscription.updated_at = now
        db.commit()
        db.refresh(subscription)

        return {
            "message": "Subscription canceled. You will retain access until the end of your billing period.",
            "status": subscription.status,
            "current_period_end": subscription.current_period_end
        }

    # Other statuses
    return {
        "message": f"Subscription in '{subscription.status}' status cannot be canceled.",
        "status": subscription.status
    }

@router.get("/subscription-info")
def get_subscription_info(
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive subscription information for the current user,
    including available features.
    """
    from utils.subscription import get_subscription_info
    
    return get_subscription_info(current_user, db)

@router.get("/available-features")
def get_available_features_of_client(
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """
    Get a list of all features available to the current user based on their subscription.
    """
    
    
    return {
        "features": get_available_features(current_user, db)
    }

@router.post("/select-subscription-plan")
def select_subscription_plan(
    request: SelectSubscriptionPlanRequest,
    current_user: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """
    Select or update subscription plan for the current client.
    Creates a new subscription if none exists, or updates existing one.
    """
    # Validate billing cycle
    if request.billing_cycle not in ["monthly", "yearly"]:
        raise HTTPException(
            status_code=400,
            detail="billing_cycle must be 'monthly' or 'yearly'"
        )
    
    # Find the subscription plan
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.name == request.plan_name,
        SubscriptionPlan.billing_cycle == request.billing_cycle,
        SubscriptionPlan.is_active == True
    ).first()
    
    if not plan:
        raise HTTPException(
            status_code=404,
            detail=f"Subscription plan '{request.plan_name}' with billing cycle '{request.billing_cycle}' not found or inactive"
        )
    
    # Check if client already has a subscription
    existing_subscription = db.query(Subscription).filter(
        Subscription.client_id == current_user.id
    ).first()
    
    now = datetime.utcnow()
    trial_end_date = now + timedelta(days=plan.trial_period_days)
    
    if existing_subscription:
        # Update existing subscription
        existing_subscription.plan_id = plan.id
        # If subscription is canceled or expired, restart as trial
        if existing_subscription.status in ["canceled", "expired"]:
            existing_subscription.status = "trial"
            existing_subscription.trial_end = trial_end_date
            existing_subscription.current_period_end = trial_end_date
        existing_subscription.updated_at = now
        db.commit()
        db.refresh(existing_subscription)
        
        subscription = existing_subscription
    else:
        # Create new subscription
        subscription = Subscription(
            client_id=current_user.id,
            plan_id=plan.id,
            status="trial",
            trial_end=trial_end_date,
            current_period_end=trial_end_date,
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
    
    # Get updated subscription info
    from utils.subscription import get_subscription_info
    subscription_info = get_subscription_info(current_user, db)
    
    return {
        "message": f"Subscription plan '{request.plan_name}' selected successfully",
        "subscription": subscription_info
    }

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
    
    # Retry enqueueing so transient broker/worker startup delays don't fail the request
    # Fetch products first, then orders (same as onboarding flow)
    task_id = None
    max_attempts = 5
    for attempt in range(1, max_attempts + 1):
        try:
            from tasks.fetch_products import fetch_products_task
            from tasks.fetch_orders import fetch_orders_task
            from celery import chain
            
            # Chain products first, then orders (products are needed for order processing)
            workflow = chain(
                fetch_products_task.si(client_id=current_user.id),
                fetch_orders_task.si(client_id=current_user.id, full_fetch=True)
            )
            task = workflow.apply_async()
            task_id = task.id
            print(f"✅ Triggered product + order sync for client {current_user.id} after credential update (task_id={task_id})")
            break
        except OperationalError as e:
            # kombu/celery raises OperationalError on connection refused
            print(f"⚠️ Celery broker not ready (attempt {attempt}/{max_attempts}): {e}")
            if attempt < max_attempts:
                time.sleep(2)
            else:
                print("❌ Could not enqueue sync tasks after retries; periodic sync will handle it.")
                task_id = None
        except Exception as e:
            # fallback catch-all (keeps the request from failing)
            print(f"⚠️ Could not enqueue sync tasks for {current_user.email}: {e}")
            task_id = None
            break
    
    return {
        "message": "WooCommerce credentials updated successfully",
        "store_url": current_user.store_url,
        "sync_status": current_user.sync_status
    }