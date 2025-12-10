# Location Normalization - Quick Reference

## Quick Start

### 1. Import
```python
from utils.location_normalizer import (
    normalize_address,
    standardize_location,
    find_best_location_match
)
```

### 2. Normalize an Address
```python
normalized = normalize_address(
    city="السالمية",  # Arabic input
    state="Hawalli",
    country="Kuwait"
)

# Result:
# {
#     'city': 'السالمية',
#     'standardized_city': 'Salmiya',
#     'governorate': 'Hawalli',
#     'country': 'Kuwait'
# }
```

### 3. Standardize a Location Name
```python
# Handles Arabic, English, and typos
standardized = standardize_location("Salmiyah")  # → "Salmiya"
standardized = standardize_location("السالمية")  # → "Salmiya"
standardized = standardize_location("Hawali")    # → "Hawalli" (typo fix)
```

### 4. Find Multiple Matches
```python
matches = find_best_location_match("salmiya", threshold=0.7, max_results=3)
# Returns: [("Salmiya", 0.95, {...}), ...]
```

## Common Use Cases

### Use Case 1: Filter Customers by City
```python
from customers.location_filters import get_customers_by_city

customers = get_customers_by_city(db, "Salmiya", client_id=1, fuzzy=True)
# Works with: "Salmiya", "Salmiyah", "السالمية", "salmiya"
```

### Use Case 2: Filter by Governorate
```python
from customers.location_filters import get_customers_by_governorate

customers = get_customers_by_governorate(db, "Hawalli", client_id=1)
```

### Use Case 3: Search Any Location Field
```python
from customers.location_filters import get_customers_by_location_search

customers = get_customers_by_location_search(db, "السالمية", client_id=1)
```

## Supported Locations

### Major Cities
- Kuwait City (الكويت)
- Hawalli (حولي)
- Farwaniya (الفروانية)
- Ahmadi (الأحمدي)
- Jahra (الجهراء)
- Mubarak Al-Kabeer (مبارك الكبير)

### Popular Areas
- Salmiya (السالمية)
- Mahboula (المهبولة)
- Fahaheel (الفحيحيل)
- Jabriya (الجابرية)
- Salwa (سلوى)
- Mangaf (منقف)
- And many more...

## Function Reference

### `normalize_address()`
Normalizes all address components and returns standardized values.

**Parameters:**
- `address_1`, `address_2`, `city`, `state`, `postcode`, `country` (all optional)

**Returns:**
- Dictionary with normalized fields and `standardized_city`, `governorate`

### `standardize_location()`
Converts a location name to its canonical form.

**Parameters:**
- `input_text`: Location name (Arabic/English)
- `threshold`: Similarity threshold (default: 0.7)

**Returns:**
- Standardized location name or `None`

### `find_best_location_match()`
Finds multiple matching locations with similarity scores.

**Parameters:**
- `input_text`: Location name
- `threshold`: Minimum similarity (default: 0.7)
- `max_results`: Max results to return (default: 3)

**Returns:**
- List of tuples: `(standardized_name, score, location_info)`

## Threshold Guidelines

- **0.9+**: Very strict (exact or near-exact match)
- **0.7-0.9**: Recommended (handles minor typos)
- **0.6-0.7**: Loose (handles more variations)
- **<0.6**: Very loose (may return false positives)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Returns `None` for valid location | Lower threshold to 0.6 |
| Too many false matches | Increase threshold to 0.8 |
| Arabic not matching | Check if Arabic text is properly normalized |
| Performance issues | Use exact match on `standardized_city` field |

## Database Fields

After migration, `Address` table has:
- `city`: Original city name
- `standardized_city`: Canonical city name (indexed)
- `governorate`: Governorate name (indexed)

## Adding New Locations

Edit `backend/utils/location_normalizer.py`:

```python
KUWAIT_LOCATIONS = {
    # ... existing ...
    "New Area": {
        "arabic": ["المنطقة الجديدة"],
        "variations": ["new area", "newarea"],
        "governorate": "Hawalli"
    },
}
```
