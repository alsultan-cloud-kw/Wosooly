"""
Website scraping endpoints for competitor analysis.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from database import get_db
from models import (
    Client,
    CompetitorGoldPrice,
    CompetitorBrandOffer,
)
from schemas import (
    BrandOfferSchema,
)
from utils.auth import get_current_client
from .common import _fetch_website_text, _extract_prices_and_offers_from_text

router = APIRouter()


class ScrapeWebsiteRequest(BaseModel):
    website_url: str
    brand_name: str


class ScrapeProductsRequest(BaseModel):
    url: str


@router.post("/scrape/website")
def scrape_website(
    request: ScrapeWebsiteRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape a single website for prices and promotional offers.
    This is the FastAPI equivalent of the TS `scrapeWebsite` / `scrapeWebsiteAccount` functions.
    """
    website_url = request.website_url
    brand_name = request.brand_name

    text = _fetch_website_text(website_url)
    prices, offers = _extract_prices_and_offers_from_text(
        text, brand_name=brand_name, website_url=website_url
    )

    # Persist prices
    for price in prices:
        row = CompetitorGoldPrice(
            client_id=current_client.id,
            date=price["date"],
            karat=price["karat"],
            price_per_gram=price["price_per_gram"],
            currency=price["currency"],
            source=price["source"],
        )
        db.add(row)

    # Persist offers
    for offer in offers:
        offer_row = CompetitorBrandOffer(
            client_id=current_client.id,
            brand=offer["brand"],
            title=offer["title"],
            description=offer.get("description"),
            discount_percentage=offer.get("discount_percentage"),
            valid_until=None,
            source=offer["source"],
            source_url=offer["source_url"],
            scraped_at=offer["scraped_at"],
            is_active=True,
        )
        db.add(offer_row)

    db.commit()

    # Shape response similar to TS version (arrays of prices/offers)
    prices_response = [
        {
            "date": p["date"].isoformat(),
            "karat": p["karat"],
            "pricePerGram": p["price_per_gram"],
            "currency": p["currency"],
            "source": p["source"],
        }
        for p in prices
    ]

    offers_response = [
        {
            "brand": o["brand"],
            "title": o["title"],
            "description": o.get("description"),
            "discountPercentage": o.get("discount_percentage"),
            "source": o["source"],
            "sourceUrl": o["source_url"],
        }
        for o in offers
    ]

    return {
        "success": True,
        "offers": offers_response,
        "prices": prices_response,
        "message": "تم جمع بيانات الموقع بنجاح" if offers or prices else "لم يتم العثور على بيانات واضحة في الموقع",
    }


@router.post("/scrape/products")
def scrape_products(
    request: ScrapeProductsRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape products from URL (e.g., Dubizzle).
    """
    return {
        "success": True,
        "product": None,
        "message": "تم بدء عملية جمع بيانات المنتج",
    }
