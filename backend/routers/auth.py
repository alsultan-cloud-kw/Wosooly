from fastapi import APIRouter,FastAPI, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.security import OAuth2PasswordRequestForm
from database import get_db
from models import Client, Base, Subscription, SubscriptionPlan, BusinessType
from utils.subscription import get_available_features, get_subscription_info
from utils.auth import get_current_client, hash_password, create_access_token, verify_password, decode_access_token
from typing import Optional
from schemas import LoginRequest, RegisterRequest, WooCommerceCredentialsRequest, SelectSubscriptionPlanRequest, ForgotPasswordRequest, ResetPasswordRequest
from tasks.fetch_orders import fetch_orders_task
from datetime import datetime, timezone
from celery.result import AsyncResult
from celery.exceptions import OperationalError
from datetime import timedelta
from routers.send_mail import send_single_email
import time
import secrets
import uuid
import os
from pydantic import BaseModel
from typing import List
import requests

router = APIRouter()

# Predefined business types
PREDEFINED_BUSINESS_TYPES = [
    "Gold",
    "Watches",
    "Electronics",
    "Fashion",
    "Clothing",
    "Perfumes",
    "Cosmetics",
    "Food & Beverages",
    "Restaurants",
    "Cafes",
    "General",
    "عام",
    "Other"
]

