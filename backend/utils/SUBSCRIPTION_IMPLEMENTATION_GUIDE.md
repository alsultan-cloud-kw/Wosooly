# 🛠️ Subscription System - Implementation Guide

## 📋 Quick Start Checklist

### ✅ Step 1: Database Setup
- [ ] Create `subscription_plans` table with plans (Free, Standard, Professional, Enterprise)
- [ ] Create `subscriptions` table linked to `clients`
- [ ] Ensure plan names match exactly in database and `FEATURE_PLANS`

### ✅ Step 2: Configure Features
- [ ] Edit `FEATURE_PLANS` in `subscription.py`
- [ ] Map each feature to required plans
- [ ] Test plan name matching (case-sensitive!)

### ✅ Step 3: Protect Backend Endpoints
- [ ] Add `require_feature()` to protected endpoints
- [ ] Test with different subscription plans
- [ ] Verify 403 errors for unauthorized access

### ✅ Step 4: Frontend Integration
- [ ] Update `sidebar_routes.json` with `premium` and `featureKey`
- [ ] Ensure login saves `available_features` to localStorage
- [ ] Test premium badge display
- [ ] Test upgrade redirect flow

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION FLOW                            │
└─────────────────────────────────────────────────────────────────┘

USER REGISTRATION/LOGIN
    │
    ├─→ Backend: Create/Find Client
    │
    ├─→ Backend: Check Subscription
    │   │
    │   ├─→ Has Subscription?
    │   │   ├─→ YES → Get Plan Name
    │   │   └─→ NO → Default to "Free"
    │   │
    │   └─→ Calculate Available Features
    │       │
    │       └─→ Loop through FEATURE_PLANS
    │           └─→ If user's plan in allowed plans → Add feature
    │
    └─→ Return to Frontend:
        {
          "plan_name": "Professional",
          "available_features": ["nl2sql", "advanced_analytics"]
        }
    │
    └─→ Frontend: Save to localStorage
        localStorage.setItem("available_features", [...])


USER CLICKS FEATURE (e.g., "Chat")
    │
    ├─→ Frontend Check (SidebarItem.jsx)
    │   │
    │   ├─→ Is premium feature?
    │   │   ├─→ YES → Check localStorage
    │   │   │   ├─→ Feature in available_features?
    │   │   │   │   ├─→ YES → Allow navigation
    │   │   │   │   └─→ NO → Show upgrade alert, redirect
    │   │   │   └─→ NO → Normal navigation
    │   │   └─→ NO → Normal navigation
    │   │
    │   └─→ Navigate to route
    │
    └─→ Backend Check (API Endpoint)
        │
        ├─→ require_feature("nl2sql") dependency runs
        │   │
        │   ├─→ Get current_client from JWT token
        │   │
        │   ├─→ has_feature_access(client, "nl2sql", db)
        │   │   │
        │   │   ├─→ Get client's plan: "Professional"
        │   │   │
        │   │   ├─→ Check FEATURE_PLANS["nl2sql"]
        │   │   │   = ["Professional", "Enterprise"]
        │   │   │
        │   │   └─→ Is "Professional" in list?
        │   │       ├─→ YES → Return True
        │   │       └─→ NO → Return False
        │   │
        │   └─→ If False → Raise HTTPException(403)
        │   └─→ If True → Continue to endpoint code
        │
        └─→ Execute endpoint logic
```

---

## 📝 Code Templates

### Template 1: Protect a New Endpoint
```python
# backend/routers/your_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import Client
from utils.subscription import require_feature
from database import get_db

router = APIRouter()

@router.post("/your-premium-endpoint")
def your_premium_function(
    # Your request model here
    data: YourRequestModel,
    # Add feature requirement here
    current_client: Client = Depends(require_feature("your_feature_name")),
    db: Session = Depends(get_db)
):
    """
    This endpoint requires 'your_feature_name' feature.
    Only users with the required subscription plan can access.
    """
    # Your business logic here
    return {"message": "Success", "data": "..."}
```

### Template 2: Conditional Feature Access
```python
from utils.subscription import has_feature_access

