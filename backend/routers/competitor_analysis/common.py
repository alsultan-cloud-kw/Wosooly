"""
Common/Shared endpoints for competitor analysis.
Includes: Social Media Accounts, Gold Prices, Offers, Business Config, Website Accounts Management
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Body
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import re
import asyncio
import json
import requests
from bs4 import BeautifulSoup
from pyppeteer import launch
from pydantic import BaseModel

from database import get_db
from models import (
    Client,
    CompetitorSocialMediaAccount,
    CompetitorGoldPrice,
    CompetitorBrandOffer,
    CompetitorWebsiteAccount,
    CompetitorBusinessConfig,
    CompetitorAnalyzedImage,
    CompetitorDeepResearchResult,
    CompetitorOfferSuggestion,
)
from schemas import (
    SocialMediaAccountCreate,
    SocialMediaAccountSchema,
    InstagramProfileResponse,
    GoldPriceSchema,
    BrandOfferCreate,
    BrandOfferSchema,
    WebsiteAccountCreate,
    WebsiteAccountSchema,
    BusinessConfigCreate,
    BusinessConfigUpdate,
    BusinessConfigSchema,
    GenericResponse,
    AnalyzedImageSchema,
    DeepResearchResultSchema,
)
from utils.auth import get_current_client

router = APIRouter()

# ============================================
# Social Media Account Actions (unified for Instagram, TikTok, Snapchat)
# ============================================

@router.get("/social-media-accounts", response_model=List[SocialMediaAccountSchema])
def get_social_media_accounts(
    platform: Optional[str] = None,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
    active_only: bool = True,
):
    """
    Get all social media accounts for the current client.
    Can filter by platform (instagram, tiktok, snapchat).
    """
    query = db.query(CompetitorSocialMediaAccount).filter(
        CompetitorSocialMediaAccount.client_id == current_client.id
    )

    if platform:
        query = query.filter(CompetitorSocialMediaAccount.platform == platform)

    if active_only:
        query = query.filter(CompetitorSocialMediaAccount.is_active.is_(True))

    accounts = query.order_by(CompetitorSocialMediaAccount.created_at.desc()).all()
    return [SocialMediaAccountSchema.model_validate(acc) for acc in accounts]


@router.post("/social-media-accounts", response_model=InstagramProfileResponse)
def add_social_media_account(
    account: SocialMediaAccountCreate,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Add a social media account (Instagram, TikTok, or Snapchat) for the current client.
    """
    try:
        # Check if account already exists
        existing = (
            db.query(CompetitorSocialMediaAccount)
            .filter(
                CompetitorSocialMediaAccount.client_id == current_client.id,
                CompetitorSocialMediaAccount.username == account.username,
                CompetitorSocialMediaAccount.platform == account.platform,
            )
            .first()
        )

        if existing:
            # Update existing account
            existing.brand_name = account.brand_name
            existing.profile_url = account.profile_url
            existing.is_active = account.is_active
            db.commit()
            db.refresh(existing)
            return InstagramProfileResponse(
                success=True,
                message="تم تحديث الحساب بنجاح",
                data=SocialMediaAccountSchema.model_validate(existing),
            )

        # Create new account
        social_account = CompetitorSocialMediaAccount(
            client_id=current_client.id,
            username=account.username,
            brand_name=account.brand_name,
            platform=account.platform,
            profile_url=account.profile_url,
            is_active=account.is_active,
        )

        db.add(social_account)
        db.commit()
        db.refresh(social_account)

        return InstagramProfileResponse(
            success=True,
            message="تم إضافة الحساب بنجاح",
            data=SocialMediaAccountSchema.model_validate(social_account),
        )

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="الحساب موجود بالفعل",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل إضافة الحساب: {str(e)}",
        )


