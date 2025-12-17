# 📚 Subscription System - Complete Explanation

## 🎯 What is This System?

The subscription system controls **which features users can access** based on their **subscription plan**. Think of it like Netflix:
- **Free Plan** = Limited features (like watching on one device)
- **Standard Plan** = More features (HD streaming)
- **Professional Plan** = Even more features (4K streaming)
- **Enterprise Plan** = All features (unlimited everything)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE STRUCTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Client     │──────│ Subscription │                    │
│  │              │      │              │                    │
│  │ - id         │      │ - client_id  │                    │
│  │ - email      │      │ - plan_id    │                    │
│  │ - name       │      │ - status     │                    │
│  └──────────────┘      │ - trial_end  │                    │
│                        │ - period_end │                    │
│                        └──────┬───────┘                    │
│                               │                            │
│                        ┌──────▼───────┐                    │
│                        │Subscription  │                    │
│                        │    Plan      │                    │
│                        │              │                    │
│                        │ - name       │                    │
│                        │ - price      │                    │
│                        │ - features   │                    │
│                        └──────────────┘                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  FEATURE ACCESS CONTROL                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FEATURE_PLANS = {                                           │
│    "nl2sql": ["Professional", "Enterprise"],                │
│    "advanced_analytics": ["Professional", "Enterprise"],     │
│    "whatsapp_messaging": ["Standard", "Enterprise"],         │
│    "custom_reports": ["Free", "Standard", "Professional",   │
│                      "Enterprise"],                          │
│    "unlimited_campaigns": ["Enterprise"]                     │
│  }                                                           │
│                                                              │
│  This means:                                                 │
│  • "nl2sql" feature → Only Professional & Enterprise plans │
│  • "whatsapp_messaging" → Standard & Enterprise plans       │
│  • "custom_reports" → ALL plans (even Free)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 How It Works - Step by Step

### **Step 1: User Logs In**
```
User → POST /login → Backend checks subscription → Returns available_features
```

**What happens:**
1. User enters email/password
2. Backend validates credentials
3. Backend checks user's subscription:
   ```python
   subscription = db.query(Subscription).filter(...).first()
   plan_name = subscription.plan.name if subscription else "Free"
   available_features = get_available_features(user, db)
   ```
4. Backend returns:
   ```json
   {
     "access_token": "...",
     "plan_name": "Professional",
     "available_features": ["nl2sql", "advanced_analytics", "whatsapp_messaging"]
   }
   ```
5. Frontend saves to localStorage:
   ```javascript
   localStorage.setItem("available_features", JSON.stringify(data.available_features));
   ```

---

### **Step 2: User Tries to Access a Feature**

#### **Scenario A: Frontend Check (UI Protection)**
```javascript
// In SidebarItem.jsx
if (premium) {
  const availableFeatures = JSON.parse(
    localStorage.getItem("available_features") || "[]"
  );
  
  if (!availableFeatures.includes(featureKey)) {
    alert("You need to upgrade!");
    navigate("/subscription");
    return;
  }
}
```

**What happens:**
- User clicks "Chat" (requires `nl2sql` feature)
- Frontend checks if `"nl2sql"` is in `available_features`
- If NOT → Show upgrade alert, redirect to subscription page
- If YES → Allow navigation

#### **Scenario B: Backend Check (API Protection)**
```python
# In backend/routers/nl2sql.py
@router.post("/nl2sql")
def get_sql_result(
    current_client: Client = Depends(require_feature("nl2sql")),
    db: Session = Depends(get_db)
):
    # This code ONLY runs if user has "nl2sql" feature
    result = nl2sql.ask(request.question)
    return result
```

**What happens:**
1. User makes API request to `/nl2sql`
2. `require_feature("nl2sql")` dependency runs:
   ```python
   def require_feature(feature_name: str):
       def feature_check(current_client, db):
           if not has_feature_access(current_client, feature_name, db):
               raise HTTPException(403, "Feature not available")
           return current_client
       return feature_check
   ```
3. System checks:
   - Get user's plan name (e.g., "Professional")
   - Check if "Professional" is in `FEATURE_PLANS["nl2sql"]` → ✅ YES
   - Allow access → Return 200 OK
