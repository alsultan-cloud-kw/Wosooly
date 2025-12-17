"""
Location Normalization Utility for Kuwait

Extracts governorate information from address fields (city, state, address_1, address_2)
handling Arabic and English text with spelling variations.
"""

import re
from typing import Optional, Dict

# Kuwait Governorates and their areas
KUWAIT_LOCATIONS = {
    "Capital": {
        "arabic": ["الكويت", "العاصمة", "الكويت العاصمة"],
        "variations": ["capital", "kuwait city", "kuwait"],
        "governorate": "Capital",
        "areas": ["الدوحة", "السالمية", "الرميثية", "القرين", "دسمان", "الصالحية", "المرقاب", "الشرق", "القبلة", "دسمان", "شرق الصليبخات", "اليرموك", "قرطبة"],
         
    },

    "Hawalli": {
        "arabic": ["حولي", "محافظة حولي"],
        "variations": ["hawalli", "hawally", "hawali"],
        "governorate": "Hawalli",
        "areas": ["السالمية", "الرميثية", "العديلية", "الجابرية", "بيان", "مشرف", "الروضة", "الزهراء", "حطين"],
        
    },

    "Farwaniya": {
        "arabic": ["الفروانية", "محافظة الفروانية"],
        "variations": ["farwaniya", "farwaniyah", "farwania"],
        "governorate": "Farwaniya",
        "areas": ["الاندلس", "الرابية", "الخالدية", "جليب الشيوخ", "الرقعي", "الصليبية", "العمرية", "خيطان"]
    },

    "Ahmadi": {
        "arabic": ["الأحمدي", "محافظة الأحمدي"],
        "variations": ["ahmadi", "ahmady", "ahmedi"],
        "governorate": "Ahmadi",
        "areas": ["الفنطاس", "العقيلة", "الظهر", "المنقف", "الفنيطيس", "الوفرة", "الزور", "صباح الأحمد", "فهد الأحمد", "المحبولة"],
        "variations_areas": ["mahboula", "mahboola", "al-mahboola", "al mahboola"]  # English variations for areas
    },

    "Jahra": {
        "arabic": ["الجهراء", "محافظة الجهراء"],
        "variations": ["jahra", "jahrah", "jihra"],
        "governorate": "Jahra",
        "areas": ["السالمي", "الكويت الجديدة", "الصليبية", "النسيم", "الري", "القصر", "الصبية", "كبد", "العبدلي", "المطلاع", "هدية", "تيماء"],
         
    },

    "Mubarak Al-Kabeer": {
        "arabic": ["مبارك الكبير", "محافظة مبارك الكبير"],
        "variations": ["mubarak al kabeer", "mubarak alkabeer", "mubarak alkabir", "mubarak"],
        "governorate": "Mubarak Al-Kabeer",
        "areas": ["صباح السالم", "العدان", "القرين", "الفنيطيس", "المسيلة", "الوفرة", "القصور"],
        
    }
}


