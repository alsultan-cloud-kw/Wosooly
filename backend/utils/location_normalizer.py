"""
Location Normalization Utility for Kuwait

This module provides functions to normalize and match location data
that may be entered in Arabic, English, or with spelling variations.
"""

import re
from typing import Optional, Dict, List, Tuple
from difflib import SequenceMatcher
import unicodedata

# ============================================================================
# 1. KUWAIT LOCATION DATABASE
# ============================================================================

# Standardized location names (English) with their Arabic equivalents and common variations
KUWAIT_LOCATIONS = {
    # Major Governorates
    "Kuwait City": {
        "arabic": ["الكويت", "مدينة الكويت", "الكويت العاصمة"],
        "variations": ["kuwait", "kuwait city", "al kuwayt", "al-kuwait", "kuwait capital"],
        "governorate": "Capital"
    },
    "Hawalli": {
        "arabic": ["حولي", "الحولي"],
        "variations": ["hawally", "hawalli", "hawali", "al hawalli"],
        "governorate": "Hawalli"
    },
    "Farwaniya": {
        "arabic": ["الفروانية", "فروانية"],
        "variations": ["farwaniya", "farwaniyah", "al farwaniya", "farwania"],
        "governorate": "Farwaniya"
    },
    "Ahmadi": {
        "arabic": ["الأحمدي", "أحمدي"],
        "variations": ["ahmadi", "ahmady", "al ahmadi", "ahmedi"],
        "governorate": "Ahmadi"
    },
    "Jahra": {
        "arabic": ["الجهراء", "جهراء"],
        "variations": ["jahra", "jahrah", "al jahra", "jahraa", "jihra"],
        "governorate": "Jahra"
    },
    "Mubarak Al-Kabeer": {
        "arabic": ["مبارك الكبير", "مبارك الكبير"],
        "variations": ["mubarak al kabeer", "mubarak alkabeer", "mubarak alkabir", "mubarak"],
        "governorate": "Mubarak Al-Kabeer"
    },
    
    # Popular Areas/Neighborhoods
    "Salmiya": {
        "arabic": ["السالمية", "سالمية"],
        "variations": ["salmiya", "salmiyah", "salmiyya", "al salmiya"],
        "governorate": "Hawalli"
    },
    "Mahboula": {
        "arabic": ["المهبولة", "مهبولة"],
        "variations": ["mahboula", "mahbula", "al mahboula", "mahboola"],
        "governorate": "Ahmadi"
    },
    "Fahaheel": {
        "arabic": ["الفحيحيل", "فحيحيل"],
        "variations": ["fahaheel", "fahahel", "al fahaheel", "fahahil"],
        "governorate": "Ahmadi"
    },
    "Jabriya": {
        "arabic": ["الجابرية", "جابرية"],
        "variations": ["jabriya", "jabriyah", "al jabriya", "jabria"],
        "governorate": "Hawalli"
    },
    "Salwa": {
        "arabic": ["السالمية", "سالمية"],
        "variations": ["salwa", "salwah", "al salwa"],
        "governorate": "Hawalli"
    },
    "Mangaf": {
        "arabic": ["منقف", "المنقف"],
        "variations": ["mangaf", "mangaaf", "al mangaf", "mangav"],
        "governorate": "Ahmadi"
    },
    "Sabah Al-Salem": {
        "arabic": ["صباح السالم", "صباح سالم"],
        "variations": ["sabah al salem", "sabah alsalem", "sabah salem", "sabah al-salem"],
        "governorate": "Mubarak Al-Kabeer"
    },
    "Rumaithiya": {
        "arabic": ["الرميثية", "رميثية"],
        "variations": ["rumaithiya", "rumaithiyah", "rumaithia", "al rumaithiya"],
        "governorate": "Hawalli"
    },
    "Surra": {
        "arabic": ["السرة", "سرة"],
        "variations": ["surra", "sura", "al surra", "surrah"],
        "governorate": "Hawalli"
    },
    "Bayan": {
        "arabic": ["بيان", "البيان"],
        "variations": ["bayan", "al bayan", "biyan"],
        "governorate": "Hawalli"
    },
    "Adan": {
        "arabic": ["عدان", "العدان"],
        "variations": ["adan", "al adan", "adhan"],
        "governorate": "Ahmadi"
    },
    "Abu Halifa": {
        "arabic": ["أبو حليفة", "ابو حليفة"],
        "variations": ["abu halifa", "abu halifah", "abu halyfa"],
        "governorate": "Ahmadi"
    },
    "Wafra": {
        "arabic": ["الوفرة", "وفرة"],
        "variations": ["wafra", "wafrah", "al wafra", "wafra farms"],
        "governorate": "Ahmadi"
    },
    "Kabad": {
        "arabic": ["كبد", "الكبد"],
        "variations": ["kabad", "kabed", "al kabad"],
        "governorate": "Ahmadi"
    },
    "Al Qusour": {
        "arabic": ["القصور", "قصور"],
        "variations": ["al qusour", "qusour", "al-qosour", "qosour", "al qusur"],
        "governorate": "Farwaniya"
    },
}