4. If user has "Free" plan:
   - "Free" is NOT in `["Professional", "Enterprise"]` → ❌ NO
   - Return 403 Forbidden with error message

---

## 📊 Database Models Explained

### **1. SubscriptionPlan** (The Plans You Offer)
```python
class SubscriptionPlan:
    name = "Professional"           # Plan name (MUST match FEATURE_PLANS)
    price = 25.00                    # Cost per month
    currency = "KWD"                 # Currency
    billing_cycle = "monthly"        # monthly or yearly
    trial_period_days = 7             # Free trial days
```

**Example Plans:**
- **Free**: $0/month - Basic features
- **Standard**: $10/month - WhatsApp messaging
- **Professional**: $25/month - NL2SQL + Advanced Analytics
- **Enterprise**: $50/month - Everything + Unlimited campaigns

### **2. Subscription** (User's Active Subscription)
```python
class Subscription:
    client_id = 123                  # Which user
    plan_id = 2                      # Which plan (Professional)
    status = "active"                 # trial, active, expired, canceled
    trial_end = "2024-03-01"         # When trial ends
    current_period_end = "2024-04-01" # When subscription renews
```

**Status Values:**
- `"trial"` → User is in free trial period
- `"active"` → User paid, subscription is active
- `"expired"` → Subscription expired (no access)
- `"canceled"` → User canceled (no renewal)

### **3. Client** (The User)
```python
class Client:
    id = 123
    email = "user@example.com"
    subscription = relationship("Subscription")  # One-to-one
```

---

## 🔧 Key Functions Explained

### **1. `is_subscription_active(subscription)`**
Checks if subscription is currently valid:
```python
# Returns True if:
# - Status is "trial" AND trial_end is in the future
# - Status is "active" AND current_period_end is in the future
# Returns False if expired or canceled
```

### **2. `get_client_subscription_plan(client, db)`**
Gets the plan name for a user:
```python
# Returns: "Professional" or "Free" or None
# - If subscription exists and is active → Return plan name
# - If no subscription or expired → Return None
```

### **3. `has_feature_access(client, feature_name, db)`**
Checks if user can access a feature:
```python
# Example: has_feature_access(client, "nl2sql", db)
# 1. Get user's plan: "Professional"
# 2. Check FEATURE_PLANS["nl2sql"] = ["Professional", "Enterprise"]
# 3. Is "Professional" in that list? → YES → Return True
```

### **4. `require_feature(feature_name)`**
FastAPI dependency that blocks access:
```python
# Usage:
@router.post("/endpoint")
def my_endpoint(
    current_client: Client = Depends(require_feature("nl2sql"))
):
    # Only runs if user has "nl2sql" feature
    pass
```

### **5. `get_available_features(client, db)`**
Returns list of features user can access:
```python
# Example: User has "Professional" plan
# Returns: ["nl2sql", "advanced_analytics", "whatsapp_messaging"]
```

---

## 💻 Implementation Examples

### **Example 1: Protect an Endpoint**
```python
# backend/routers/whatsapp.py
from utils.subscription import require_feature

@router.post("/send-message")
def send_message(
    data: SendMessageRequest,
    current_client: Client = Depends(require_feature("whatsapp_messaging")),
    db: Session = Depends(get_db)
):
    # Only users with "Standard" or "Enterprise" plan can access
    # If user has "Free" plan → 403 Forbidden
    send_whatsapp_message(...)
    return {"status": "sent"}
```

### **Example 2: Conditional Feature Access**
```python
# backend/routers/analytics.py
from utils.subscription import has_feature_access

@router.get("/analytics")
def get_analytics(
    current_client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    # Basic analytics for everyone
    basic_data = get_basic_analytics()
    
    # Advanced analytics only for premium users
    if has_feature_access(current_client, "advanced_analytics", db):
        advanced_data = get_advanced_analytics()
        return {
            "basic": basic_data,
            "advanced": advanced_data
        }
    
    return {"basic": basic_data}
```

### **Example 3: Frontend Feature Check**
```javascript
// frontend/src/components/sidebar/SidebarItem.jsx
const handleClick = async () => {
  // Check premium feature
  if (premium) {
    const availableFeatures = JSON.parse(
      localStorage.getItem("available_features") || "[]"
    );
    
    if (!availableFeatures.includes(featureKey)) {
      alert("You need to upgrade your plan!");
      navigate("/subscription");
      return;
    }
  }
  
  // Allow navigation
  navigate(route);
};
```

