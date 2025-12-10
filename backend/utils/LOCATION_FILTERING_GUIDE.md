# Location-Based Customer Filtering Guide

## Overview

This guide explains how to implement location-based customer filtering in the WooCommerce order processing system, handling:
- **Arabic and English text** in address fields
- **Spelling variations** and typos
- **Location standardization** for consistent filtering

## Problem Statement

When processing WooCommerce orders, customer addresses may contain:
1. **Mixed languages**: Arabic and English text in the same field
2. **Spelling variations**: "Salmiya" vs "Salmiyah" vs "السالمية"
3. **Typos**: "Hawalli" vs "Hawali" vs "حولي"
4. **Inconsistent formatting**: "Al Qusour" vs "al-qosour" vs "القصور"

## Solution Architecture

### 1. Location Normalization Module (`location_normalizer.py`)

The module provides:
- **Text normalization**: Handles Arabic and English text
- **Fuzzy matching**: Finds similar location names despite spelling differences
- **Location database**: Standardized Kuwait locations with variations
- **Address normalization**: Normalizes all address components

### 2. Integration Points

#### A. In `process_order_data()` function
- Normalize address fields when creating/updating customers
- Store standardized location names for easy filtering
- Match customers by normalized location

#### B. In Customer Queries
- Filter customers by standardized location
- Support fuzzy matching for flexible searches
- Group customers by governorate/area

## Implementation Steps

### Step 1: Install Required Dependencies

No additional packages needed! Uses only Python standard library:
- `difflib` (for fuzzy matching)
- `re` (for regex)
- `unicodedata` (for Unicode normalization)

### Step 2: Import the Location Normalizer

```python
from utils.location_normalizer import (
    normalize_address,
    standardize_location,
    find_best_location_match,
    get_location_search_terms
)
```

### Step 3: Normalize Address in `process_order_data()`

When processing an order, normalize the billing address:

```python
from utils.location_normalizer import normalize_address

def process_order_data(db: Session, data: dict, client_id: int) -> None:
    # ... existing customer lookup code ...
    
    # Normalize address components
    billing = data.get("billing", {})
    normalized_addr = normalize_address(
        address_1=billing.get("address_1"),
        address_2=billing.get("address_2"),
        city=billing.get("city"),
        state=billing.get("state"),
        postcode=billing.get("postcode"),
        country=billing.get("country")
    )
    
    # Use standardized city for address matching
    city_to_store = normalized_addr.get('standardized_city') or normalized_addr.get('city')
    
    # ... rest of the function ...
```

### Step 4: Store Standardized Location

Update the Address model or add a new field to store standardized location:

**Option A: Add fields to Address model** (Recommended)
```python
# In models.py
class Address(Base):
    # ... existing fields ...
    standardized_city = Column(String, nullable=True, index=True)
    governorate = Column(String, nullable=True, index=True)
```

**Option B: Use existing city field with normalization**
- Store standardized city in the `city` field
- Keep original in a separate field if needed

### Step 5: Filter Customers by Location

#### Example 1: Filter by Exact Standardized City
```python
from utils.location_normalizer import standardize_location

def get_customers_by_location(db: Session, location_text: str, client_id: int):
    # Standardize the input location
    standardized = standardize_location(location_text, threshold=0.7)
    
    if not standardized:
        return []  # No match found
    
    # Query with standardized name
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
```

#### Example 2: Filter by Fuzzy Match (Multiple Locations)
```python
from utils.location_normalizer import find_best_location_match

def get_customers_by_location_fuzzy(db: Session, location_text: str, client_id: int):
    # Find matching locations
    matches = find_best_location_match(location_text, threshold=0.6, max_results=5)
    
    if not matches:
        return []
    
    # Get standardized names
    location_names = [match[0] for match in matches]
    
    # Query with multiple possible locations
    customers = (
        db.query(Customer)
        .join(Address)
        .filter(
            Address.standardized_city.in_(location_names),
            Customer.client_id == client_id
        )
        .all()
    )
    
    return customers
```

#### Example 3: Filter by Governorate
```python
def get_customers_by_governorate(db: Session, governorate: str, client_id: int):
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
```

## Usage Examples

### Example 1: Normalize Address on Order Processing

```python
# Input from WooCommerce
billing = {
    "city": "السالمية",  # Arabic: Salmiya
    "state": "Hawalli",
    "country": "Kuwait"
}

# Normalize
normalized = normalize_address(
    city=billing["city"],
    state=billing["state"],
    country=billing["country"]
)

# Result:
# {
#     'city': 'السالمية',
#     'standardized_city': 'Salmiya',
#     'governorate': 'Hawalli',
#     'country': 'Kuwait'
# }
```

### Example 2: Find Customers in Salmiya (Multiple Spellings)

