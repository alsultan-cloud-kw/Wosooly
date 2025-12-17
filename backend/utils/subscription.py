"""
Subscription and Feature Access Control Utilities
"""
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
from models import Client, Subscription, SubscriptionPlan
from database import get_db
from utils.auth import get_current_client
# ---------------------------------------------------------
# Feature → Plan Access Mapping 
# (Plan names MUST match SubscriptionPlan.name exactly)
# ---------------------------------------------------------
FEATURE_PLANS = {
    "nl2sql": ["Professional", "Enterprise"],
    "advanced_analytics": ["Professional", "Enterprise"],
    "whatsapp_messaging": ["Standard", "Enterprise"],
    "custom_reports": ["Free", "Standard", "Professional", "Enterprise"],
    "unlimited_campaigns": ["Enterprise"],
}

# Tier hierarchy (optional)
PLAN_HIERARCHY = {
    "Free": 0,
    "Standard": 1,
    "Professional": 2,
    "Enterprise": 3,
}
# ---------------------------------------------------------
# Check if subscription is active
# ---------------------------------------------------------
def is_subscription_active(subscription: Optional[Subscription]) -> bool:
    if not subscription:
        return False

    if subscription.status not in ["trial", "active"]:
        return False

    now = datetime.utcnow()

    if subscription.status == "trial" and subscription.trial_end:
        if now > subscription.trial_end:
            return False

    if subscription.status == "active" and subscription.current_period_end:
        if now > subscription.current_period_end:
            return False

    return True

# ---------------------------------------------------------
# Get client subscription plan name
# ---------------------------------------------------------
def get_client_subscription_plan(client: Client, db: Session) -> Optional[str]:
    db.refresh(client)

    subscription = client.subscription
    if not subscription or not is_subscription_active(subscription):
        return None

    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.id == subscription.plan_id
    ).first()

    return plan.name if plan else None

# ---------------------------------------------------------
# Check feature access
# ---------------------------------------------------------
def has_feature_access(client: Client, feature_name: str, db: Session) -> bool:
    if feature_name not in FEATURE_PLANS:
        return True  # allow undefined features

    plan_name = get_client_subscription_plan(client, db)

    # Default to "Free" if no subscription
    if not plan_name:
        plan_name = "Free"

    required_plans = FEATURE_PLANS.get(feature_name, [])
    return plan_name in required_plans

# ---------------------------------------------------------
# Dependency for FastAPI
# ---------------------------------------------------------
def require_feature(feature_name: str):
    def feature_check(
        current_client: Client = Depends(get_current_client),
        db: Session = Depends(get_db)
    ) -> Client:

        if not has_feature_access(current_client, feature_name, db):
            plan_name = get_client_subscription_plan(current_client, db) or "Free"
            required_plans = ", ".join(FEATURE_PLANS.get(feature_name, []))

            raise HTTPException(
                status_code=403,
                detail={
                    "error": "Feature not available",
                    "feature": feature_name,
                    "current_plan": plan_name,
                    "required_plans": required_plans,
                    "message": (
                        f"This feature requires one of: {required_plans}. "
                        f"Your current plan: {plan_name}. Please upgrade to access this feature."
                    )
                }
            )
        return current_client

    return feature_check

# ---------------------------------------------------------
# Get available features for a client
# ---------------------------------------------------------
def get_available_features(client: Client, db: Session) -> List[str]:
    plan_name = get_client_subscription_plan(client, db) or "Free"

    return [
        feature for feature, allowed_plans in FEATURE_PLANS.items()
        if plan_name in allowed_plans
    ]

# ---------------------------------------------------------
# Get full subscription info
# ---------------------------------------------------------
def get_subscription_info(client: Client, db: Session) -> dict:
    subscription = client.subscription
    plan_name = get_client_subscription_plan(client, db)

    if not subscription or not plan_name:
        return {
            "has_subscription": False,
            "plan_name": "Free",
            "status": "inactive",
            "is_active": False,
            "available_features": get_available_features(client, db),
        }

    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.id == subscription.plan_id
    ).first()

    return {
        "has_subscription": True,
        "plan_name": plan_name,
        "plan_id": plan.id,
        "status": subscription.status,
        "is_active": is_subscription_active(subscription),
        "trial_end": subscription.trial_end.isoformat() if subscription.trial_end else None,
        "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        "price": plan.price,
        "currency": plan.currency,
        "billing_cycle": plan.billing_cycle,
        "available_features": get_available_features(client, db),
    }