---

## 🎨 Frontend Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER LOGIN FLOW                           │
└─────────────────────────────────────────────────────────────┘

1. User logs in → POST /login
   ↓
2. Backend returns:
   {
     "plan_name": "Professional",
     "available_features": ["nl2sql", "advanced_analytics", ...]
   }
   ↓
3. Frontend saves to localStorage:
   localStorage.setItem("available_features", [...])
   ↓
4. Sidebar shows premium badges:
   - If feature NOT in available_features → Show crown icon
   - If feature in available_features → Normal icon
   ↓
5. User clicks feature:
   - Frontend checks localStorage → Block if not available
   - OR → Navigate → Backend checks → 403 if not available
```

---

## 🚀 Adding a New Feature

### **Step 1: Define Feature in `subscription.py`**
```python
FEATURE_PLANS = {
    "your_new_feature": ["Professional", "Enterprise"],
    # ... existing features
}
```

### **Step 2: Protect Backend Endpoint**
```python
@router.post("/your-feature")
def your_endpoint(
    current_client: Client = Depends(require_feature("your_new_feature")),
    db: Session = Depends(get_db)
):
    # Your code here
    pass
```

### **Step 3: Add to Frontend (Optional)**
```javascript
// In sidebar_routes.json
{
  "key": "YourFeature",
  "route": "/your-feature",
  "icon": "bx bx-icon",
  "premium": true,
  "featureKey": "your_new_feature"  // Must match FEATURE_PLANS key
}
```

---

## 🔍 Debugging Tips

### **Check User's Subscription:**
```python
# In any endpoint
from utils.subscription import get_subscription_info

info = get_subscription_info(current_client, db)
print(info)
# {
#   "plan_name": "Professional",
#   "is_active": True,
#   "available_features": ["nl2sql", "advanced_analytics", ...]
# }
```

### **Check Feature Access:**
```python
from utils.subscription import has_feature_access

can_access = has_feature_access(current_client, "nl2sql", db)
print(f"Can access nl2sql: {can_access}")
```

### **Common Issues:**

1. **Feature not working even with correct plan?**
   - Check: Plan name in database matches `FEATURE_PLANS` exactly
   - Check: Subscription status is "trial" or "active"
   - Check: Subscription hasn't expired

2. **Frontend shows feature but backend blocks?**
   - Frontend uses cached `available_features` from localStorage
   - Solution: Refresh after subscription change, or call `/available-features` endpoint

3. **403 Error but user has correct plan?**
   - Check: Plan name spelling (case-sensitive!)
   - Check: `FEATURE_PLANS` has correct plan names
   - Check: Subscription is active (not expired)

---

## 📝 Summary

**The subscription system works like this:**

1. **Define Features** → Map features to plans in `FEATURE_PLANS`
2. **Protect Endpoints** → Use `require_feature()` dependency
3. **Frontend Checks** → Check `available_features` from localStorage
4. **Backend Validates** → Always check on backend (frontend can be bypassed)
5. **User Experience** → Show upgrade prompts when feature is locked

**Key Points:**
- ✅ Backend is the source of truth (always validate there)
- ✅ Frontend checks improve UX (show errors before API call)
- ✅ Plan names must match exactly (case-sensitive)
- ✅ Subscription status must be "trial" or "active"
- ✅ Expired subscriptions = No access (treated as "Free")

---

## 🎯 Quick Reference

| Function | Purpose | Returns |
|----------|---------|---------|
| `is_subscription_active()` | Check if subscription is valid | `bool` |
| `get_client_subscription_plan()` | Get user's plan name | `str` or `None` |
| `has_feature_access()` | Check feature access | `bool` |
| `require_feature()` | FastAPI dependency | Blocks if no access |
| `get_available_features()` | List of accessible features | `List[str]` |
| `get_subscription_info()` | Full subscription details | `dict` |

---

**Need help?** Check the examples in `backend/routers/nl2sql.py` and `backend/routers/whatsapp.py` for real-world usage!