```python
# All these will match "Salmiya":
search_terms = [
    "Salmiya",
    "Salmiyah", 
    "السالمية",
    "salmiya",
    "al salmiya"
]

for term in search_terms:
    standardized = standardize_location(term)
    # All return: "Salmiya"
```

### Example 3: Handle Typos

```python
# Input with typo
location = "Hawali"  # Missing one 'l'

# Still matches "Hawalli"
standardized = standardize_location(location, threshold=0.7)
# Returns: "Hawalli" (similarity: ~0.86)
```

## Database Migration

### Add Standardized Location Fields

```python
# Migration file: alembic/versions/xxx_add_location_fields.py

def upgrade():
    op.add_column('addresses', sa.Column('standardized_city', sa.String(), nullable=True))
    op.add_column('addresses', sa.Column('governorate', sa.String(), nullable=True))
    op.create_index('ix_addresses_standardized_city', 'addresses', ['standardized_city'])
    op.create_index('ix_addresses_governorate', 'addresses', ['governorate'])

def downgrade():
    op.drop_index('ix_addresses_governorate', 'addresses')
    op.drop_index('ix_addresses_standardized_city', 'addresses')
    op.drop_column('addresses', 'governorate')
    op.drop_column('addresses', 'standardized_city')
```

## Backfilling Existing Data

### Script to Normalize Existing Addresses

```python
# scripts/normalize_existing_addresses.py

from database import SessionLocal
from models import Address
from utils.location_normalizer import normalize_address

def normalize_all_addresses():
    db = SessionLocal()
    try:
        addresses = db.query(Address).all()
        
        for addr in addresses:
            normalized = normalize_address(
                address_1=addr.address_1,
                address_2=addr.address_2,
                city=addr.city,
                state=addr.state,
                postcode=addr.postcode,
                country=addr.country
            )
            
            addr.standardized_city = normalized.get('standardized_city')
            addr.governorate = normalized.get('governorate')
        
        db.commit()
        print(f"✅ Normalized {len(addresses)} addresses")
    finally:
        db.close()

if __name__ == "__main__":
    normalize_all_addresses()
```

## Performance Considerations

### 1. Indexing
- **Always index** `standardized_city` and `governorate` fields
- Use composite indexes for common query patterns

### 2. Caching
- Cache location standardization results (locations don't change often)
- Use Redis for frequently accessed location mappings

### 3. Query Optimization
- Prefer exact matches on `standardized_city` over fuzzy matching
- Use fuzzy matching only when exact match fails

## Testing

### Unit Tests

```python
# tests/test_location_normalizer.py

def test_arabic_to_english():
    assert standardize_location("السالمية") == "Salmiya"
    assert standardize_location("حولي") == "Hawalli"

def test_spelling_variations():
    assert standardize_location("Salmiyah") == "Salmiya"
    assert standardize_location("Hawali") == "Hawalli"  # typo

def test_fuzzy_matching():
    matches = find_best_location_match("Salmiya", threshold=0.7)
    assert len(matches) > 0
    assert matches[0][0] == "Salmiya"
```

## Troubleshooting

### Issue: Low Match Scores

**Problem**: `standardize_location()` returns `None` for valid locations.

**Solutions**:
1. Lower the threshold (default 0.7 → try 0.6)
2. Add more variations to `KUWAIT_LOCATIONS` dictionary
3. Check if input text is being normalized correctly

### Issue: Multiple Matches

**Problem**: `find_best_location_match()` returns too many results.

**Solutions**:
1. Increase the threshold
2. Reduce `max_results` parameter
3. Use the highest-scoring match only

### Issue: Performance

**Problem**: Fuzzy matching is slow on large datasets.

**Solutions**:
1. Use exact matching on `standardized_city` when possible
2. Cache standardization results
3. Pre-compute standardized values during data import

## Extending the Location Database

### Adding New Locations

Edit `backend/utils/location_normalizer.py`:

```python
KUWAIT_LOCATIONS = {
    # ... existing locations ...
    
    "New Area": {
        "arabic": ["المنطقة الجديدة", "منطقة جديدة"],
        "variations": ["new area", "newarea", "al new area"],
        "governorate": "Hawalli"  # or appropriate governorate
    },
}
```

## Best Practices

1. **Always normalize on input**: Normalize addresses when creating/updating records
2. **Store standardized values**: Don't rely on runtime normalization for queries
3. **Use exact matches first**: Only use fuzzy matching when exact match fails
4. **Index standardized fields**: Always index `standardized_city` and `governorate`
5. **Handle edge cases**: Check for `None` values and empty strings
6. **Log normalization results**: Track which locations couldn't be standardized

## Next Steps

1. ✅ Create `location_normalizer.py` module
2. ⏳ Add `standardized_city` and `governorate` fields to Address model
3. ⏳ Update `process_order_data()` to normalize addresses
4. ⏳ Create database migration
5. ⏳ Backfill existing addresses
6. ⏳ Add location filtering to customer queries
7. ⏳ Test with real WooCommerce data
