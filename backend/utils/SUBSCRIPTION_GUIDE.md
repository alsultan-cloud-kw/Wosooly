# Subscription-Based Feature Access Control Guide

This guide explains how to implement subscription-based feature access control in your FastAPI application.

## Overview

The subscription system allows you to:
1. Define which features require which subscription plans
2. Automatically block access to features for users without the required subscription
3. Check subscription status and available features

## Configuration

### 1. Feature to Plan Mapping

Edit `backend/utils/subscription.py` to define which features require which plans:

```python
FEATURE_PLANS = {
    "nl2sql": ["Professional", "Enterprise"],
    "advanced_analytics": ["Professional", "Enterprise"],
    "whatsapp_messaging": ["Standard", "Professional", "Enterprise"],
    "ai_predictions": ["Professional", "Enterprise"],
    "custom_reports": ["Enterprise"],
    # Add more features as needed
}
```

**Important**: Plan names must match exactly with the `name` field in your `SubscriptionPlan` table.

## Usage Examples

### Method 1: Using the Dependency Factory (Recommended)

This is the cleanest way to protect an endpoint. Simply use `require_feature()` as a dependency:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Client
from utils.subscription import require_feature

router = APIRouter()

@router.post("/premium-feature")
def premium_endpoint(
    current_client: Client = Depends(require_feature("advanced_analytics")),
    db: Session = Depends(get_db)
):
    """
    This endpoint requires 'advanced_analytics' feature.
    Only users with Pro Plan or All Unlimited Plan can access this.
    """
    # Your code here - automatically protected!
    return {"message": "Access granted", "client_id": current_client.id}
```

### Method 2: Manual Check Inside Endpoint

If you need more control or conditional logic:

```python
from utils.subscription import has_feature_access, get_client_subscription_plan

@router.post("/conditional-feature")
def conditional_endpoint(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    if not has_feature_access(current_client, "ai_predictions", db):
        plan_name = get_client_subscription_plan(current_client, db) or "Free Plan"
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Feature not available",
                "feature": "ai_predictions",
                "current_plan": plan_name,
                "message": "This feature requires Pro Plan or All Unlimited Plan subscription."
            }
        )
    
    # Feature logic here
    return {"message": "Access granted"}
```

### Method 3: Multiple Feature Requirements

You can check multiple features:

```python
@router.post("/multi-feature-endpoint")
def multi_feature_endpoint(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    from utils.subscription import has_feature_access
    
    if not (has_feature_access(current_client, "advanced_analytics", db) and 
            has_feature_access(current_client, "api_access", db)):
        raise HTTPException(
            status_code=403,
            detail="This endpoint requires both advanced_analytics and api_access features."
        )
    
    return {"message": "Access granted"}
```

## API Endpoints

### Get Subscription Info
```
GET /subscription-info
Authorization: Bearer <token>
```

Returns comprehensive subscription information:
```json
{
  "has_subscription": true,
  "plan_name": "Pro Plan",
  "plan_id": 3,
  "status": "active",
  "is_active": true,
  "trial_end": "2024-03-01T00:00:00",
  "current_period_end": "2024-04-01T00:00:00",
  "price": 25.0,
  "currency": "KWD",
  "billing_cycle": "monthly",
  "available_features": [
    "nl2sql",
    "advanced_analytics",
    "whatsapp_messaging",
    "ai_predictions",
    "api_access"
  ]
}
```

### Get Available Features
```
GET /available-features
Authorization: Bearer <token>
```

Returns a list of available features:
```json
{
  "features": [
    "nl2sql",
    "advanced_analytics",
    "whatsapp_messaging",
    "ai_predictions",
    "api_access"
  ]
}
```

## Subscription Status Logic

A subscription is considered **active** if:
1. Status is `"trial"` or `"active"`
2. The subscription period hasn't expired:
   - For `trial`: `trial_end` is in the future
   - For `active`: `current_period_end` is in the future

If a subscription is `"expired"` or `"canceled"`, the user is treated as having a "Free Plan".

## Error Response

When a user tries to access a feature they don't have access to, they receive:

```json
{
  "detail": {
    "error": "Feature not available",
    "feature": "nl2sql",
    "current_plan": "Free Plan",
    "required_plans": "Starter Plan, Pro Plan, All Unlimited Plan",
    "message": "This feature requires one of the following plans: Starter Plan, Pro Plan, All Unlimited Plan. Your current plan is: Free Plan. Please upgrade your subscription to access this feature."
  }
}
```

Status code: `403 Forbidden`

## Adding New Features

1. **Add the feature to `FEATURE_PLANS`** in `backend/utils/subscription.py`:
   ```python
   FEATURE_PLANS = {
       "your_new_feature": ["Pro Plan", "All Unlimited Plan"],
   }
   ```

2. **Protect your endpoint**:
   ```python
   @router.post("/your-endpoint")
   def your_endpoint(
       current_client: Client = Depends(require_feature("your_new_feature")),
       db: Session = Depends(get_db)
   ):
       # Your code here
       pass
   ```

## Real-World Examples

### Example 1: Protect NL2SQL Endpoint
```python
# backend/routers/nl2sql.py
@router.post("/nl2sql")
def get_sql_result(
    request: QueryRequest,
    current_client: Client = Depends(require_feature("nl2sql")),
    db: Session = Depends(get_db)
):
    # Only Starter Plan, Pro Plan, or All Unlimited Plan can access
    result = nl2sql.ask(request.question)
    return {"sql_query": result["sql_query"], "results": result["results"]}
```

### Example 2: Protect Advanced Analytics
```python
# backend/routers/analytics.py
@router.get("/advanced-analytics")
def get_advanced_analytics(
    current_client: Client = Depends(require_feature("advanced_analytics")),
    db: Session = Depends(get_db)
):
    # Only Pro Plan or All Unlimited Plan can access
    return {"analytics": "..."}
```

### Example 3: Protect WhatsApp Messaging
```python
# backend/routers/whatsapp.py
@router.post("/send-message")
def send_whatsapp_message(
    request: MessageRequest,
    current_client: Client = Depends(require_feature("whatsapp_messaging")),
    db: Session = Depends(get_db)
):
    # Starter Plan, Pro Plan, or All Unlimited Plan can access
    # Check campaign limits based on plan
    return {"status": "sent"}
```

## Testing

To test subscription access:

1. **Create a test client** with a specific plan
2. **Make API requests** with the client's JWT token
3. **Verify access** is granted or denied based on the plan

Example test:
```python
# User with Free Plan tries to access nl2sql
# Expected: 403 Forbidden

# User with Starter Plan tries to access nl2sql
# Expected: 200 OK

# User with Free Plan tries to access advanced_analytics
# Expected: 403 Forbidden
```

## Notes

- Plan names in `FEATURE_PLANS` must match exactly with `SubscriptionPlan.name` in the database
- If a feature is not in `FEATURE_PLANS`, access is allowed by default (backward compatibility)
- Subscription status is checked in real-time, so expired subscriptions are automatically blocked
- The system automatically handles trial periods and active subscriptions