# Get frontend URL from environment
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

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
    company_details = request.company_details  # This will be the business type
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
        company_details=company_details,  # Business type
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

    # --- Send welcome email ---
    try:
        welcome_subject = "Welcome to Wosooly! 🎉"
        welcome_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }}
                .header {{ background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ padding: 30px 20px; }}
                .content h2 {{ color: #7c3aed; margin-top: 0; }}
                .button {{ display: inline-block; padding: 14px 28px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }}
                .button:hover {{ background-color: #6d28d9; }}
                .info-box {{ background-color: #f9fafb; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }}
                .footer a {{ color: #7c3aed; text-decoration: none; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to Wosooly!</h1>
                </div>
                <div class="content">
                    <h2>Hello{f' {client_name}' if client_name else ''}!</h2>
                    <p>Thank you for joining Wosooly! We're excited to have you on board.</p>
                    
                    <p>Your account has been successfully created with the email: <strong>{email}</strong></p>
                    
                    <div class="info-box">
                        <p><strong>What's next?</strong></p>
                        <ul>
                            <li>Access your dashboard to start analyzing your business data</li>
                            <li>Connect your WooCommerce store to sync orders and products</li>
                            <li>Explore our powerful analytics and insights features</li>
                            <li>Set up your messaging and communication tools</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{FRONTEND_URL}/user-dashboard" class="button">Go to Dashboard</a>
                    </div>
                    
                    <p>If you have any questions or need assistance, don't hesitate to reach out to our support team. We're here to help!</p>
                    
                    <p>Best regards,<br><strong>The Wosooly Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply to this message.</p>
                    <p>
                        <a href="{FRONTEND_URL}">Visit our website</a> | 
                        <a href="{FRONTEND_URL}/login">Sign in to your account</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        send_single_email(
            to_email=email,
            subject=welcome_subject,
            html_body=welcome_body
        )
        print(f"✅ Welcome email sent to {email}")
    except Exception as e:
        # Don't fail registration if email sending fails
        print(f"⚠️ Failed to send welcome email to {email}: {e}")
    
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
    # Use get_subscription_info to ensure plan_name and available_features are consistent
    # This checks if subscription is active before determining plan and features
    subscription_info = get_subscription_info(user, db)
    plan_name = subscription_info["plan_name"]
    trial_end = subscription_info.get("trial_end")
    available_features = subscription_info["available_features"]
    
    # Debug logging (can be removed in production)
    print(f"🔍 Login - Client {user.id}: plan_name={plan_name}, available_features={available_features}, is_active={subscription_info.get('is_active')}")


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

@router.get("/me")
def get_current_client_info(
    current_user: Client = Depends(get_current_client),
):
    """
    Get current logged-in client's information including business type.
    """
    return {
        "success": True,
        "data": {
            "id": current_user.id,
            "email": current_user.email,
            "client_name": current_user.client_name,
            "company_details": current_user.company_details,  # This is the business type
            "phone": current_user.phone,
        }
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


@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Send password reset email to user.
    """
    try:
        # Find user by email
        user = db.query(Client).filter(Client.email == request.email).first()
        
        # Always return success to prevent email enumeration
        if not user:
            return {
                "success": True,
                "message": "If an account with that email exists, a password reset link has been sent."
            }
        
        # Generate secure reset token
        reset_token = secrets.token_urlsafe(32)
        token_expires = datetime.now(timezone.utc) + timedelta(hours=1)  # Token valid for 1 hour
        
        # Store token in database
        user.password_reset_token = reset_token
        user.password_reset_token_expires = token_expires
        db.commit()
        
        # Create reset link
        reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        
        # Send email
        email_subject = "Password Reset Request"
        email_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .button:hover {{ background-color: #6d28d9; }}
                .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Password Reset Request</h2>
                <p>Hello,</p>
                <p>You have requested to reset your password. Click the button below to reset it:</p>
                <a href="{reset_link}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #7c3aed;">{reset_link}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not request this password reset, please ignore this email.</p>
                <div class="footer">
                    <p>Best regards,<br>Your Team</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            send_single_email(
                to_email=user.email,
                subject=email_subject,
                html_body=email_body
            )
        except Exception as e:
            print(f"Error sending password reset email: {e}")
            # Don't fail the request, just log the error
        
        return {
            "success": True,
            "message": "If an account with that email exists, a password reset link has been sent."
        }
    except Exception as e:
        print(f"Error in forgot password: {e}")
        # Always return success to prevent email enumeration
        return {
            "success": True,
            "message": "If an account with that email exists, a password reset link has been sent."
        }


@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Reset user password using the reset token.
    """
    try:
        # Find user by reset token
        user = db.query(Client).filter(
            Client.password_reset_token == request.token
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset token"
            )
        
        # Check if token is expired
        if user.password_reset_token_expires and user.password_reset_token_expires < datetime.now(timezone.utc):
            # Clear expired token
            user.password_reset_token = None
            user.password_reset_token_expires = None
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Reset token has expired. Please request a new one."
            )
        
        # Validate new password
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 6 characters long"
            )
        
        # Update password
        user.hashed_password = hash_password(request.new_password)
        user.password_reset_token = None
        user.password_reset_token_expires = None
        db.commit()
        
        return {
            "success": True,
            "message": "Password has been reset successfully. You can now login with your new password."
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in reset password: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while resetting your password. Please try again."
        )


class ValidateBusinessTypeRequest(BaseModel):
    business_type: str


@router.get("/business-types")
def get_business_types(db: Session = Depends(get_db)):
    """
    Get list of all business types (predefined + custom from database).
    """
    # Get all business types from database
    db_business_types = db.query(BusinessType).order_by(BusinessType.is_predefined.desc(), BusinessType.name.asc()).all()
    
    # Extract names
    business_types_list = [bt.name for bt in db_business_types]
    
    # If database is empty, initialize with predefined types
    if not business_types_list:
        # Initialize predefined business types
        for bt_name in PREDEFINED_BUSINESS_TYPES:
            existing = db.query(BusinessType).filter(BusinessType.name == bt_name).first()
            if not existing:
                db_bt = BusinessType(
                    name=bt_name,
                    is_predefined=True,
                    created_by_client_id=None
                )
                db.add(db_bt)
        db.commit()
        
        # Query again after initialization
        db_business_types = db.query(BusinessType).order_by(BusinessType.is_predefined.desc(), BusinessType.name.asc()).all()
        business_types_list = [bt.name for bt in db_business_types]
    
    return {
        "success": True,
        "business_types": business_types_list
    }


@router.post("/validate-business-type")
def validate_business_type(
    request: ValidateBusinessTypeRequest,
    db: Session = Depends(get_db),
):
    """
    Validate if a new business type is similar to existing ones using AI.
    Returns recommendation if similar type exists, or allows adding new one.
    Saves new business type to database if approved.
    """
    new_business_type = request.business_type.strip()
    
    # Get all existing business types from database
    existing_types = db.query(BusinessType).all()
    existing_type_names = [bt.name for bt in existing_types]
    
    # Check if exact match exists in database
    existing_bt = db.query(BusinessType).filter(
        func.lower(BusinessType.name) == func.lower(new_business_type)
    ).first()
    
    if existing_bt:
        return {
            "success": True,
            "is_valid": True,
            "is_existing": True,
            "message": f"'{new_business_type}' is already in the list."
        }
    
    # Also check predefined list (for backward compatibility)
    if new_business_type in PREDEFINED_BUSINESS_TYPES:
        # Make sure it exists in database
        existing_predefined = db.query(BusinessType).filter(
            func.lower(BusinessType.name) == func.lower(new_business_type)
        ).first()
        if not existing_predefined:
            # Add to database if missing
            db_bt = BusinessType(
                name=new_business_type,
                is_predefined=True,
                created_by_client_id=None
            )
            db.add(db_bt)
            db.commit()
        
        return {
            "success": True,
            "is_valid": True,
            "is_existing": True,
            "message": f"'{new_business_type}' is already in the list."
        }
    
    # Combine predefined and database types for AI comparison
    all_existing_types = list(set(PREDEFINED_BUSINESS_TYPES + existing_type_names))
    
    # Use Google Gemini API to check similarity
    try:
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            # Fallback: allow adding if no API key and save to database
            try:
                new_bt = BusinessType(
                    name=new_business_type,
                    is_predefined=False,
                    created_by_client_id=None
                )
                db.add(new_bt)
                db.commit()
                db.refresh(new_bt)
                
                return {
                    "success": True,
                    "is_valid": True,
                    "is_existing": False,
                    "can_add": True,
                    "message": f"'{new_business_type}' has been added as a new business type.",
                    "saved": True
                }
            except Exception as save_error:
                db.rollback()
                print(f"[Business Type Validation] Error saving (no API key): {save_error}")
                return {
                    "success": True,
                    "is_valid": True,
                    "is_existing": False,
                    "can_add": True,
                    "message": "Business type can be added.",
                    "saved": False
                }
        
        import json
        import re
        
        # Create prompt to check similarity
        prompt = f"""You are a business classification expert. Compare the new business type "{new_business_type}" with these existing business types: {', '.join(all_existing_types)}.

Determine if "{new_business_type}" is similar to or the same as any existing business type. Consider:
- Synonyms (e.g., "Jewellery" and "Jewelleries")
- Different spellings or languages
- General vs specific categories

Respond ONLY in valid JSON format (no markdown, no code blocks):
{{
    "is_similar": true or false,
    "similar_to": "existing business type name if similar, or null",
    "reason": "brief explanation",
    "recommendation": "use_existing or can_add_new"
}}

If similar, recommend using the existing type. If truly different, allow adding new."""
        
        # Use Gemini REST API
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={google_api_key}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "topK": 1,
                "topP": 1,
                "maxOutputTokens": 200,
            }
        }
        
        response = requests.post(api_url, json=payload, timeout=10)
        response.raise_for_status()
        result = response.json()
        
        # Extract text from response
        response_text = ""
        if result.get("candidates") and len(result["candidates"]) > 0:
            parts = result["candidates"][0].get("content", {}).get("parts", [])
            if parts:
                response_text = parts[0].get("text", "").strip()
        
        if not response_text:
            raise ValueError("Empty response from AI")
        
        # Parse JSON from response (handle markdown code blocks)
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group(0)
        
        try:
            ai_result = json.loads(response_text)
        except json.JSONDecodeError as e:
            print(f"[Business Type Validation] JSON parse error: {e}, Response: {response_text}")
            # If JSON parsing fails, use simple string matching
            is_similar = any(
                new_business_type.lower() in bt.lower() or bt.lower() in new_business_type.lower()
                for bt in all_existing_types
            )
            similar_to = next(
                (bt for bt in all_existing_types 
                 if new_business_type.lower() in bt.lower() or bt.lower() in new_business_type.lower()),
                None
            )
            ai_result = {
                "is_similar": is_similar,
                "similar_to": similar_to,
                "recommendation": "use_existing" if is_similar else "can_add_new"
            }
        
        is_similar = ai_result.get("is_similar", False)
        similar_to = ai_result.get("similar_to")
        recommendation = ai_result.get("recommendation", "can_add_new")
        
        if is_similar and similar_to and recommendation == "use_existing":
            return {
                "success": True,
                "is_valid": False,
                "is_existing": True,
                "can_add": False,
                "similar_to": similar_to,
                "message": f"'{new_business_type}' is similar to '{similar_to}'. Please use '{similar_to}' instead.",
                "recommendation": similar_to
            }
        else:
            # Save new business type to database
            try:
                new_bt = BusinessType(
                    name=new_business_type,
                    is_predefined=False,
                    created_by_client_id=None  # Can be set if we have authenticated user
                )
                db.add(new_bt)
                db.commit()
                db.refresh(new_bt)
                
                return {
                    "success": True,
                    "is_valid": True,
                    "is_existing": False,
                    "can_add": True,
                    "message": f"'{new_business_type}' has been added as a new business type.",
                    "saved": True
                }
            except Exception as save_error:
                db.rollback()
                print(f"[Business Type Validation] Error saving to database: {save_error}")
                # Still return success but note it wasn't saved
                return {
                    "success": True,
                    "is_valid": True,
                    "is_existing": False,
                    "can_add": True,
                    "message": f"'{new_business_type}' can be added as a new business type.",
                    "saved": False
                }
            
    except Exception as e:
        print(f"[Business Type Validation] Error: {e}")
        import traceback
        traceback.print_exc()
        # On error, allow adding (fail open)
        return {
            "success": True,
            "is_valid": True,
            "is_existing": False,
            "can_add": True,
            "message": f"'{new_business_type}' can be added as a new business type."
        }