@router.get("/analytics")
def get_analytics(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    # Basic data for everyone
    response = {
        "basic": get_basic_data()
    }
    
    # Advanced data only for premium users
    if has_feature_access(current_client, "advanced_analytics", db):
        response["advanced"] = get_advanced_data()
    
    return response
```

### Template 3: Frontend Feature Check
```javascript
// In your React component
const handleFeatureClick = () => {
  const availableFeatures = JSON.parse(
    localStorage.getItem("available_features") || "[]"
  );
  
  if (!availableFeatures.includes("your_feature_key")) {
    alert("This feature requires a premium subscription!");
    navigate("/subscription");
    return;
  }
  
  // Proceed with feature
  navigate("/your-feature-route");
};
```

### Template 4: Add Feature to Sidebar
```json
// frontend/src/assets/JsonData/sidebar_routes.json
{
  "key": "YourFeature",
  "route": "/your-feature",
  "icon": "bx bx-icon-name",
  "premium": true,                    // Show premium badge
  "featureKey": "your_feature_name"   // Must match FEATURE_PLANS key
}
```

---

## 🧪 Testing Guide

### Test Case 1: Free Plan User
```python
# Setup: User with Free plan (no subscription)
# Test: Try to access "nl2sql" feature

# Expected Result:
# - Frontend: Shows upgrade alert, redirects to subscription
# - Backend: Returns 403 Forbidden
# - Error message: "This feature requires Professional or Enterprise plan"
```

### Test Case 2: Professional Plan User
```python
# Setup: User with Professional plan subscription
# Test: Try to access "nl2sql" feature

# Expected Result:
# - Frontend: Allows navigation
# - Backend: Returns 200 OK with data
# - Feature works correctly
```

### Test Case 3: Expired Subscription
```python
# Setup: User with expired subscription (status="expired")
# Test: Try to access any premium feature

# Expected Result:
# - Treated as "Free" plan
# - All premium features blocked
# - Returns 403 Forbidden
```

### Test Case 4: Trial User
```python
# Setup: User with trial subscription (status="trial")
# Test: Try to access features available in their plan

# Expected Result:
# - Features work if plan allows
# - Access revoked when trial_end passes
```

---

## 🔧 Common Configurations

### Configuration 1: Feature Available to All Plans
```python
FEATURE_PLANS = {
    "basic_feature": ["Free", "Standard", "Professional", "Enterprise"],
    # Everyone can access
}
```

### Configuration 2: Feature Only for Highest Tier
```python
FEATURE_PLANS = {
    "premium_feature": ["Enterprise"],
    # Only Enterprise plan
}
```

### Configuration 3: Feature for Multiple Tiers
```python
FEATURE_PLANS = {
    "mid_tier_feature": ["Standard", "Professional", "Enterprise"],
    # Not available for Free, but all paid plans
}
```

---

## 🐛 Troubleshooting

### Issue 1: Feature Not Working Despite Correct Plan
**Symptoms:** User has correct plan but gets 403 error

**Checklist:**
1. ✅ Verify plan name in database matches `FEATURE_PLANS` exactly (case-sensitive!)
2. ✅ Check subscription status is "trial" or "active"
3. ✅ Verify `current_period_end` or `trial_end` is in the future
4. ✅ Check `is_subscription_active()` returns True
5. ✅ Verify `has_feature_access()` returns True

**Debug Code:**
```python
from utils.subscription import (
    get_subscription_info,
    has_feature_access,
    get_client_subscription_plan
)

# Check subscription info
info = get_subscription_info(current_client, db)
print(f"Plan: {info['plan_name']}")
print(f"Is Active: {info['is_active']}")
print(f"Available Features: {info['available_features']}")

# Check specific feature
plan = get_client_subscription_plan(current_client, db)
can_access = has_feature_access(current_client, "nl2sql", db)
print(f"Plan: {plan}, Can access nl2sql: {can_access}")
```

### Issue 2: Frontend Shows Feature But Backend Blocks
**Symptoms:** UI allows access but API returns 403

**Causes:**
- Frontend uses cached `available_features` from localStorage
- User's subscription changed but frontend not refreshed

**Solution:**
```javascript
// Option 1: Refresh features on page load
useEffect(() => {
  const fetchFeatures = async () => {
    const res = await api.get("/available-features");
    localStorage.setItem("available_features", JSON.stringify(res.data.features));
  };
  fetchFeatures();
}, []);

// Option 2: Call subscription-info endpoint
useEffect(() => {
  const fetchSubscription = async () => {
    const res = await api.get("/subscription-info");
    localStorage.setItem("available_features", 
      JSON.stringify(res.data.available_features));
  };
  fetchSubscription();
}, []);
```

### Issue 3: Plan Name Mismatch
**Symptoms:** Feature should work but doesn't

**Solution:**
```python
# Check database
plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
print(f"Database plan name: '{plan.name}'")

# Check FEATURE_PLANS
print(f"FEATURE_PLANS keys: {FEATURE_PLANS.keys()}")
print(f"Required plans for feature: {FEATURE_PLANS.get('your_feature')}")

# They must match EXACTLY (case-sensitive!)
```

---

## 📊 Feature Planning Matrix

Use this matrix to plan your features:

| Feature | Free | Standard | Professional | Enterprise |
|---------|:----:|:--------:|:------------:|:----------:|
| Basic Reports | ✅ | ✅ | ✅ | ✅ |
| WhatsApp Messaging | ❌ | ✅ | ✅ | ✅ |
| Advanced Analytics | ❌ | ❌ | ✅ | ✅ |
| NL2SQL Chat | ❌ | ❌ | ✅ | ✅ |
| Custom Reports | ✅ | ✅ | ✅ | ✅ |
| Unlimited Campaigns | ❌ | ❌ | ❌ | ✅ |

**Implementation:**
```python
FEATURE_PLANS = {
    "basic_reports": ["Free", "Standard", "Professional", "Enterprise"],
    "whatsapp_messaging": ["Standard", "Professional", "Enterprise"],
    "advanced_analytics": ["Professional", "Enterprise"],
    "nl2sql": ["Professional", "Enterprise"],
    "custom_reports": ["Free", "Standard", "Professional", "Enterprise"],
    "unlimited_campaigns": ["Enterprise"],
}
```

---

## 🎯 Best Practices

1. **Always Validate on Backend**
   - Frontend checks are for UX only
   - Backend is the source of truth
   - Never trust frontend-only validation

2. **Use Descriptive Feature Names**
   - ✅ Good: `"whatsapp_messaging"`, `"advanced_analytics"`
   - ❌ Bad: `"feature1"`, `"premium"`

3. **Keep FEATURE_PLANS Updated**
   - Document what each feature does
   - Keep plan names consistent
   - Test after any changes

4. **Handle Errors Gracefully**
   - Show clear upgrade messages
   - Provide links to subscription page
   - Don't expose internal errors to users

5. **Test All Plan Combinations**
   - Test each plan with each feature
   - Test expired subscriptions
   - Test trial periods

---

## 📚 Related Files

- **Backend:**
  - `backend/utils/subscription.py` - Core subscription logic
  - `backend/models.py` - Database models
  - `backend/routers/auth.py` - Login/registration with features
  - `backend/routers/nl2sql.py` - Example protected endpoint

- **Frontend:**
  - `frontend/src/components/sidebar/SidebarItem.jsx` - Feature access check
  - `frontend/src/assets/JsonData/sidebar_routes.json` - Feature definitions
  - `frontend/src/pages/signIn.jsx` - Saves available_features
  - `frontend/src/pages/subscription.jsx` - Upgrade page

---

## 🚀 Next Steps

1. Review your current features and plans
2. Map features to plans in `FEATURE_PLANS`
3. Protect endpoints with `require_feature()`
4. Update frontend to show premium badges
5. Test with different subscription scenarios
6. Monitor subscription status and feature access

---

**Need help?** Refer to `SUBSCRIPTION_EXPLAINED.md` for detailed explanations!