# ============================================================================
# 2. TEXT NORMALIZATION FUNCTIONS
# ============================================================================

def normalize_arabic_text(text: str) -> str:
    """
    Normalize Arabic text by:
    - Removing diacritics (tashkeel)
    - Normalizing Arabic characters (أ, إ, آ -> ا)
    - Removing extra whitespace
    """
    if not text:
        return ""
    
    # Remove diacritics (Arabic tashkeel)
    text = re.sub(r'[\u064B-\u065F\u0670]', '', text)
    
    # Normalize Arabic characters
    # أ, إ, آ -> ا
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    # ي -> ي (normalize different forms)
    text = text.replace('ى', 'ي')
    # ة -> ه
    text = text.replace('ة', 'ه')
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    return text.strip()


def normalize_english_text(text: str) -> str:
    """
    Normalize English text by:
    - Converting to lowercase
    - Removing special characters (keeping spaces and hyphens)
    - Normalizing whitespace
    """
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove special characters except spaces, hyphens, and alphanumeric
    text = re.sub(r'[^\w\s-]', '', text)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    # Remove leading/trailing hyphens
    text = text.strip('-').strip()
    
    return text


def detect_language(text: str) -> str:
    """
    Detect if text is primarily Arabic or English.
    Returns 'ar' for Arabic, 'en' for English, 'mixed' for mixed.
    """
    if not text:
        return 'en'
    
    # Check for Arabic characters (Unicode range: 0600-06FF)
    arabic_pattern = re.compile(r'[\u0600-\u06FF]')
    arabic_chars = len(arabic_pattern.findall(text))
    total_chars = len(re.findall(r'[a-zA-Z\u0600-\u06FF]', text))
    
    if total_chars == 0:
        return 'en'
    
    arabic_ratio = arabic_chars / total_chars if total_chars > 0 else 0
    
    if arabic_ratio > 0.5:
        return 'ar'
    elif arabic_ratio > 0.1:
        return 'mixed'
    else:
        return 'en'


def normalize_location_text(text: str) -> str:
    """
    Normalize location text regardless of language.
    """
    if not text:
        return ""
    
    lang = detect_language(text)
    
    if lang == 'ar' or lang == 'mixed':
        normalized = normalize_arabic_text(text)
    else:
        normalized = normalize_english_text(text)
    
    return normalized


# ============================================================================
# 3. FUZZY MATCHING FUNCTIONS
# ============================================================================

def similarity_ratio(str1: str, str2: str) -> float:
    """
    Calculate similarity ratio between two strings (0.0 to 1.0).
    Uses SequenceMatcher for fuzzy matching.
    """
    if not str1 or not str2:
        return 0.0
    
    # Normalize both strings
    norm1 = normalize_location_text(str1)
    norm2 = normalize_location_text(str2)
    
    if not norm1 or not norm2:
        return 0.0
    
    return SequenceMatcher(None, norm1, norm2).ratio()


def find_best_location_match(
    input_text: str,
    threshold: float = 0.7,
    max_results: int = 3
) -> List[Tuple[str, float, Dict]]:
    """
    Find the best matching location(s) for input text.
    
    Args:
        input_text: The location text to match (can be Arabic, English, or mixed)
        threshold: Minimum similarity score (0.0 to 1.0)
        max_results: Maximum number of results to return
    
    Returns:
        List of tuples: (standardized_name, similarity_score, location_info)
    """
    if not input_text:
        return []
    
    normalized_input = normalize_location_text(input_text)
    matches = []
    
    for standard_name, location_info in KUWAIT_LOCATIONS.items():
        scores = []
        
        # Check against English variations
        for variation in location_info.get("variations", []):
            norm_var = normalize_english_text(variation)
            score = similarity_ratio(normalized_input, norm_var)
            scores.append(score)
        
        # Check against Arabic names
        for arabic_name in location_info.get("arabic", []):
            norm_ar = normalize_arabic_text(arabic_name)
            score = similarity_ratio(normalized_input, norm_ar)
            scores.append(score)
        
        # Check against standard name
        norm_standard = normalize_english_text(standard_name)
        score = similarity_ratio(normalized_input, norm_standard)
        scores.append(score)
        
        # Get best score for this location
        best_score = max(scores) if scores else 0.0
        
        if best_score >= threshold:
            matches.append((standard_name, best_score, location_info))
    
    # Sort by score (descending)
    matches.sort(key=lambda x: x[1], reverse=True)
    
    return matches[:max_results]


