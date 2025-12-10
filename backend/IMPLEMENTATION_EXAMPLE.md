# Implementation Example: Location-Based Customer Filtering

## Step-by-Step Implementation

### Step 1: Update Address Model

Add standardized location fields to the `Address` model in `models.py`:

```python
class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    company = Column(String)
    address_1 = Column(String)
    address_2 = Column(String)
    city = Column(String)  # Original city name
    state = Column(String)
    postcode = Column(String)
    country = Column(String)
    
    # NEW: Standardized location fields
    standardized_city = Column(String, nullable=True, index=True)  # Canonical city name
    governorate = Column(String, nullable=True, index=True)  # Governorate/Province
    
    customer = relationship("Customer", back_populates="address")
```

### Step 2: Update `process_order_data()` Function

Modify `backend/tasks/fetch_orders.py`:

```python
from utils.location_normalizer import normalize_address

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

    # ===== NEW: Normalize address =====
    billing = data.get("billing", {})
    normalized_addr = normalize_address(
        address_1=billing.get("address_1"),
        address_2=billing.get("address_2"),
        city=billing.get("city"),
        state=billing.get("state"),
        postcode=billing.get("postcode"),
        country=billing.get("country")
    )
    # ===== END NEW =====

    existing_address = db.query(Address).filter_by(
        customer_id=customer.id,
        address_1=data["billing"].get("address_1", ""),
        city=data["billing"].get("city", ""),
        postcode=data["billing"].get("postcode", "")
    ).first()

    if not existing_address:
        address = Address(
            customer_id=customer.id,
            company=billing.get("company"),
            address_1=billing.get("address_1"),
            address_2=billing.get("address_2"),
            city=billing.get("city"),  # Original city
            state=billing.get("state"),
            postcode=billing.get("postcode"),
            country=billing.get("country"),
            # ===== NEW: Store standardized values =====
            standardized_city=normalized_addr.get("standardized_city"),
            governorate=normalized_addr.get("governorate")
            # ===== END NEW =====
        )
        db.add(address)
    else:
        # ===== NEW: Update standardized fields if they changed =====
        if normalized_addr.get("standardized_city"):
            existing_address.standardized_city = normalized_addr.get("standardized_city")
        if normalized_addr.get("governorate"):
            existing_address.governorate = normalized_addr.get("governorate")
        # ===== END NEW =====

    # ... rest of the function remains the same ...
```

### Step 3: Create Database Migration

Create a new Alembic migration:

```bash
cd backend
alembic revision -m "add_location_standardization_fields"
```

Edit the generated migration file:

```python
"""add_location_standardization_fields

Revision ID: xxxxx
Revises: previous_revision
Create Date: 2024-xx-xx
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add new columns
    op.add_column('addresses', sa.Column('standardized_city', sa.String(), nullable=True))
    op.add_column('addresses', sa.Column('governorate', sa.String(), nullable=True))
    
    # Create indexes for performance
    op.create_index('ix_addresses_standardized_city', 'addresses', ['standardized_city'])
    op.create_index('ix_addresses_governorate', 'addresses', ['governorate'])

def downgrade():
    op.drop_index('ix_addresses_governorate', 'addresses')
    op.drop_index('ix_addresses_standardized_city', 'addresses')
    op.drop_column('addresses', 'governorate')
    op.drop_column('addresses', 'standardized_city')
```

### Step 4: Backfill Existing Addresses

Create a script to normalize existing addresses:

```python
# backend/scripts/normalize_existing_addresses.py

from database import SessionLocal
from models import Address
from utils.location_normalizer import normalize_address

def normalize_all_addresses():
    """Normalize all existing addresses in the database."""
    db = SessionLocal()
    try:
        addresses = db.query(Address).all()
        total = len(addresses)
        updated = 0
        
        print(f"📋 Processing {total} addresses...")
        
        for idx, addr in enumerate(addresses, 1):
            if idx % 100 == 0:
                print(f"   Progress: {idx}/{total}")
            
            # Normalize address
            normalized = normalize_address(
                address_1=addr.address_1,
                address_2=addr.address_2,
                city=addr.city,
                state=addr.state,
                postcode=addr.postcode,
                country=addr.country
            )
            
            # Update if we found a standardized city
            if normalized.get('standardized_city'):
                addr.standardized_city = normalized.get('standardized_city')
                addr.governorate = normalized.get('governorate')
                updated += 1
        
        db.commit()
        print(f"✅ Normalized {updated}/{total} addresses")
        print(f"   ({total - updated} addresses could not be standardized)")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    normalize_all_addresses()
```

Run it:
```bash
cd backend
python scripts/normalize_existing_addresses.py
```

### Step 5: Create Location Filtering Functions

Create helper functions for querying customers by location:

```python
# backend/customers/location_filters.py

from sqlalchemy.orm import Session
from models import Customer, Address
from utils.location_normalizer import (
    standardize_location,
    find_best_location_match
)

def get_customers_by_city(
    db: Session,
    city_name: str,
    client_id: int,
    fuzzy: bool = True
) -> list:
    """
    Get customers by city name (handles Arabic, English, and variations).
    
    Args:
        db: Database session
        city_name: City name (can be Arabic, English, or with typos)
        client_id: Client ID to filter by
        fuzzy: If True, use fuzzy matching for multiple possible cities
    
    Returns:
        List of Customer objects
    """
    if fuzzy:
        # Find best matches
        matches = find_best_location_match(city_name, threshold=0.7, max_results=5)
        if not matches:
            return []
        
        # Get standardized names
        city_names = [match[0] for match in matches]
        
        customers = (
            db.query(Customer)
            .join(Address)
            .filter(
                Address.standardized_city.in_(city_names),
                Customer.client_id == client_id
            )
            .all()
        )
    else:
        # Exact match only
        standardized = standardize_location(city_name, threshold=0.7)
        if not standardized:
            return []
        
        customers = (
            db.query(Customer)
            .join(Address)
            .filter(
                Address.standardized_city == standardized,
                Customer.client_id == client_id
            )
            .all()
        )
    
    return customers


def get_customers_by_governorate(
    db: Session,
    governorate: str,
    client_id: int
) -> list:
    """
    Get customers by governorate.
    
    Args:
        db: Database session
        governorate: Governorate name (e.g., "Hawalli", "Ahmadi")
        client_id: Client ID to filter by
    
    Returns:
        List of Customer objects
    """
    customers = (
        db.query(Customer)
        .join(Address)
        .filter(
            Address.governorate == governorate,
            Customer.client_id == client_id
        )
        .all()
    )
    
    return customers


def get_customers_by_location_search(
    db: Session,
    search_text: str,
    client_id: int,
    threshold: float = 0.6
) -> list:
    """
    Search customers by any location field (city, state, address).
    Uses fuzzy matching to find similar locations.
    
    Args:
        db: Database session
        search_text: Text to search for (can be in any field)
        client_id: Client ID to filter by
        threshold: Similarity threshold (0.0 to 1.0)
    
    Returns:
        List of Customer objects
    """
    # Try to standardize as a city first
    standardized = standardize_location(search_text, threshold=threshold)
    
    if standardized:
        # Search by standardized city
        customers = (
            db.query(Customer)
            .join(Address)
            .filter(
                Address.standardized_city == standardized,
                Customer.client_id == client_id
            )
            .all()
        )
        return customers
    
    # If not found as city, search in address fields (fuzzy)
    from sqlalchemy import or_, func
    
    search_pattern = f"%{search_text}%"
    
    customers = (
        db.query(Customer)
        .join(Address)
        .filter(
            Customer.client_id == client_id,
            or_(
                Address.city.ilike(search_pattern),
                Address.state.ilike(search_pattern),
                Address.address_1.ilike(search_pattern),
                Address.address_2.ilike(search_pattern)
            )
        )
        .all()
    )
    
    return customers
```

### Step 6: Use in API Endpoints

Example API endpoint for filtering customers by location:

```python
# backend/routers/customers.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from utils.auth import get_current_client
from customers.location_filters import (
    get_customers_by_city,
    get_customers_by_governorate,
    get_customers_by_location_search
)

router = APIRouter()

@router.get("/customers/by-location")
async def get_customers_by_location(
    city: str = None,
    governorate: str = None,
    search: str = None,
    fuzzy: bool = True,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client)
):
    """
    Get customers filtered by location.
    
    Query parameters:
    - city: City name (supports Arabic/English/variations)
    - governorate: Governorate name
    - search: General location search (searches all fields)
    - fuzzy: Enable fuzzy matching (default: True)
    """
    if city:
        customers = get_customers_by_city(db, city, current_client.id, fuzzy=fuzzy)
    elif governorate:
        customers = get_customers_by_governorate(db, governorate, current_client.id)
    elif search:
        customers = get_customers_by_location_search(db, search, current_client.id)
    else:
        return {"error": "Please provide city, governorate, or search parameter"}
    
    return {
        "count": len(customers),
        "customers": [
            {
                "id": c.id,
                "name": f"{c.first_name} {c.last_name}",
                "phone": c.phone,
                "email": c.email,
                "city": c.address.city if c.address else None,
                "standardized_city": c.address.standardized_city if c.address else None,
                "governorate": c.address.governorate if c.address else None
            }
            for c in customers
        ]
    }
```

## Testing the Implementation

### Test 1: Normalize Arabic City Name

```python
from utils.location_normalizer import standardize_location

# Test Arabic input
result = standardize_location("السالمية")
assert result == "Salmiya"
print("✅ Arabic normalization works")
```

### Test 2: Handle Spelling Variations

```python
# Test variations
variations = ["Salmiya", "Salmiyah", "salmiya", "al salmiya"]
for var in variations:
    result = standardize_location(var)
    assert result == "Salmiya"
    print(f"✅ '{var}' → 'Salmiya'")
```

### Test 3: Handle Typos

```python
# Test typo
result = standardize_location("Hawali")  # Missing one 'l'
assert result == "Hawalli"
print("✅ Typo handling works")
```

## Summary

After implementing these steps:

1. ✅ Addresses are normalized when orders are processed
2. ✅ Standardized location fields are stored in the database
3. ✅ Customers can be filtered by location (Arabic/English/variations)
4. ✅ Fuzzy matching handles typos and spelling variations
5. ✅ Existing addresses can be backfilled with standardized values

The system now handles:
- Arabic and English location names
- Spelling variations and typos
- Consistent location filtering across the application