def normalize_arabic_text(text: str) -> str:
    """Normalize Arabic text by removing diacritics and standardizing characters."""
    if not text:
        return ""
    
    text = str(text).strip()
    
    # Remove diacritics (tashkeel)
    text = re.sub(r'[\u064B-\u065F\u0670]', '', text)
    
    # Normalize Arabic characters
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    text = text.replace('ى', 'ي')
    text = text.replace('ة', 'ه')
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def normalize_english_text(text: str) -> str:
    """Normalize English text."""
    if not text:
        return ""
    
    text = str(text).strip().lower()
    # Remove special characters except spaces
    text = re.sub(r'[^\w\s]', '', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def similarity_ratio(str1: str, str2: str) -> float:
    """Calculate similarity ratio between two strings."""
    if not str1 or not str2:
        return 0.0
    
    if str1 == str2:
        return 1.0
    
    # Simple substring check
    if str1 in str2 or str2 in str1:
        return 0.8
    
    # Calculate character overlap
    set1 = set(str1.lower())
    set2 = set(str2.lower())
    if not set1 or not set2:
        return 0.0
    
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    
    return intersection / union if union > 0 else 0.0


def find_best_location_match(input_text: str, threshold: float = 0.6) -> Optional[str]:
    """Find the best matching location from KUWAIT_LOCATIONS."""
    if not input_text or not input_text.strip():
        return None
    
    input_text = str(input_text).strip()
    normalized_input = normalize_arabic_text(input_text) if any('\u0600' <= c <= '\u06FF' for c in input_text) else normalize_english_text(input_text)
    
    # First pass: Check for exact area matches (highest priority)
    for location_name, location_info in KUWAIT_LOCATIONS.items():
        # Check Arabic areas
        for area in location_info.get("areas", []):
            norm_area = normalize_arabic_text(area)
            if norm_area == normalized_input:
                return location_name  # Exact area match - return immediately
        
        # Check English area variations
        for area_var in location_info.get("variations_areas", []):
            norm_area_var = normalize_english_text(area_var)
            if norm_area_var == normalized_input:
                return location_name  # Exact area variation match - return immediately
    
    best_match = None
    best_score = 0.0
    
    # Second pass: Check all matches and score them
    for location_name, location_info in KUWAIT_LOCATIONS.items():
        scores = []
        
        # Check areas first (high priority)
        for area in location_info.get("areas", []):
            norm_area = normalize_arabic_text(area)
            if norm_area == normalized_input:
                return location_name  # Exact area match
            if norm_area in normalized_input or normalized_input in norm_area:
                scores.append(0.95)  # High score for area match
        
        # Check English variations for areas (like "mahboula", "al-mahboola")
        for area_var in location_info.get("variations_areas", []):
            norm_area_var = normalize_english_text(area_var)
            if norm_area_var == normalized_input:
                return location_name  # Exact area variation match
            if norm_area_var in normalized_input or normalized_input in norm_area_var:
                scores.append(0.95)  # High score for area variation match
        
        # Check Arabic names
        for arabic_name in location_info.get("arabic", []):
            norm_ar = normalize_arabic_text(arabic_name)
            if norm_ar == normalized_input:
                return location_name  # Exact match
            if norm_ar in normalized_input or normalized_input in norm_ar:
                scores.append(0.9)  # Substring match
            scores.append(similarity_ratio(normalized_input, norm_ar))
        
        # Check English variations
        for variation in location_info.get("variations", []):
            norm_var = normalize_english_text(variation)
            if norm_var == normalized_input:
                return location_name  # Exact match
            if norm_var in normalized_input or normalized_input in norm_var:
                scores.append(0.9)  # Substring match
            scores.append(similarity_ratio(normalized_input, norm_var))
        
        # Get max score for this location
        max_score = max(scores) if scores else 0.0
        if max_score > best_score and max_score >= threshold:
            best_score = max_score
            best_match = location_name
    
    return best_match


def extract_location_from_address(address_text: str) -> Optional[str]:
    """Extract location from address_1 or address_2 text."""
    if not address_text:
        return None
    
    # Normalize the address text
    normalized = normalize_arabic_text(address_text)
    
    # Pattern 1: Look for "محافظة" (governorate) followed by name
    governorate_match = re.search(r'محافظة\s+([^،,]+)', normalized)
    if governorate_match:
        gov_name = governorate_match.group(1).strip()
        matched = find_best_location_match(gov_name, threshold=0.5)
        if matched:
            return matched
    
    # Pattern 2: Look for "منطقة" (area) followed by name
    area_match = re.search(r'منطقة\s+([^،,]+)', normalized)
    if area_match:
        area_name = area_match.group(1).strip()
        matched = find_best_location_match(area_name, threshold=0.5)
        if matched:
            return matched
    
    # Pattern 3: Try to match any known location name in the text
    # Split by common separators
    parts = re.split(r'[،,\-]', normalized)
    for part in parts:
        part = part.strip()
        if len(part) > 2:
            matched = find_best_location_match(part, threshold=0.5)
            if matched:
                return matched
    
    # Pattern 4: Direct match of the whole address
    matched = find_best_location_match(normalized, threshold=0.4)
    if matched:
        return matched
    
    return None


def get_governorate_from_location(location_name: Optional[str]) -> Optional[str]:
    """Get governorate name from a standardized location name."""
    if not location_name:
        return None
    return KUWAIT_LOCATIONS.get(location_name, {}).get("governorate")


def normalize_address(
    address_1: Optional[str] = None,
    address_2: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    postcode: Optional[str] = None,
    country: Optional[str] = None
) -> Dict[str, Optional[str]]:
    """
    Normalize all address components and extract governorate from all fields.
    
    Returns:
        Dictionary with normalized address fields and extracted governorate:
        {
            'address_1': normalized,
            'address_2': normalized,
            'city': normalized,
            'state': normalized,
            'postcode': normalized,
            'country': normalized,
            'standardized_city': canonical_city_name,
            'governorate': governorate_name (one of: Capital, Hawalli, Farwaniya, Ahmadi, Jahra, Mubarak Al-Kabeer)
        }
    """
    result = {
        'address_1': address_1.strip() if address_1 else None,
        'address_2': address_2.strip() if address_2 else None,
        'city': city.strip() if city else None,
        'state': state.strip() if state else None,
        'postcode': postcode.strip() if postcode else None,
        'country': country.strip() if country else None,
        'standardized_city': None,
        'governorate': None
    }
    
    # Priority 1: Try to match city first (this will check areas too)
    if result['city']:
        matched = find_best_location_match(result['city'], threshold=0.4)  # Lower threshold to catch more matches
        if matched:
            result['standardized_city'] = matched
            result['governorate'] = get_governorate_from_location(matched)
            return result
    
    # Priority 2: Try state
    if not result['governorate'] and result['state']:
        matched = find_best_location_match(result['state'], threshold=0.5)
        if matched:
            result['standardized_city'] = matched
            result['governorate'] = get_governorate_from_location(matched)
            return result
    
    # Priority 3: Parse address_1 for location
    if not result['governorate'] and address_1:
        extracted_location = extract_location_from_address(address_1)
        if extracted_location:
            result['standardized_city'] = extracted_location
            result['governorate'] = get_governorate_from_location(extracted_location)
            return result
    
    # Priority 4: Parse address_2 for location
    if not result['governorate'] and address_2:
        extracted_location = extract_location_from_address(address_2)
        if extracted_location:
            result['standardized_city'] = extracted_location
            result['governorate'] = get_governorate_from_location(extracted_location)
            return result
    
    # Priority 5: Try direct match on address_1 (for cases like "Block 7 street 12" with city in another field)
    if not result['governorate'] and address_1:
        # Normalize address_1 for matching
        normalized_addr1 = normalize_arabic_text(address_1) if any('\u0600' <= c <= '\u06FF' for c in address_1) else normalize_english_text(address_1)
        
        # Try matching any known location name (governorate names) in address_1
        for location_name in KUWAIT_LOCATIONS.keys():
            for arabic_name in KUWAIT_LOCATIONS[location_name].get("arabic", []):
                norm_ar = normalize_arabic_text(arabic_name)
                if norm_ar in normalized_addr1 or normalized_addr1 in norm_ar:
                    result['governorate'] = get_governorate_from_location(location_name)
                    result['standardized_city'] = location_name
                    return result
        
        # Try matching areas in address_1 (check all areas for all governorates)
        for location_name in KUWAIT_LOCATIONS.keys():
            # Check Arabic areas
            for area in KUWAIT_LOCATIONS[location_name].get("areas", []):
                norm_area = normalize_arabic_text(area)
                if norm_area in normalized_addr1 or normalized_addr1 in norm_area:
                    result['governorate'] = get_governorate_from_location(location_name)
                    result['standardized_city'] = location_name
                    return result
            
            # Check English area variations
            for area_var in KUWAIT_LOCATIONS[location_name].get("variations_areas", []):
                norm_area_var = normalize_english_text(area_var)
                if norm_area_var in normalized_addr1 or normalized_addr1 in norm_area_var:
                    result['governorate'] = get_governorate_from_location(location_name)
                    result['standardized_city'] = location_name
                    return result
    
    return result