@router.delete("/social-media-accounts/{account_id}")
def delete_social_media_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete a social media account for the current client.
    """
    account = (
        db.query(CompetitorSocialMediaAccount)
        .filter(
            CompetitorSocialMediaAccount.id == account_id,
            CompetitorSocialMediaAccount.client_id == current_client.id,
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الحساب غير موجود",
        )

    db.delete(account)
    db.commit()
    return {"success": True, "message": "تم حذف الحساب بنجاح"}


@router.patch("/social-media-accounts/{account_id}/toggle")
def toggle_social_media_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Toggle active status of a social media account.
    """
    account = (
        db.query(CompetitorSocialMediaAccount)
        .filter(
            CompetitorSocialMediaAccount.id == account_id,
            CompetitorSocialMediaAccount.client_id == current_client.id,
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الحساب غير موجود",
        )

    account.is_active = not account.is_active
    db.commit()
    db.refresh(account)

    return {
        "success": True,
        "message": "تم تحديث حالة الحساب بنجاح",
        "data": SocialMediaAccountSchema.model_validate(account),
    }


# ============================================
# Gold Prices Endpoints
# ============================================

@router.get("/gold-prices/latest")
def get_latest_gold_prices(
    source: Optional[str] = None,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Return latest gold prices per (karat, source) for the current client.
    """
    VALID_KARATS = [18, 21, 22, 24]

    query = db.query(CompetitorGoldPrice).filter(
        CompetitorGoldPrice.client_id == current_client.id,
        CompetitorGoldPrice.karat.in_(VALID_KARATS),
    )

    if source:
        query = query.filter(CompetitorGoldPrice.source == source)

    rows = query.order_by(CompetitorGoldPrice.date.desc()).all()

    latest_by_key = {}
    for row in rows:
        key = (row.karat, row.source)
        if key not in latest_by_key:
            latest_by_key[key] = row

    data = [GoldPriceSchema.model_validate(r) for r in latest_by_key.values()]

    return {"success": True, "data": data}


@router.get("/gold-prices/trends")
def get_gold_price_trends(
    days: int = 30,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Get gold price trends for chart visualization.
    """
    VALID_KARATS = [18, 21, 22, 24]
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    results = (
        db.query(
            CompetitorGoldPrice.date,
            CompetitorGoldPrice.karat,
            func.avg(CompetitorGoldPrice.price_per_gram).label("avg_price"),
        )
        .filter(
            CompetitorGoldPrice.client_id == current_client.id,
            CompetitorGoldPrice.karat.in_(VALID_KARATS),
            CompetitorGoldPrice.date >= cutoff_date,
        )
        .group_by(CompetitorGoldPrice.date, CompetitorGoldPrice.karat)
        .order_by(CompetitorGoldPrice.date.asc(), CompetitorGoldPrice.karat.asc())
        .all()
    )

    trends_map = {}
    for row in results:
        date_str = row.date.strftime("%Y-%m-%d") if isinstance(row.date, datetime) else str(row.date)
        if date_str not in trends_map:
            trends_map[date_str] = {"date": date_str}
        trends_map[date_str][f"{row.karat}K"] = float(row.avg_price)

    data = list(trends_map.values())
    return {"success": True, "data": data}


@router.get("/gold-prices/history")
def get_gold_price_history(
    karat: int,
    days: int = 30,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Get price history for a specific karat.
    """
    VALID_KARATS = [18, 21, 22, 24]
    if karat not in VALID_KARATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid karat. Valid karats: {VALID_KARATS}",
        )

    cutoff_date = datetime.utcnow() - timedelta(days=days)
    prices = (
        db.query(CompetitorGoldPrice)
        .filter(
            CompetitorGoldPrice.client_id == current_client.id,
            CompetitorGoldPrice.karat == karat,
            CompetitorGoldPrice.date >= cutoff_date,
        )
        .order_by(CompetitorGoldPrice.date.desc(), CompetitorGoldPrice.source)
        .all()
    )

    data = [GoldPriceSchema.model_validate(p) for p in prices]
    return {"success": True, "data": data}


@router.post("/gold-prices/refresh")
def refresh_gold_prices(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Trigger gold price scraping (runs in background).
    """
    return {
        "success": True,
        "message": "تم بدء عملية جمع الأسعار. سيتم تحديث البيانات قريباً.",
    }


@router.post("/gold-prices/cleanup-invalid")
def cleanup_invalid_karats(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete invalid karat prices.
    """
    VALID_KARATS = [18, 21, 22, 24]
    deleted = (
        db.query(CompetitorGoldPrice)
        .filter(
            CompetitorGoldPrice.client_id == current_client.id,
            ~CompetitorGoldPrice.karat.in_(VALID_KARATS),
        )
        .delete()
    )
    db.commit()
    return {
        "success": True,
        "deletedCount": deleted,
        "message": f"تم حذف {deleted} سعر غير صحيح",
    }


# ============================================
# Brand Offers Endpoints
# ============================================

@router.get("/offers")
def get_offers(
    brand: Optional[str] = None,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Get active brand offers.
    """
    query = db.query(CompetitorBrandOffer).filter(
        CompetitorBrandOffer.client_id == current_client.id,
        CompetitorBrandOffer.is_active.is_(True),
    )

    if brand:
        query = query.filter(CompetitorBrandOffer.brand == brand)

    offers = query.order_by(CompetitorBrandOffer.scraped_at.desc()).all()
    data = [BrandOfferSchema.model_validate(o) for o in offers]
    return {"success": True, "data": data}


@router.post("/offers")
def add_offer(
    offer: BrandOfferCreate,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Add a brand offer.
    """
    brand_offer = CompetitorBrandOffer(
        client_id=current_client.id,
        brand=offer.brand,
        title=offer.title,
        description=offer.description,
        discount_percentage=offer.discount_percentage,
        valid_until=offer.valid_until,
        source=offer.source,
        source_url=offer.source_url,
        is_active=True,
    )
    db.add(brand_offer)
    db.commit()
    db.refresh(brand_offer)
    return {"success": True, "message": "تم إضافة العرض بنجاح"}


@router.post("/offers/cleanup-expired")
def cleanup_expired_offers(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Deactivate expired offers.
    """
    now = datetime.utcnow()
    updated = (
        db.query(CompetitorBrandOffer)
        .filter(
            CompetitorBrandOffer.client_id == current_client.id,
            CompetitorBrandOffer.valid_until.isnot(None),
            CompetitorBrandOffer.valid_until < now,
            CompetitorBrandOffer.is_active.is_(True),
        )
        .update({"is_active": False})
    )
    db.commit()
    return {"success": True, "message": f"تم تحديث {updated} عرض منتهي الصلاحية"}


@router.delete("/offers/all")
def delete_all_offers(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete all offers for the current client.
    """
    deleted = (
        db.query(CompetitorBrandOffer)
        .filter(CompetitorBrandOffer.client_id == current_client.id)
        .delete()
    )
    db.commit()
    return {
        "success": True,
        "deletedCount": deleted,
        "message": f"تم حذف {deleted} عرض ترويجي",
    }


@router.delete("/offers/by-source/{source}")
def delete_offers_by_source(
    source: str,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete offers by source.
    """
    deleted = (
        db.query(CompetitorBrandOffer)
        .filter(
            CompetitorBrandOffer.client_id == current_client.id,
            CompetitorBrandOffer.source == source,
        )
        .delete()
    )
    db.commit()
    return {
        "success": True,
        "deletedCount": deleted,
        "message": f"تم حذف {deleted} عرض ترويجي من {source}",
    }


@router.delete("/offers/by-pattern")
def delete_offers_by_pattern(
    pattern: str,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete offers by source URL pattern.
    """
    deleted = (
        db.query(CompetitorBrandOffer)
        .filter(
            CompetitorBrandOffer.client_id == current_client.id,
            CompetitorBrandOffer.source_url.like(f"%{pattern}%"),
        )
        .delete()
    )
    db.commit()
    return {
        "success": True,
        "deletedCount": deleted,
        "message": f"تم حذف {deleted} عرض ترويجي",
    }


# ============================================
# Website Account Endpoints
# ============================================

@router.get("/website-accounts", response_model=List[WebsiteAccountSchema])
def get_website_accounts(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
    active_only: bool = True,
):
    """
    Get website accounts.
    """
    query = db.query(CompetitorWebsiteAccount).filter(
        CompetitorWebsiteAccount.client_id == current_client.id
    )

    if category:
        query = query.filter(CompetitorWebsiteAccount.category == category)

    if active_only:
        query = query.filter(CompetitorWebsiteAccount.is_active.is_(True))

    accounts = query.order_by(CompetitorWebsiteAccount.created_at.desc()).all()
    return [WebsiteAccountSchema.model_validate(acc) for acc in accounts]


@router.post("/website-accounts", response_model=GenericResponse)
def add_website_account(
    website: WebsiteAccountCreate,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Add a website account.
    """
    try:
        existing = (
            db.query(CompetitorWebsiteAccount)
            .filter(
                CompetitorWebsiteAccount.client_id == current_client.id,
                CompetitorWebsiteAccount.website_url == website.website_url,
            )
            .first()
        )

        if existing:
            existing.brand_name = website.brand_name
            existing.category = website.category
            existing.description = website.description
            existing.is_active = website.is_active
            db.commit()
            db.refresh(existing)
            return GenericResponse(
                success=True,
                message="تم تحديث الموقع بنجاح",
                data=WebsiteAccountSchema.model_validate(existing),
            )

        account = CompetitorWebsiteAccount(
            client_id=current_client.id,
            website_url=website.website_url,
            brand_name=website.brand_name,
            category=website.category,
            description=website.description,
            is_active=website.is_active,
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        return GenericResponse(
            success=True,
            message="تم إضافة الموقع بنجاح",
            data=WebsiteAccountSchema.model_validate(account),
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="الموقع موجود بالفعل",
        )


@router.delete("/website-accounts/{account_id}")
def delete_website_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete a website account.
    """
    account = (
        db.query(CompetitorWebsiteAccount)
        .filter(
            CompetitorWebsiteAccount.id == account_id,
            CompetitorWebsiteAccount.client_id == current_client.id,
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الموقع غير موجود",
        )

    db.delete(account)
    db.commit()
    return {"success": True, "message": "تم حذف الموقع بنجاح"}


@router.patch("/website-accounts/{account_id}/toggle")
def toggle_website_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Toggle active status of a website account.
    """
    account = (
        db.query(CompetitorWebsiteAccount)
        .filter(
            CompetitorWebsiteAccount.id == account_id,
            CompetitorWebsiteAccount.client_id == current_client.id,
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الموقع غير موجود",
        )

    account.is_active = not account.is_active
    db.commit()
    db.refresh(account)
    return {
        "success": True,
        "message": "تم تحديث حالة الموقع بنجاح",
        "data": WebsiteAccountSchema.model_validate(account),
    }


# ============================================
# Business Config Endpoints
# ============================================

@router.get("/business-config/active")
def get_active_business_config(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Get active business configuration.
    """
    config = (
        db.query(CompetitorBusinessConfig)
        .filter(
            CompetitorBusinessConfig.client_id == current_client.id,
            CompetitorBusinessConfig.is_active.is_(True),
        )
        .first()
    )

    if not config:
        return {"success": False, "data": None, "message": "لا يوجد إعدادات نشطة"}

    return {
        "success": True,
        "data": BusinessConfigSchema.model_validate(config),
    }


@router.get("/business-config")
def get_all_business_configs(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Get all business configurations.
    """
    configs = (
        db.query(CompetitorBusinessConfig)
        .filter(CompetitorBusinessConfig.client_id == current_client.id)
        .order_by(CompetitorBusinessConfig.created_at.desc())
        .all()
    )
    data = [BusinessConfigSchema.model_validate(c) for c in configs]
    return {"success": True, "data": data}


@router.post("/business-config/set-active")
def set_active_business(
    business_type: str,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Set active business type (deactivates others).
    """
    # Deactivate all
    db.query(CompetitorBusinessConfig).filter(
        CompetitorBusinessConfig.client_id == current_client.id
    ).update({"is_active": False})

    # Activate the specified one
    config = (
        db.query(CompetitorBusinessConfig)
        .filter(
            CompetitorBusinessConfig.client_id == current_client.id,
            CompetitorBusinessConfig.business_type == business_type,
        )
        .first()
    )

    if config:
        config.is_active = True
        db.commit()
        return {"success": True, "message": f"تم تفعيل نوع العمل: {business_type}"}
    else:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"نوع العمل {business_type} غير موجود",
        )


@router.post("/business-config")
def create_business_config(
    config: BusinessConfigCreate,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Create a new business configuration.
    """
    try:
        business_config = CompetitorBusinessConfig(
            client_id=current_client.id,
            business_type=config.business_type,
            keywords=config.keywords,
            price_keywords=config.price_keywords,
            offer_keywords=config.offer_keywords,
            is_active=config.is_active,
        )
        db.add(business_config)
        db.commit()
        db.refresh(business_config)
        return {
            "success": True,
            "data": BusinessConfigSchema.model_validate(business_config),
            "message": "تم إنشاء إعدادات العمل بنجاح",
        }
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="إعدادات العمل موجودة بالفعل",
        )


@router.put("/business-config/{config_id}")
def update_business_config(
    config_id: int,
    config: BusinessConfigUpdate,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Update business configuration.
    """
    business_config = (
        db.query(CompetitorBusinessConfig)
        .filter(
            CompetitorBusinessConfig.id == config_id,
            CompetitorBusinessConfig.client_id == current_client.id,
        )
        .first()
    )

    if not business_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="إعدادات العمل غير موجودة",
        )

    if config.keywords is not None:
        business_config.keywords = config.keywords
    if config.price_keywords is not None:
        business_config.price_keywords = config.price_keywords
    if config.offer_keywords is not None:
        business_config.offer_keywords = config.offer_keywords
    if config.is_active is not None:
        business_config.is_active = config.is_active

    business_config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(business_config)
    return {
        "success": True,
        "message": "تم تحديث إعدادات العمل بنجاح",
    }


@router.get("/business-config/keywords")
def get_business_keywords(
    business_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Get business keywords as arrays.
    """
    if business_type:
        config = (
            db.query(CompetitorBusinessConfig)
            .filter(
                CompetitorBusinessConfig.client_id == current_client.id,
                CompetitorBusinessConfig.business_type == business_type,
            )
            .first()
        )
    else:
        config = (
            db.query(CompetitorBusinessConfig)
            .filter(
                CompetitorBusinessConfig.client_id == current_client.id,
                CompetitorBusinessConfig.is_active.is_(True),
            )
            .first()
        )

    if not config:
        return {
            "success": True,
            "data": {
                "keywords": [],
                "priceKeywords": [],
                "offerKeywords": [],
            },
        }

    return {
        "success": True,
        "data": {
            "keywords": [k.strip() for k in config.keywords.split(",") if k.strip()],
            "priceKeywords": (
                [k.strip() for k in config.price_keywords.split(",") if k.strip()]
                if config.price_keywords
                else []
            ),
            "offerKeywords": (
                [k.strip() for k in config.offer_keywords.split(",") if k.strip()]
                if config.offer_keywords
                else []
            ),
        },
    }


# ============================================
# Scraping Endpoints (Background Tasks)
# ============================================

@router.post("/scrape/gold-prices")
def scrape_gold_prices(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Trigger gold price scraping.
    TODO: Implement actual scraping logic.
    """
    return {
        "success": True,
        "prices": [],
        "message": "تم بدء عملية جمع أسعار الذهب",
    }


class ScrapeBrandWebsitesRequest(BaseModel):
    """
    Optional filter when scraping all websites.
    Mirrors the `category?: "local" | "international"` argument from the TS version.
    """
    category: Optional[str] = None


@router.post("/scrape/brand-websites")
def scrape_brand_websites(
    request: Optional[ScrapeBrandWebsitesRequest] = Body(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape all active brand websites for the current client.
    This is the FastAPI equivalent of the TS `scrapeAllWebsiteAccounts` function.
    """
    category = request.category if request else None

    query = db.query(CompetitorWebsiteAccount).filter(
        CompetitorWebsiteAccount.client_id == current_client.id,
        CompetitorWebsiteAccount.is_active.is_(True),
    )

    if category:
        query = query.filter(CompetitorWebsiteAccount.category == category)

    websites = query.order_by(CompetitorWebsiteAccount.created_at.desc()).all()

    if not websites:
        return {
            "success": False,
            "totalPrices": 0,
            "totalOffers": 0,
            "message": (
                "لا توجد مواقع نشطة في قاعدة البيانات"
                if not category
                else f"لا توجد مواقع { 'محلية' if category == 'local' else 'دولية' } نشطة"
            ),
        }

    total_prices = 0
    total_offers = 0
    errors: List[str] = []

    for website in websites:
        try:
            text = _fetch_website_text(website.website_url)
            prices, offers = _extract_prices_and_offers_from_text(
                text,
                brand_name=website.brand_name,
                website_url=website.website_url,
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

            total_prices += len(prices)
            total_offers += len(offers)
        except Exception as exc:
            db.rollback()
            errors.append(f"{website.brand_name}: {exc}")

    message_parts = [
        f"تم جمع {total_prices} سعر و {total_offers} عرض من {len(websites)} موقع."
    ]
    if errors:
        message_parts.append(f"أخطاء: {', '.join(errors)}")

    return {
        "success": total_prices > 0 or total_offers > 0,
        "totalPrices": total_prices,
        "totalOffers": total_offers,
        "message": " ".join(message_parts),
    }


# ============================================
# Website Helper Functions
# ============================================

async def _pyppeteer_get_html(website_url: str) -> str:
    """
    Use pyppeteer (Python port of Puppeteer) to render the page and return HTML.
    This is closer to the original TS puppeteer logic.
    """
    browser = None
    try:
        browser = await launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ],
        )
        page = await browser.newPage()
        await page.setViewport({"width": 1920, "height": 1080})
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
        await page.setExtraHTTPHeaders(
            {
                "Accept-Language": "ar-KW,ar;q=0.9,en;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            }
        )
        print(f"[Website Scraper] Navigating to: {website_url}")
        await page.goto(website_url, {"waitUntil": "domcontentloaded", "timeout": 60000})
        await asyncio.sleep(3)
        html = await page.content()
        return html or ""
    except Exception as exc:
        print(f"[Website Scraper] pyppeteer error for {website_url}: {exc}")
        return ""
    finally:
        if browser is not None:
            try:
                await browser.close()
            except Exception:
                pass


def _fetch_website_text(website_url: str) -> str:
    """
    Fetch raw text content from a website.

    1) Try pyppeteer (headless Chromium, JS executed) to get rendered HTML.
    2) If that fails, fall back to requests + BeautifulSoup.
    """
    html = ""

    # --- Step 1: Try pyppeteer for full JS-rendered HTML ---
    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            html = loop.run_until_complete(_pyppeteer_get_html(website_url))
        else:
            html = asyncio.run(_pyppeteer_get_html(website_url))
    except Exception as exc:
        print(f"[Website Scraper] Failed to use pyppeteer for {website_url}: {exc}")
        html = ""

    # --- Step 2: Fallback to simple requests if pyppeteer failed ---
    if not html:
        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept-Language": "ar-KW,ar;q=0.9,en;q=0.8",
            }
            resp = requests.get(website_url, headers=headers, timeout=20)
            resp.raise_for_status()
            html = resp.text
        except Exception as exc:
            print(f"[Website Scraper] Error fetching {website_url}: {exc}")
            return ""

    # --- Step 3: Extract clean text from HTML ---
    try:
        soup = BeautifulSoup(html, "html.parser")

        # Remove script/style/noscript tags
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        text = soup.get_text(separator="\n")
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)
        return text.strip()
    except Exception as exc:
        print(f"[Website Scraper] Error parsing HTML for {website_url}: {exc}")
        return ""


def _extract_prices_and_offers_from_text(
    text: str, brand_name: str, website_url: str
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Lightweight heuristic extraction, inspired by the fallback logic
    in the original TS `parseAIResponse` implementation.

    - Prices: looks for KWD/KD/دينار patterns with karat (18/21/22/24)
    - Offers: looks for Arabic/English promo keywords and '%' discounts
    """
    prices: List[Dict[str, Any]] = []
    offers: List[Dict[str, Any]] = []

    if not text:
        return prices, offers

    today = datetime.utcnow()

    # --- Extract gold prices (heuristic) ---
    price_patterns = [
        re.compile(
            r"(\d+)\s*[Kk][^\d]{0,20}?(\d+\.?\d*)\s*(?:KWD|KD|د\.ك|دينار)",
            re.IGNORECASE,
        ),
        re.compile(
            r"(\d+\.?\d*)\s*(?:KWD|KD|د\.ك|دينار)[^\d]{0,20}?(\d+)\s*[Kk]",
            re.IGNORECASE,
        ),
    ]

    VALID_KARATS = [18, 21, 22, 24]

    for pattern in price_patterns:
        for match in pattern.finditer(text):
            try:
                karat = int(match.group(1))
                price_value = float(match.group(2))
            except (ValueError, TypeError):
                continue

            if karat not in VALID_KARATS:
                continue

            # Basic sanity range to avoid garbage
            if not (10 <= price_value <= 200):
                continue

            if not any(p["karat"] == karat for p in prices):
                prices.append(
                    {
                        "date": today,
                        "karat": karat,
                        "price_per_gram": price_value,
                        "currency": "KWD",
                        "source": brand_name,
                    }
                )

    # --- Extract offers (heuristic) ---
    offer_keywords = re.compile(
        r"(عرض|خصم|تخفيض|promo|sale|discount|offer)", re.IGNORECASE
    )

    # Split into pseudo-lines for easier scanning
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    for idx, line in enumerate(lines):
        if len(line) < 20:
            continue

        if not (offer_keywords.search(line) or "%" in line):
            continue

        discount_match = re.search(
            r"(\d+)\s*%?\s*(?:off|خصم|تخفيض|discount)", line, re.IGNORECASE
        )
        discount_value = None
        if discount_match:
            try:
                discount_value = float(discount_match.group(1))
            except (ValueError, TypeError):
                discount_value = None

        title = line[:120]

        # Combine a few surrounding lines as description (context)
        start = max(0, idx - 2)
        end = min(len(lines), idx + 3)
        description = " ".join(lines[start:end])[:1000]

        offers.append(
            {
                "brand": brand_name,
                "title": title,
                "description": description,
                "discount_percentage": discount_value,
                "source": "website",
                "source_url": website_url,
                "scraped_at": today,
            }
        )

    # If we still have nothing but text is long, create a generic "summary" offer
    if not offers and len(text) > 200:
        summary = text[:1500]
        offers.append(
            {
                "brand": brand_name,
                "title": f"بيانات من {brand_name}",
                "description": summary,
                "discount_percentage": None,
                "source": "website",
                "source_url": website_url,
                "scraped_at": today,
            }
        )

    return prices, offers


# ============================================
# Analyzed Images Endpoints
# ============================================

@router.get("/analyzed-images")
def get_analyzed_images(
    source: Optional[str] = None,
    brand_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Get analyzed images for the current client.
    Can filter by source (snapchat, instagram, etc.) and brand_name.
    Returns: { success: bool, data: AnalyzedImageSchema[] }
    """
    query = db.query(CompetitorAnalyzedImage).filter(
        CompetitorAnalyzedImage.client_id == current_client.id
    )
    
    if source:
        query = query.filter(CompetitorAnalyzedImage.source == source)
    
    if brand_name:
        query = query.filter(CompetitorAnalyzedImage.brand_name == brand_name)
    
    images = query.order_by(CompetitorAnalyzedImage.created_at.desc()).all()
    
    # Convert images to schema, handling extracted_info if it's a string
    result_data = []
    for img in images:
        # Handle extracted_info if it's stored as a string (backward compatibility)
        if isinstance(img.extracted_info, str):
            try:
                img.extracted_info = json.loads(img.extracted_info)
            except (json.JSONDecodeError, TypeError):
                img.extracted_info = None
        
        result_data.append(AnalyzedImageSchema.model_validate(img))
    
    return {"success": True, "data": result_data}


@router.delete("/analyzed-images")
def delete_analyzed_images(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete all analyzed images for the current client.
    Returns: { success: bool, deletedCount: int, message: str }
    """
    deleted = (
        db.query(CompetitorAnalyzedImage)
        .filter(CompetitorAnalyzedImage.client_id == current_client.id)
        .delete()
    )
    db.commit()
    return {
        "success": True,
        "deletedCount": deleted,
        "message": f"تم حذف {deleted} صورة محللة",
    }


# ============================================
# Deep Research Endpoints
# ============================================

class DeepResearchRequest(BaseModel):
    brandName: str
    context: Optional[str] = None


def _perform_google_research(brand_name: str, context: Optional[str] = None) -> Dict[str, Any]:
    """
    Perform deep research on a brand using Google Gemini API with search grounding.
    Equivalent to the TypeScript researchBrand function.
    """
    import os
    
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables")
    
    # Create research prompt focused on recent social media posts and website content
    if context and context.strip():
        base_prompt = f'ابحث عن أحدث المنشورات والمعلومات عن العلامة التجارية "{brand_name}" في سوق الذهب الكويتي. {context}\n\nيرجى البحث عن:\n1. أحدث المنشورات على إنستجرام و فيسبوك وتويتر خلال آخر 30 يوم\n2. العروض الترويجية الحالية والخصومات المعلنة حديثاً\n3. أسعار الذهب المحدثة (18K, 21K, 22K, 24K)\n4. أي أخبار أو أحداث حديثة متعلقة بالعلامة التجارية\n5. المنشورات على الصفحة الأولى من الموقع الإلكتروني\n\nيرجى التركيز على المعلومات الحديثة فقط.'
    else:
        base_prompt = f'ابحث عن أحدث المنشورات والمعلومات عن العلامة التجارية "{brand_name}" في سوق الذهب الكويتي.\n\nيرجى البحث عن:\n1. أحدث المنشورات على إنستجرام و فيسبوك وتويتر خلال آخر 30 يوم\n2. العروض الترويجية الحالية والخصومات المعلنة حديثاً\n3. أسعار الذهب المحدثة (18K, 21K, 22K, 24K)\n4. أي أخبار أو أحداث حديثة متعلقة بالعلامة التجارية\n5. المنشورات على الصفحة الأولى من الموقع الإلكتروني\n\nيرجى التركيز على المعلومات الحديثة فقط.'
    
    try:
        # Use Gemini REST API with search grounding
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={google_api_key}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": base_prompt
                }]
            }],
            "tools": [{
                "googleSearch": {}
            }],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 8192,
            }
        }
        
        response = requests.post(api_url, json=payload, timeout=60)
        response.raise_for_status()
        result = response.json()
        
        # Extract text from response
        text = ""
        citations = []
        search_queries = []
        
        if "candidates" in result and len(result["candidates"]) > 0:
            candidate = result["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                for part in candidate["content"]["parts"]:
                    if "text" in part:
                        text += part["text"]
            
            # Extract citations from grounding metadata
            if "groundingMetadata" in candidate:
                grounding_metadata = candidate["groundingMetadata"]
                
                # Extract search queries
                if "webSearchQueries" in grounding_metadata:
                    search_queries = grounding_metadata["webSearchQueries"]
                
                # Extract citations
                if "groundingChunks" in grounding_metadata:
                    for chunk in grounding_metadata["groundingChunks"]:
                        if "web" in chunk:
                            citations.append({
                                "title": chunk["web"].get("title", "Unknown"),
                                "uri": chunk["web"].get("uri", "")
                            })
        
        if not text:
            raise ValueError("No text generated from Gemini API")
        
        return {
            "success": True,
            "result": text,
            "status": "completed",
            "citations": citations,
            "search_queries": search_queries,
        }
    except Exception as e:
        print(f"[Deep Research] Error in Google research: {e}")
        # Fallback to standard generation without grounding
        try:
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={google_api_key}"
            
            payload = {
                "contents": [{
                    "parts": [{
                        "text": base_prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 8192,
                }
            }
            
            response = requests.post(api_url, json=payload, timeout=60)
            response.raise_for_status()
            result = response.json()
            
            text = ""
            if "candidates" in result and len(result["candidates"]) > 0:
                candidate = result["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    for part in candidate["content"]["parts"]:
                        if "text" in part:
                            text += part["text"]
            
            if not text:
                raise ValueError("No text generated from Gemini API")
            
            return {
                "success": True,
                "result": text,
                "status": "completed",
            }
        except Exception as fallback_error:
            print(f"[Deep Research] Fallback also failed: {fallback_error}")
            return {
                "success": False,
                "error": str(fallback_error),
            }


def _extract_brand_info(research_text: str) -> Dict[str, Any]:
    """
    Extract structured information from research result.
    Equivalent to the TypeScript extractBrandInfo function.
    """
    info = {}
    
    # Extract offers (look for promotional keywords)
    offer_patterns = [
        re.compile(r"عرض[:\s]+([^\n]+)", re.IGNORECASE),
        re.compile(r"خصم[:\s]+([^\n]+)", re.IGNORECASE),
        re.compile(r"تخفيض[:\s]+([^\n]+)", re.IGNORECASE),
        re.compile(r"promo[:\s]+([^\n]+)", re.IGNORECASE),
        re.compile(r"sale[:\s]+([^\n]+)", re.IGNORECASE),
    ]
    
    offers = []
    for pattern in offer_patterns:
        matches = pattern.findall(research_text)
        for match in matches:
            if match and match.strip():
                offers.append(match.strip())
    
    if offers:
        info["offers"] = offers
    
    # Extract prices
    price_patterns = [
        re.compile(r"(\d+)\s*[Kk][\s:]+(\d+\.?\d*)\s*(?:KWD|KD|د\.ك)", re.IGNORECASE),
        re.compile(r"(\d+\.?\d*)\s*(?:KWD|KD|د\.ك)[\s:]+(\d+)\s*[Kk]", re.IGNORECASE),
    ]
    
    prices = []
    for pattern in price_patterns:
        matches = pattern.findall(research_text)
        for match in matches:
            try:
                karat = int(match[0] if match[0].isdigit() else match[1])
                price = float(match[1] if match[0].isdigit() else match[0])
                if karat in [18, 21, 22, 24] and price > 0:
                    prices.append({"karat": karat, "price": price})
            except (ValueError, IndexError):
                continue
    
    if prices:
        info["prices"] = prices
    
    # Extract social media
    social_patterns = [
        re.compile(r"instagram[:\s]+([^\s\n]+)", re.IGNORECASE),
        re.compile(r"facebook[:\s]+([^\s\n]+)", re.IGNORECASE),
        re.compile(r"twitter[:\s]+([^\s\n]+)", re.IGNORECASE),
        re.compile(r"إنستجرام[:\s]+([^\s\n]+)", re.IGNORECASE),
        re.compile(r"فيسبوك[:\s]+([^\s\n]+)", re.IGNORECASE),
    ]
    
    social_media = []
    for pattern in social_patterns:
        matches = pattern.findall(research_text)
        for match in matches:
            url = match.strip()
            if "instagram" in url.lower():
                social_media.append({"platform": "instagram", "url": url})
            elif "facebook" in url.lower():
                social_media.append({"platform": "facebook", "url": url})
            elif "twitter" in url.lower():
                social_media.append({"platform": "twitter", "url": url})
    
    if social_media:
        info["socialMedia"] = social_media
    
    # Extract website
    website_match = re.search(r"(https?://[^\s\n]+)", research_text, re.IGNORECASE)
    if website_match:
        info["website"] = website_match.group(1)
    
    return info


@router.post("/deep-research")
def perform_deep_research(
    request: DeepResearchRequest,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Perform deep research on a brand and save results.
    Equivalent to the TypeScript researchBrandAndSave function.
    """
    try:
        # Perform research
        research_result = _perform_google_research(request.brandName, request.context)
        
        if not research_result.get("success") or not research_result.get("result"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=research_result.get("error", "فشل البحث"),
            )
        
        # Extract structured information
        extracted_info = _extract_brand_info(research_result["result"])
        
        # Save to database
        research_record = CompetitorDeepResearchResult(
            client_id=current_client.id,
            brand_name=request.brandName,
            research_query=request.context or f"بحث عن {request.brandName}",
            research_result=research_result["result"],
            extracted_info=extracted_info,
            citations=research_result.get("citations", []),
            search_queries=research_result.get("search_queries", []),
            interaction_id=research_result.get("interactionId"),
            status=research_result.get("status", "completed"),
        )
        db.add(research_record)
        db.commit()
        db.refresh(research_record)
        
        # If offers found, save them
        if extracted_info.get("offers"):
            for offer_text in extracted_info["offers"]:
                # Check if offer already exists
                existing = (
                    db.query(CompetitorBrandOffer)
                    .filter(
                        CompetitorBrandOffer.client_id == current_client.id,
                        CompetitorBrandOffer.brand == request.brandName,
                        CompetitorBrandOffer.title == offer_text[:200],
                        CompetitorBrandOffer.source == "deep-research",
                    )
                    .first()
                )
                
                if not existing:
                    offer = CompetitorBrandOffer(
                        client_id=current_client.id,
                        brand=request.brandName,
                        title=offer_text[:200],
                        description=offer_text,
                        source="deep-research",
                        source_url=extracted_info.get("website") or f"https://www.google.com/search?q={request.brandName}",
                        scraped_at=datetime.utcnow(),
                        is_active=True,
                    )
                    db.add(offer)
        
        db.commit()
        
        return {
            "success": True,
            "message": f"تم البحث عن {request.brandName} بنجاح",
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[Deep Research] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"خطأ: {str(e)}",
        )


@router.get("/deep-research")
def get_deep_research_results(
    brand_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Get all deep research results for the current client.
    Can filter by brand_name.
    Equivalent to the TypeScript getResearchResults function.
    Returns: { success: bool, data: DeepResearchResultSchema[] }
    """
    try:
        query = db.query(CompetitorDeepResearchResult).filter(
            CompetitorDeepResearchResult.client_id == current_client.id
        )
        
        if brand_name:
            query = query.filter(CompetitorDeepResearchResult.brand_name == brand_name)
        
        results = query.order_by(CompetitorDeepResearchResult.created_at.desc()).all()
        
        # Convert to schema format
        data = [DeepResearchResultSchema.model_validate(result) for result in results]
        
        return {
            "success": True,
            "data": data,
        }
    except Exception as e:
        print(f"[Deep Research] Error fetching results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل جلب النتائج",
        )


@router.delete("/deep-research")
def delete_all_deep_research_results(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete all deep research results for the current client.
    Equivalent to the TypeScript deleteAllResearchResults function.
    """
    try:
        deleted = (
            db.query(CompetitorDeepResearchResult)
            .filter(CompetitorDeepResearchResult.client_id == current_client.id)
            .delete()
        )
        db.commit()
        
        return {
            "success": True,
            "message": f"تم حذف {deleted} نتيجة بحث",
            "deletedCount": deleted,
        }
    except Exception as e:
        db.rollback()
        print(f"[Deep Research] Error deleting results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"خطأ: {str(e)}",
        )


# ============================================
# Offer Suggestions Endpoints
# ============================================

def _get_kuwait_seasons(month: int) -> Dict[str, str]:
    """Get Kuwait-specific seasons."""
    if 3 <= month <= 5:
        return {"season": "ربيع", "description": "موسم الزواج والمناسبات"}
    elif 6 <= month <= 8:
        return {"season": "صيف", "description": "موسم العطلات والسفر"}
    elif 9 <= month <= 11:
        return {"season": "خريف", "description": "موسم العودة للمدارس والمناسبات"}
    else:
        return {"season": "شتاء", "description": "موسم الأعياد والاحتفالات"}


def _get_upcoming_kuwait_events(month: int, date: int) -> List[str]:
    """Get upcoming Kuwait events and holidays."""
    events = []
    
    # National holidays
    if month == 2 and date >= 25:
        events.append("اليوم الوطني الكويتي")
    if month == 2 and date >= 26:
        events.append("عيد التحرير")
    
    # Religious holidays (approximate)
    if month in [6, 7]:
        events.append("رمضان")
    if month in [7, 8]:
        events.append("عيد الفطر")
    if month in [9, 10]:
        events.append("عيد الأضحى")
    
    # Seasonal events
    if month in [5, 6]:
        events.append("موسم الزواج")
    if month in [12, 1]:
        events.append("أعياد نهاية السنة")
    
    # Back to school
    if month == 9:
        events.append("العودة للمدارس")
    
    return events


def _parse_suggestions(text: str) -> List[Dict[str, Any]]:
    """Parse suggestions from AI response."""
    suggestions = []
    
    # Try to find all 5 suggestions
    section_patterns = [
        r'\*\*الاقتراح\s*#(\d+)\*\*',
        r'الاقتراح\s*#(\d+)',
        r'(?:اقتراح|Suggestion|#)\s*(\d+)',
        r'(\d+)\.\s*الاقتراح',
    ]
    
    all_matches = []
    for pattern in section_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            num = int(match.group(1) if match.lastindex else match.group(0).split('#')[-1].split('.')[0])
            if 1 <= num <= 5:
                all_matches.append({"index": match.start(), "number": num})
    
    # Sort by number and index
    all_matches.sort(key=lambda x: (x["number"], x["index"]))
    
    # Remove duplicates
    unique_matches = []
    seen_numbers = set()
    for match in all_matches:
        if match["number"] not in seen_numbers:
            seen_numbers.add(match["number"])
            unique_matches.append(match)
    
    # Extract sections
    sections = []
    if unique_matches:
        for i in range(len(unique_matches)):
            start = unique_matches[i]["index"]
            end = unique_matches[i + 1]["index"] if i < len(unique_matches) - 1 else len(text)
            section = text[start:end]
            if len(section) > 50:
                sections.append(section)
    
    # Parse each section
    for section in sections:
        suggestion = {}
        
        # Extract title
        title_patterns = [
            r'(?:العنوان|Title)[:：]\s*(.+?)(?:\n|$)',
            r'^\*\*([^*]+)\*\*',
            r'^(.+?)(?:\n|$)',
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, section, re.IGNORECASE | re.MULTILINE)
            if match:
                title = match.group(1).strip()
                if len(title) > 5:
                    suggestion["title"] = title
                    break
        
        # Extract description
        desc_match = re.search(
            r'(?:الوصف|Description)[:：]\s*(.+?)(?:\n(?:نسبة|العيار|التبرير)|$)',
            section,
            re.IGNORECASE | re.DOTALL
        )
        if desc_match:
            suggestion["description"] = desc_match.group(1).strip()
        
        # Extract discount percentage
        discount_match = re.search(
            r'(?:نسبة\s*الخصم|الخصم)[:：]\s*(\d+)',
            section,
            re.IGNORECASE
        )
        if discount_match:
            suggestion["discountPercentage"] = int(discount_match.group(1))
        
        # Extract target karat
        karat_match = re.search(
            r'(?:العيار\s*المستهدف|العيار)[:：]\s*(\d+)',
            section,
            re.IGNORECASE
        )
        if karat_match:
            suggestion["targetKarat"] = int(karat_match.group(1))
        
        # Extract reasoning
        reasoning_match = re.search(
            r'(?:التبرير\s*الاستراتيجي|التبرير)[:：]\s*(.+?)(?:\n(?:الأولوية|التأثير)|$)',
            section,
            re.IGNORECASE | re.DOTALL
        )
        if reasoning_match:
            suggestion["reasoning"] = reasoning_match.group(1).strip()
        
        # Extract urgency
        urgency_match = re.search(
            r'(?:الأولوية|Urgency)[:：]\s*(low|medium|high)',
            section,
            re.IGNORECASE
        )
        if urgency_match:
            suggestion["urgency"] = urgency_match.group(1).lower()
        else:
            suggestion["urgency"] = "medium"
        
        # Extract expected impact
        impact_match = re.search(
            r'(?:التأثير\s*المتوقع|التأثير)[:：]\s*(.+?)(?:\n|$)',
            section,
            re.IGNORECASE | re.DOTALL
        )
        if impact_match:
            suggestion["expectedImpact"] = impact_match.group(1).strip()
        
        # Extract additional fields
        perspective_match = re.search(
            r'\*\*الاقتراح\s*#\d+\s*-\s*\[(.+?)\]\*\*',
            section,
            re.IGNORECASE
        )
        if perspective_match:
            suggestion["perspective"] = perspective_match.group(1).strip()
        
        target_competitor_match = re.search(
            r'(?:المنافس\s*المستهدف|المنافس)[:：]\s*(.+?)(?:\n|$)',
            section,
            re.IGNORECASE
        )
        if target_competitor_match:
            suggestion["targetCompetitor"] = target_competitor_match.group(1).strip()
        
        suggested_channel_match = re.search(
            r'(?:القناة\s*المقترحة|القناة)[:：]\s*(.+?)(?:\n|$)',
            section,
            re.IGNORECASE
        )
        if suggested_channel_match:
            suggestion["suggestedChannel"] = suggested_channel_match.group(1).strip()
        
        marketing_strategy_match = re.search(
            r'(?:استراتيجية\s*التسويق|استراتيجية)[:：]\s*(.+?)(?:\n(?:التبرير|الأولوية)|$)',
            section,
            re.IGNORECASE | re.DOTALL
        )
        if marketing_strategy_match:
            suggestion["marketingStrategy"] = marketing_strategy_match.group(1).strip()
        
        target_event_match = re.search(
            r'(?:المناسبة\s*المستهدفة|المناسبة)[:：]\s*(.+?)(?:\n|$)',
            section,
            re.IGNORECASE
        )
        if target_event_match:
            suggestion["targetEvent"] = target_event_match.group(1).strip()
        
        differentiation_match = re.search(
            r'(?:نقطة\s*التمايز|التمايز)[:：]\s*(.+?)(?:\n(?:التبرير|الأولوية)|$)',
            section,
            re.IGNORECASE | re.DOTALL
        )
        if differentiation_match:
            suggestion["differentiation"] = differentiation_match.group(1).strip()
        
        added_value_match = re.search(
            r'(?:القيمة\s*المضافة|القيمة)[:：]\s*(.+?)(?:\n(?:التبرير|الأولوية)|$)',
            section,
            re.IGNORECASE | re.DOTALL
        )
        if added_value_match:
            suggestion["addedValue"] = added_value_match.group(1).strip()
        
        duration_match = re.search(
            r'(?:مدة\s*العرض|المدة)[:：]\s*(.+?)(?:\n(?:التبرير|الأولوية)|$)',
            section,
            re.IGNORECASE | re.DOTALL
        )
        if duration_match:
            suggestion["duration"] = duration_match.group(1).strip()
        
        if suggestion.get("title") and len(suggestion["title"]) > 5:
            suggestions.append(suggestion)
    
    return suggestions[:5]  # Return max 5 suggestions


def _extract_market_analysis(text: str) -> str:
    """Extract market analysis from response."""
    patterns = [
        r'(?:تحليل\s*السوق|Market\s*Analysis)[:：]\s*(.+?)(?:\n\n|الاقتراح|$)',
        r'\*\*تحليل\s*السوق\*\*[:：]\s*(.+?)(?:\n\n|الاقتراح|$)',
        r'تحليل\s*السوق\s*\n(.+?)(?:\n\n|الاقتراح|$)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            analysis = match.group(1).strip()
            # Clean up
            analysis = re.sub(r'سأقدم|سأقوم|سأحلل', '', analysis)
            analysis = re.sub(r'بناءً على|إليك|نفترض', '', analysis)
            if len(analysis) > 50:
                return analysis[:600]
    
    return ""


def _generate_offer_suggestions(
    competitor_offers: List[Dict[str, Any]],
    current_prices: List[Dict[str, Any]],
    business_config: Dict[str, Any],
    competitor_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate offer suggestions using Google Gemini API.
    Equivalent to the TypeScript generateOfferSuggestions function.
    """
    import os
    
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables")
    
    business_type = business_config.get("businessType", "عام")
    business_keywords = business_config.get("keywords", "")
    is_gold_business = business_type == "Gold"
    
    # Prepare competitor analysis context
    competitor_analysis_context = ""
    channel_analysis_context = ""
    watched_accounts_context = ""
    
    if competitor_data:
        # Competitor analysis by brand
        competitor_analysis = competitor_data.get("competitorAnalysis", {})
        top_competitors = sorted(
            competitor_analysis.values(),
            key=lambda x: x.get("totalOffers", 0),
            reverse=True
        )[:10]
        
        if top_competitors:
            competitor_analysis_context = "**تحليل المنافسين الرئيسيين:**\n"
            for idx, comp in enumerate(top_competitors, 1):
                brand = comp.get("brand", "")
                total_offers = comp.get("totalOffers", 0)
                avg_discount = comp.get("avgDiscount", 0)
                channels = comp.get("channels", [])
                recent_offers = comp.get("recentOffers", [])[:3]
                recent_offers_str = " | ".join([
                    f"{o.get('title', '')} ({o.get('discountPercentage', 0)}%)"
                    for o in recent_offers
                ])
                competitor_analysis_context += (
                    f"{idx}. **{brand}**: {total_offers} عرض نشط، متوسط الخصم {avg_discount}%، "
                    f"نشط على: {', '.join(channels)}\n"
                    f"   - أحدث العروض: {recent_offers_str}\n\n"
                )
        
        # Channel analysis
        offers_by_channel = competitor_data.get("offersByChannel", {})
        channel_stats = {
            "instagram": len(offers_by_channel.get("instagram", [])),
            "tiktok": len(offers_by_channel.get("tiktok", [])),
            "websites": len(offers_by_channel.get("websites", [])),
            "snapchat": len(offers_by_channel.get("snapchat", [])),
        }
        
        channel_analysis_context = (
            f"**تحليل القنوات التسويقية:**\n"
            f"- Instagram: {channel_stats['instagram']} عرض نشط\n"
            f"- TikTok: {channel_stats['tiktok']} عرض نشط\n"
            f"- المواقع الإلكترونية: {channel_stats['websites']} عرض نشط\n"
            f"- Snapchat: {channel_stats['snapchat']} عرض نشط\n\n"
        )
        
        # Watched accounts
        watched_accounts = competitor_data.get("watchedAccounts", {})
        total_watched = (
            len(watched_accounts.get("instagram", [])) +
            len(watched_accounts.get("tiktok", [])) +
            len(watched_accounts.get("snapchat", [])) +
            len(watched_accounts.get("websites", []))
        )
        
        if total_watched > 0:
            instagram_accounts = watched_accounts.get("instagram", [])[:5]
            tiktok_accounts = watched_accounts.get("tiktok", [])[:5]
            instagram_usernames = ", ".join([f"@{a.get('username', '')}" for a in instagram_accounts])
            tiktok_usernames = ", ".join([f"@{a.get('username', '')}" for a in tiktok_accounts])
            
            watched_accounts_context = (
                f"**الحسابات المراقبة في السوق الكويتي:**\n"
                f"- Instagram: {len(watched_accounts.get('instagram', []))} حساب نشط ({instagram_usernames})\n"
                f"- TikTok: {len(watched_accounts.get('tiktok', []))} حساب نشط ({tiktok_usernames})\n"
                f"- Snapchat: {len(watched_accounts.get('snapchat', []))} حساب نشط\n"
                f"- المواقع: {len(watched_accounts.get('websites', []))} موقع نشط"
            )
    
    # Prepare context data
    offers_context = "\n\n".join([
        f"{idx + 1}. **{offer.get('brand', '')}** ({offer.get('source', '')}): {offer.get('title', '')}\n"
        f"   خصم: {offer.get('discountPercentage', 0)}%\n"
        f"   {(offer.get('description', '') or '')[:150]}"
        for idx, offer in enumerate(competitor_offers[:20])
    ])
    
    # Format prices
    prices_context = ""
    if is_gold_business and current_prices:
        prices_context = "\n".join([
            f"ذهب {p.get('karat', '')}K: {p.get('pricePerGram', '')} {p.get('currency', '')} ({p.get('source', '')})"
            for p in current_prices
        ])
    
    # Get current date and context
    today = datetime.now()
    current_month = today.month
    current_date = today.day
    
    kuwait_seasons = _get_kuwait_seasons(current_month)
    upcoming_events = _get_upcoming_kuwait_events(current_month, current_date)
    
    business_context = f"أنت خبير استراتيجي محترف في التسويق والمبيعات لسوق {business_type} في الكويت. لديك خبرة عميقة في تحليل المنافسين، استراتيجيات التسويق متعددة القنوات، وسيكولوجية المستهلك الكويتي."
    
    prices_section = f"**أسعار {business_type} الحالية:**\n{prices_context}\n" if prices_context else ""
    
    # Build comprehensive prompt (similar to TypeScript version)
    prompt = f"""{business_context}

**البيانات الشاملة المتاحة:**

**1. معلومات العمل:**
- نوع العمل: {business_type}
- الكلمات المفتاحية: {business_keywords}

**2. تحليل السوق الكويتي:**
- الشهر الحالي: {current_month} ({kuwait_seasons['season']} - {kuwait_seasons['description']})
- المناسبات القادمة: {', '.join(upcoming_events) if upcoming_events else 'لا توجد مناسبات قريبة'}
- السياق الموسمي: {kuwait_seasons['description']}

{prices_section}
**3. عروض المنافسين الحالية ({len(competitor_offers)} عرض):**
{offers_context or 'لا توجد عروض منافسين حالياً'}

{competitor_analysis_context if competitor_analysis_context else ''}
{channel_analysis_context if channel_analysis_context else ''}
{watched_accounts_context if watched_accounts_context else ''}

**المطلوب - إنشاء 5 اقتراحات استراتيجية من 5 منظورات مختلفة:**

يجب أن تكون الاقتراحات الخمسة من منظورات مختلفة تماماً:
1. **منظور المنافسة المباشرة** - استجابة مباشرة لعروض المنافسين المحددين
2. **منظور القناة التسويقية** - استغلال قناة تسويقية محددة (Instagram/TikTok/Website/Snapchat)
3. **منظور التوقيت والمناسبات** - استغلال التوقيت والمناسبات القادمة في الكويت
4. **منظور التمايز** - عرض مختلف تماماً عن ما يقدمه المنافسون
5. **منظور القيمة المضافة** - عرض يركز على القيمة وليس فقط السعر

**التنسيق المطلوب - اكتب مباشرة بدون أي مقدمة:**

**الاقتراح #1 - [منظور المنافسة المباشرة]:**
**العنوان:** [عنوان جذاب يذكر المنافس المحدد]
**الوصف:** [وصف تفصيلي]
**نسبة الخصم:** [رقم]
{'**العيار المستهدف:** [18 أو 21 أو 22 أو 24]' if is_gold_business else ''}
**المنافس المستهدف:** [اسم العلامة التجارية]
**القناة المقترحة:** [Instagram أو TikTok أو Website أو Snapchat]
**التبرير الاستراتيجي:** [تبرير بناءً على تحليل المنافسين]
**الأولوية:** [low أو medium أو high]
**التأثير المتوقع:** [تأثير محدد]

**الاقتراح #2 - [منظور القناة التسويقية]:**
**العنوان:** [عنوان جذاب]
**الوصف:** [وصف تفصيلي]
**نسبة الخصم:** [رقم]
{'**العيار المستهدف:** [18 أو 21 أو 22 أو 24]' if is_gold_business else ''}
**القناة المقترحة:** [Instagram أو TikTok أو Website أو Snapchat]
**استراتيجية التسويق:** [كيف سيتم تسويق هذا العرض]
**التبرير الاستراتيجي:** [تبرير]
**الأولوية:** [low أو medium أو high]
**التأثير المتوقع:** [تأثير محدد]

**الاقتراح #3 - [منظور التوقيت والمناسبات]:**
**العنوان:** [عنوان جذاب]
**الوصف:** [وصف تفصيلي]
**نسبة الخصم:** [رقم]
{'**العيار المستهدف:** [18 أو 21 أو 22 أو 24]' if is_gold_business else ''}
**المناسبة المستهدفة:** [المناسبة]
**مدة العرض:** [متى يبدأ ومتى ينتهي]
**التبرير الاستراتيجي:** [تبرير]
**الأولوية:** [low أو medium أو high]
**التأثير المتوقع:** [تأثير محدد]

**الاقتراح #4 - [منظور التمايز]:**
**العنوان:** [عنوان جذاب]
**الوصف:** [وصف تفصيلي]
**نسبة الخصم:** [رقم]
{'**العيار المستهدف:** [18 أو 21 أو 22 أو 24]' if is_gold_business else ''}
**نقطة التمايز:** [ما الذي يجعل هذا العرض مختلفاً]
**التبرير الاستراتيجي:** [تبرير]
**الأولوية:** [low أو medium أو high]
**التأثير المتوقع:** [تأثير محدد]

**الاقتراح #5 - [منظور القيمة المضافة]:**
**العنوان:** [عنوان جذاب]
**الوصف:** [وصف تفصيلي]
**نسبة الخصم:** [رقم]
{'**العيار المستهدف:** [18 أو 21 أو 22 أو 24]' if is_gold_business else ''}
**القيمة المضافة:** [ما هي الخدمات أو المزايا الإضافية]
**التبرير الاستراتيجي:** [تبرير]
**الأولوية:** [low أو medium أو high]
**التأثير المتوقع:** [تأثير محدد]

**تحليل السوق الشامل:**
[تحليل احترافي 200-300 كلمة يشمل تحليل المنافسين واستراتيجيات التسويق والتوقيت والتوصيات]

**قواعد صارمة:**
1. ابدأ مباشرة بالاقتراح #1 - لا تكتب أي مقدمة
2. استخدم أسماء العلامات التجارية الحقيقية من البيانات
3. كل اقتراح يجب أن يكون من منظور مختلف تماماً
4. اكتب بالعربية الفصحى الواضحة"""

    try:
        # Use Gemini REST API
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={google_api_key}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 1.0,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 4000,
            }
        }
        
        response = requests.post(api_url, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        
        # Extract text from response
        full_text = ""
        if "candidates" in result and len(result["candidates"]) > 0:
            candidate = result["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                for part in candidate["content"]["parts"]:
                    if "text" in part:
                        full_text += part["text"]
        
        if not full_text:
            raise ValueError("No text generated from Gemini API")
        
        # Parse suggestions and market analysis
        suggestions = _parse_suggestions(full_text)
        market_analysis = _extract_market_analysis(full_text)
        
        return {
            "success": True,
            "suggestions": suggestions,
            "marketAnalysis": market_analysis,
        }
    except Exception as e:
        print(f"[Offer Suggestions] Error generating suggestions: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "suggestions": [],
            "marketAnalysis": "",
            "error": str(e),
        }


def _cleanup_old_suggestions(db: Session, client_id: int):
    """
    Delete offer suggestions older than 1 month.
    This function is called after saving new suggestions.
    """
    try:
        one_month_ago = datetime.utcnow() - timedelta(days=30)
        
        deleted_count = (
            db.query(CompetitorOfferSuggestion)
            .filter(
                CompetitorOfferSuggestion.client_id == client_id,
                CompetitorOfferSuggestion.created_at < one_month_ago
            )
            .delete()
        )
        
        if deleted_count > 0:
            db.commit()
            print(f"[Offer Suggestions] Cleaned up {deleted_count} old suggestion records (older than 1 month)")
    except Exception as e:
        print(f"[Offer Suggestions] Error cleaning up old suggestions: {e}")
        db.rollback()


@router.get("/offer-suggestions")
def get_offer_suggestions(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Generate offer suggestions based on current market data and active business type.
    Equivalent to the TypeScript getOfferSuggestions function.
    Returns: { success: bool, suggestions: List[Dict], marketAnalysis: str, error?: str }
    """
    try:
        # Get business type from client.company_details (primary) or CompetitorBusinessConfig (fallback)
        business_type = None
        business_keywords = ""
        price_keywords = ""
        offer_keywords = ""
        
        # Get business type from client.company_details (primary source)
        if current_client.company_details and current_client.company_details.strip():
            business_type = current_client.company_details.strip()
        else:
            # Fallback to CompetitorBusinessConfig if company_details is not set
            business_config = (
                db.query(CompetitorBusinessConfig)
                .filter(
                    CompetitorBusinessConfig.client_id == current_client.id,
                    CompetitorBusinessConfig.is_active.is_(True),
                )
                .first()
            )
            
            if business_config:
                business_type = business_config.businessType
                business_keywords = business_config.keywords or ""
                price_keywords = business_config.price_keywords or ""
                offer_keywords = business_config.offer_keywords or ""
            else:
                # Default to "عام" (General) if neither company_details nor business_config is set
                # This allows suggestions to be generated even without explicit business type
                business_type = "عام"
        
        # Create business_config_dict for AI generation
        business_config_dict = {
            "businessType": business_type,
            "keywords": business_keywords,
            "priceKeywords": price_keywords,
            "offerKeywords": offer_keywords,
        }
        
        # Get current market data - filter offers by business keywords if available
        offers_query = db.query(CompetitorBrandOffer).filter(
            CompetitorBrandOffer.client_id == current_client.id,
            CompetitorBrandOffer.is_active.is_(True),
        )
        competitor_offers = offers_query.order_by(CompetitorBrandOffer.scraped_at.desc()).all()
        competitor_offers_dict = [BrandOfferSchema.model_validate(o).model_dump() for o in competitor_offers]
        
        # Filter offers by business keywords if not Gold and keywords are available
        if business_type != "Gold" and business_keywords:
            keywords = [k.strip().lower() for k in business_keywords.split(",")]
            competitor_offers_dict = [
                offer for offer in competitor_offers_dict
                if any(
                    keyword in (offer.get("title", "") + " " + (offer.get("description", "") or "") + " " + offer.get("brand", "")).lower()
                    for keyword in keywords
                )
            ]
        
        # Analyze offers by channel
        offers_by_channel = {
            "instagram": [
                o for o in competitor_offers_dict
                if o.get("source") == "instagram" or "instagram.com" in (o.get("sourceUrl") or "")
            ],
            "tiktok": [
                o for o in competitor_offers_dict
                if o.get("source") == "tiktok" or "tiktok.com" in (o.get("sourceUrl") or "")
            ],
            "websites": [
                o for o in competitor_offers_dict
                if o.get("source") == "website" or (
                    "instagram.com" not in (o.get("sourceUrl") or "") and
                    "tiktok.com" not in (o.get("sourceUrl") or "") and
                    "snapchat.com" not in (o.get("sourceUrl") or "")
                )
            ],
            "snapchat": [
                o for o in competitor_offers_dict
                if o.get("source") == "snapchat" or "snapchat.com" in (o.get("sourceUrl") or "")
            ],
        }
        
        # Get competitor brands and their activity
        competitor_brands = list(set([o.get("brand", "") for o in competitor_offers_dict]))[:20]
        
        competitor_analysis = {}
        for brand in competitor_brands:
            brand_offers = [o for o in competitor_offers_dict if o.get("brand") == brand]
            channels = []
            for offer in brand_offers:
                source_url = offer.get("sourceUrl", "")
                if "instagram.com" in source_url:
                    channels.append("Instagram")
                elif "tiktok.com" in source_url:
                    channels.append("TikTok")
                elif "snapchat.com" in source_url:
                    channels.append("Snapchat")
                else:
                    channels.append("Website")
            channels = list(set(channels))
            
            discounts = [
                o.get("discountPercentage", 0)
                for o in brand_offers
                if o.get("discountPercentage") is not None
            ]
            avg_discount = int(sum(discounts) / len(discounts)) if discounts else 0
            
            competitor_analysis[brand] = {
                "brand": brand,
                "totalOffers": len(brand_offers),
                "avgDiscount": avg_discount,
                "channels": channels,
                "recentOffers": brand_offers[:5],
            }
        
        # Get watched competitor accounts
        watched_accounts = {
            "instagram": [
                SocialMediaAccountSchema.model_validate(a).model_dump()
                for a in db.query(CompetitorSocialMediaAccount)
                .filter(
                    CompetitorSocialMediaAccount.client_id == current_client.id,
                    CompetitorSocialMediaAccount.platform == "instagram",
                    CompetitorSocialMediaAccount.is_active.is_(True),
                )
                .all()
            ],
            "tiktok": [
                SocialMediaAccountSchema.model_validate(a).model_dump()
                for a in db.query(CompetitorSocialMediaAccount)
                .filter(
                    CompetitorSocialMediaAccount.client_id == current_client.id,
                    CompetitorSocialMediaAccount.platform == "tiktok",
                    CompetitorSocialMediaAccount.is_active.is_(True),
                )
                .all()
            ],
            "snapchat": [
                SocialMediaAccountSchema.model_validate(a).model_dump()
                for a in db.query(CompetitorSocialMediaAccount)
                .filter(
                    CompetitorSocialMediaAccount.client_id == current_client.id,
                    CompetitorSocialMediaAccount.platform == "snapchat",
                    CompetitorSocialMediaAccount.is_active.is_(True),
                )
                .all()
            ],
            "websites": [
                WebsiteAccountSchema.model_validate(a).model_dump()
                for a in db.query(CompetitorWebsiteAccount)
                .filter(
                    CompetitorWebsiteAccount.client_id == current_client.id,
                    CompetitorWebsiteAccount.is_active.is_(True),
                )
                .all()
            ],
        }
        
        # Get gold prices if business type is Gold
        current_prices = []
        if business_type == "Gold":
            prices = (
                db.query(CompetitorGoldPrice)
                .filter(CompetitorGoldPrice.client_id == current_client.id)
                .order_by(CompetitorGoldPrice.created_at.desc())
                .limit(10)
                .all()
            )
            current_prices = [GoldPriceSchema.model_validate(p).model_dump() for p in prices]
        
        # Generate suggestions using AI
        competitor_data = {
            "offersByChannel": offers_by_channel,
            "competitorAnalysis": competitor_analysis,
            "watchedAccounts": watched_accounts,
        }
        
        result = _generate_offer_suggestions(
            competitor_offers_dict,
            current_prices,
            business_config_dict,
            competitor_data
        )
        
        # Add business type to response for frontend
        if result.get("success"):
            result["businessType"] = business_type
            
            # Save suggestions to database
            try:
                suggestion_record = CompetitorOfferSuggestion(
                    client_id=current_client.id,
                    business_type=business_type,
                    suggestions=result.get("suggestions", []),
                    market_analysis=result.get("marketAnalysis", "")
                )
                db.add(suggestion_record)
                db.commit()
                
                # Clean up old suggestions (older than 1 month) in background
                _cleanup_old_suggestions(db, current_client.id)
            except Exception as e:
                print(f"[Offer Suggestions] Error saving to database: {e}")
                # Don't fail the request if saving fails
                db.rollback()
        
        return result
    except Exception as e:
        print(f"[Offer Suggestions] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "suggestions": [],
            "marketAnalysis": "",
            "error": str(e),
        }


@router.get("/offer-suggestions/history")
def get_offer_suggestions_history(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
    limit: int = 10,
):
    """
    Get historical offer suggestions for the current client.
    Returns suggestions from the last month, ordered by most recent first.
    """
    try:
        one_month_ago = datetime.utcnow() - timedelta(days=30)
        
        suggestions = (
            db.query(CompetitorOfferSuggestion)
            .filter(
                CompetitorOfferSuggestion.client_id == current_client.id,
                CompetitorOfferSuggestion.created_at >= one_month_ago
            )
            .order_by(CompetitorOfferSuggestion.created_at.desc())
            .limit(limit)
            .all()
        )
        
        result = []
        for suggestion in suggestions:
            result.append({
                "id": suggestion.id,
                "businessType": suggestion.business_type,
                "suggestions": suggestion.suggestions,
                "marketAnalysis": suggestion.market_analysis,
                "createdAt": suggestion.created_at.isoformat(),
            })
        
        return {
            "success": True,
            "data": result,
            "count": len(result),
        }
    except Exception as e:
        print(f"[Offer Suggestions History] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "data": [],
            "count": 0,
            "error": str(e),
        }


@router.delete("/offer-suggestions/{suggestion_id}")
def delete_offer_suggestion(
    suggestion_id: int,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete a specific offer suggestion by ID.
    Only allows deletion of suggestions belonging to the current client.
    """
    try:
        suggestion = (
            db.query(CompetitorOfferSuggestion)
            .filter(
                CompetitorOfferSuggestion.id == suggestion_id,
                CompetitorOfferSuggestion.client_id == current_client.id
            )
            .first()
        )
        
        if not suggestion:
            raise HTTPException(
                status_code=404,
                detail="Suggestion not found or you don't have permission to delete it"
            )
        
        db.delete(suggestion)
        db.commit()
        
        return {
            "success": True,
            "message": "Suggestion deleted successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Delete Offer Suggestion] Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting suggestion: {str(e)}"
        )


@router.delete("/offer-suggestions")
def delete_all_offer_suggestions(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete all offer suggestions for the current client.
    """
    try:
        deleted_count = (
            db.query(CompetitorOfferSuggestion)
            .filter(CompetitorOfferSuggestion.client_id == current_client.id)
            .delete()
        )
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} suggestion(s) successfully",
            "count": deleted_count,
        }
    except Exception as e:
        print(f"[Delete All Offer Suggestions] Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting suggestions: {str(e)}"
        )