def standardize_location(input_text: str, threshold: float = 0.7) -> Optional[str]:
    """
    Standardize a location name to the canonical form.
    
    Args:
        input_text: The location text to standardize
        threshold: Minimum similarity score to accept a match
    
    Returns:
        Standardized location name, or None if no good match found
    """
    matches = find_best_location_match(input_text, threshold=threshold, max_results=1)
    
    if matches:
        return matches[0][0]  # Return the standardized name
    
    return None


# ============================================================================
# 4. ADDRESS NORMALIZATION
# ============================================================================

def normalize_address(
    address_1: Optional[str] = None,
    address_2: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    postcode: Optional[str] = None,
    country: Optional[str] = None
) -> Dict[str, Optional[str]]:
    """
    Normalize all address components.
    
    Returns:
        Dictionary with normalized address fields:
        {
            'address_1': normalized,
            'address_2': normalized,
            'city': standardized_city_name,
            'state': standardized_state,
            'postcode': normalized_postcode,
            'country': normalized_country,
            'standardized_city': canonical_city_name,
            'governorate': governorate_name
        }
    """
    result = {
        'address_1': normalize_location_text(address_1) if address_1 else None,
        'address_2': normalize_location_text(address_2) if address_2 else None,
        'city': normalize_location_text(city) if city else None,
        'state': normalize_location_text(state) if state else None,
        'postcode': postcode.strip() if postcode else None,
        'country': normalize_english_text(country) if country else None,
        'standardized_city': None,
        'governorate': None
    }
    
    # Standardize city
    if result['city']:
        standardized = standardize_location(result['city'])
        if standardized:
            result['standardized_city'] = standardized
            result['governorate'] = KUWAIT_LOCATIONS.get(standardized, {}).get("governorate")
    
    # Also check state if city wasn't found
    if not result['standardized_city'] and result['state']:
        standardized = standardize_location(result['state'])
        if standardized:
            result['standardized_city'] = standardized
            result['governorate'] = KUWAIT_LOCATIONS.get(standardized, {}).get("governorate")
    
    # Normalize country (Kuwait variations)
    if result['country']:
        country_lower = result['country'].lower()
        if 'kuwait' in country_lower or country_lower in ['kw', 'kwt', 'kuwait']:
            result['country'] = 'Kuwait'
    
    return result


# ============================================================================
# 5. LOCATION MATCHING FOR DATABASE QUERIES
# ============================================================================

def build_location_filter(
    normalized_address: Dict[str, Optional[str]],
    fuzzy: bool = True,
    threshold: float = 0.7
) -> Dict[str, any]:
    """
    Build a filter dictionary for database queries.
    
    Args:
        normalized_address: Output from normalize_address()
        fuzzy: If True, include fuzzy matching options
        threshold: Similarity threshold for fuzzy matching
    
    Returns:
        Dictionary with filter criteria for SQLAlchemy queries
    """
    filters = {}
    
    # Exact match on standardized city
    if normalized_address.get('standardized_city'):
        filters['city_exact'] = normalized_address['standardized_city']
    
    # Fuzzy matching options (for use with LIKE or similarity functions)
    if fuzzy and normalized_address.get('city'):
        matches = find_best_location_match(
            normalized_address['city'],
            threshold=threshold,
            max_results=5
        )
        if matches:
            filters['city_fuzzy'] = [match[0] for match in matches]
    
    # Governorate filter
    if normalized_address.get('governorate'):
        filters['governorate'] = normalized_address['governorate']
    
    # Country filter
    if normalized_address.get('country'):
        filters['country'] = normalized_address['country']
    
    return filters


# ============================================================================
# 6. HELPER FUNCTIONS FOR DATABASE INTEGRATION
# ============================================================================

def get_location_search_terms(location_text: str) -> List[str]:
    """
    Get all possible search terms for a location (for database LIKE queries).
    """
    normalized = normalize_location_text(location_text)
    matches = find_best_location_match(normalized, threshold=0.6, max_results=5)
    
    search_terms = [normalized]
    
    for standard_name, score, location_info in matches:
        search_terms.append(standard_name)
        search_terms.extend(location_info.get("variations", []))
        search_terms.extend(location_info.get("arabic", []))
    
    # Remove duplicates while preserving order
    seen = set()
    unique_terms = []
    for term in search_terms:
        term_lower = term.lower()
        if term_lower not in seen:
            seen.add(term_lower)
            unique_terms.append(term)
    
    return unique_terms
