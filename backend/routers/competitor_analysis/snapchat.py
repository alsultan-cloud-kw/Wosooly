from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Body
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import re
import asyncio
import json
import os
import base64

import requests
from bs4 import BeautifulSoup
from pyppeteer import launch

from database import get_db
from models import (
    Client,
    CompetitorSocialMediaAccount,
    CompetitorGoldPrice,
    CompetitorBrandOffer,
    CompetitorWebsiteAccount,
    CompetitorBusinessConfig,
    CompetitorNewsSource,
    CompetitorGoldNews,
    CompetitorDailyNewsSummary,
    CompetitorDeepResearchResult,
    CompetitorAnalyzedImage,
    CompetitorTikTokHashtag,
    CompetitorPriceAlert,
)
from schemas import (
    SocialMediaAccountCreate,
    SocialMediaAccountSchema,
    InstagramProfileCreate,
    InstagramProfileResponse,
    GoldPriceSchema,
    BrandOfferCreate,
    BrandOfferSchema,
    WebsiteAccountCreate,
    WebsiteAccountSchema,
    BusinessConfigCreate,
    BusinessConfigUpdate,
    BusinessConfigSchema,
    NewsSourceCreate,
    NewsSourceUpdate,
    NewsSourceSchema,
    GoldNewsSchema,
    DailyNewsSummarySchema,
    DeepResearchResultSchema,
    AnalyzedImageSchema,
    TikTokHashtagSchema,
    PriceAlertSchema,
    GenericResponse,
)
from utils.auth import get_current_client
from pydantic import BaseModel


router = APIRouter()

# Snapchat Scraping Functions
# ============================================

async def _extract_snapchat_json(page) -> Optional[Dict[str, Any]]:
    """
    Extract JSON data from Snapchat profile page.
    Similar to extractSnapchatJSON in TypeScript.
    """
    try:
        json_data = await page.evaluate("""() => {
            const scripts = document.querySelectorAll('script[type="application/json"]');
            
            for (const script of scripts) {
                try {
                    const content = script.textContent;
                    if (content) {
                        const parsed = JSON.parse(content);
                        // Check if this looks like Snapchat profile data
                        if (parsed.pageTitle || parsed.username || parsed.story) {
                            return parsed;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            
            return null;
        }""")
        
        return json_data
    except Exception as error:
        print(f"[Snapchat] Error extracting JSON: {error}")
        return None


async def _take_snapchat_screenshot(page, username: str) -> Optional[str]:
    """
    Take screenshot of Snapchat profile page.
    Equivalent to takeProfileScreenshot in TypeScript.
    Returns Cloudinary URL or None.
    """
    try:
        await asyncio.sleep(3)  # Wait for content to load
        
        # Take screenshot as base64
        screenshot_buffer = await page.screenshot({
            "fullPage": True,
            "encoding": "base64"
        })
        
        # Upload to Cloudinary
        import cloudinary
        import cloudinary.uploader
        
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET")
        )
        
        # Convert base64 to bytes
        import base64
        screenshot_bytes = base64.b64decode(screenshot_buffer)
        
        # Upload to Cloudinary
        from io import BytesIO
        result = cloudinary.uploader.upload(
            BytesIO(screenshot_bytes),
            folder="snapchat-screenshots",
            public_id=f"snapchat-{username}-{int(datetime.now().timestamp())}",
            resource_type="image"
        )
        
        screenshot_url = result.get("secure_url")
        print(f"[Snapchat] Screenshot saved: {screenshot_url}")
        return screenshot_url
    except Exception as error:
        print(f"[Snapchat] Error taking screenshot: {error}")
        return None


def _extract_info_from_analysis(analysis_text: str) -> Dict[str, Any]:
    """
    Extract structured information from analysis text.
    Equivalent to extractInfoFromAnalysis in TypeScript.
    """
    info: Dict[str, Any] = {}
    
    # Check for promotional content
    promotional_keywords = [
        re.compile(r"عرض|خصم|تخفيض|promo|sale|discount|offer|special", re.IGNORECASE),
        re.compile(r"%", re.IGNORECASE),
    ]
    info["promotionalContent"] = any(pattern.search(analysis_text) for pattern in promotional_keywords)
    
    # Extract offers section from analysis (section 1)
    offers_section_patterns = [
        re.compile(r"(?:^|\n)\s*\*\*?\s*1\.\s*[^\n]*(?:عروض|خصومات|ترويجية|خصم)[^\n]*\*\*?\s*\n([\s\S]*?)(?=\n\s*\*\*?\s*2\.|$)", re.IGNORECASE),
        re.compile(r"(?:^|\n)\s*1\.\s*[^\n]*(?:عروض|خصومات|ترويجية|خصم)[^\n]*\n([\s\S]*?)(?=\n\s*2\.|$)", re.IGNORECASE),
    ]
    
    offers_section = None
    for pattern in offers_section_patterns:
        match = pattern.search(analysis_text)
        if match and match.group(1):
            offers_section = match.group(1)
            # Clean up the extracted section
            offers_section = re.sub(r'^[\s\-*]+', '', offers_section, flags=re.MULTILINE)
            offers_section = re.sub(r'\n{3,}', '\n\n', offers_section)
            offers_section = re.sub(r'^---+\s*$', '', offers_section, flags=re.MULTILINE)
            offers_section = offers_section.strip()
            if offers_section:
                break
    
    if offers_section:
        info["offersSection"] = offers_section
    
    # Extract offers
    offer_patterns = [
        re.compile(r"عرض[:\s]+([^\n]+)", re.IGNORECASE),
        re.compile(r"خصم[:\s]+([^\n]+)", re.IGNORECASE),
        re.compile(r"تخفيض[:\s]+([^\n]+)", re.IGNORECASE),
        re.compile(r"promo[:\s]+([^\n]+)", re.IGNORECASE),
        re.compile(r"sale[:\s]+([^\n]+)", re.IGNORECASE),
    ]
    
    offers = []
    for pattern in offer_patterns:
        matches = pattern.finditer(analysis_text)
        for match in matches:
            if match.group(1):
                offers.append(match.group(1).strip())
    
    if offers:
        info["offers"] = offers
    
    # Extract prices
    price_patterns = [
        re.compile(r"(\d+)\s*[Kk][\s:]+(\d+\.?\d*)\s*(?:KWD|KD|د\.ك)", re.IGNORECASE),
        re.compile(r"(\d+\.?\d*)\s*(?:KWD|KD|د\.ك)[\s:]+(\d+)\s*[Kk]", re.IGNORECASE),
    ]
    
    prices = []
    valid_karats = [18, 21, 22, 24]
    for pattern in price_patterns:
        matches = pattern.finditer(analysis_text)
        for match in matches:
            try:
                karat = int(match.group(1) if match.group(1).isdigit() else match.group(2))
                price = float(match.group(2) if match.group(1).isdigit() else match.group(1))
                if karat in valid_karats:
                    prices.append({"karat": karat, "price": price})
            except (ValueError, IndexError):
                continue
    
    if prices:
        info["prices"] = prices
    
    return info


async def _analyze_snapchat_screenshot(
    screenshot_url: str,
    brand_name: str,
    username: str,
    db: Session,
    client_id: int
) -> List[Dict[str, Any]]:
    """
    Analyze screenshot and extract offers using Google Gemini API.
    Equivalent to analyzeScreenshotAndExtractOffers in TypeScript.
    """
    try:
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            print("[Snapchat] GOOGLE_API_KEY not found, skipping image analysis")
            return []
        
        print(f"[Snapchat] Analyzing screenshot for {username}")
        
        # Handle different URL formats
        image_data = None
        mime_type = "image/png"
        
        if screenshot_url.startswith("data:"):
            # Extract base64 data from data URL
            match = re.match(r'^data:([^;]+);base64,(.+)$', screenshot_url)
            if match:
                mime_type = match.group(1)
                base64_data = match.group(2)
                image_data = base64.b64decode(base64_data)
        else:
            # Fetch image from URL
            try:
                response = requests.get(screenshot_url, timeout=30, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                })
                response.raise_for_status()
                image_data = response.content
                content_type = response.headers.get("content-type")
                if content_type and content_type.startswith("image/"):
                    mime_type = content_type
            except Exception as e:
                print(f"[Snapchat] Error fetching image: {e}")
                return []
        
        if not image_data:
            print(f"[Snapchat] Could not get image data from {screenshot_url}")
            return []
        
        # Check image size (max 20MB)
        if len(image_data) > 20 * 1024 * 1024:
            print(f"[Snapchat] Image too large ({len(image_data)} bytes)")
            return []
        
        # Create analysis prompt
        context = f"صورة من حساب Snapchat لـ {brand_name} (@{username})"
        is_gold_business = "ذهب" in context.lower() or "gold" in context.lower() or "عيار" in context.lower() or "karat" in context.lower()
        
        gold_price_section = "2. أسعار الذهب إذا كانت موجودة (18K, 21K, 22K, 24K)\n" if is_gold_business else "2. الأسعار إذا كانت موجودة\n"
        
        prompt = f"""قم بتحليل هذه الصورة من {context}. ابحث عن:
1. أي عروض ترويجية أو خصومات مذكورة في الصورة
{gold_price_section}3. أي نصوص أو معلومات مهمة عن المنتجات
4. هل تحتوي الصورة على محتوى ترويجي؟

يرجى تقديم تحليل مفصل بالعربية."""
        
        # Use Gemini API via REST API to avoid dependency conflicts
        # Convert image to base64 for inline data
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Use Gemini REST API
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={google_api_key}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64_image
                            }
                        },
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        }
        
        api_response = requests.post(api_url, json=payload, timeout=60)
        api_response.raise_for_status()
        result = api_response.json()
        
        # Extract text from response
        try:
            if "candidates" in result and len(result["candidates"]) > 0:
                candidate = result["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    parts = candidate["content"]["parts"]
                    if parts and len(parts) > 0:
                        analysis_text = parts[0].get("text", "")
                    else:
                        analysis_text = ""
                else:
                    analysis_text = ""
            else:
                print(f"[Snapchat] No candidates in Gemini response: {result}")
                analysis_text = ""
        except Exception as e:
            print(f"[Snapchat] Error extracting text from Gemini response: {e}")
            analysis_text = ""
        
        if not analysis_text:
            print(f"[Snapchat] No analysis result for {username}")
            return []
        
        # Extract structured information
        extracted_info = _extract_info_from_analysis(analysis_text)
        
        # Save analyzed image to database
        analyzed_image = CompetitorAnalyzedImage(
            client_id=client_id,
            brand_name=brand_name,
            image_url=screenshot_url,
            source="snapchat",
            source_url=f"https://www.snapchat.com/add/{username}",
            analysis_result=analysis_text,
            extracted_info={
                "offers": extracted_info.get("offers", []),
                "prices": extracted_info.get("prices", []),
                "offersSection": extracted_info.get("offersSection")
            },
            is_promotional=extracted_info.get("promotionalContent", False)
        )
        db.add(analyzed_image)
        db.commit()
        db.refresh(analyzed_image)
        
        # Convert analysis to offers
        offers = []
        
        # If we have structured offers, create offers from them
        if extracted_info.get("offers") and len(extracted_info["offers"]) > 0:
            for i, offer_text in enumerate(extracted_info["offers"]):
                title = offer_text[:100] if len(offer_text) > 100 else offer_text or f"عرض {i + 1} من {brand_name}"
                description = extracted_info.get("offersSection") or offer_text or ""
                
                offers.append({
                    "brand": brand_name,
                    "title": title,
                    "description": description,
                    "discount_percentage": None,
                    "source": "snapchat",
                    "source_url": f"https://www.snapchat.com/add/{username}",
                    "scraped_at": datetime.utcnow(),
                })
        elif extracted_info.get("promotionalContent") or extracted_info.get("offersSection"):
            # If promotional content detected but no structured offers, create one from offers section
            offers_text = extracted_info.get("offersSection") or analysis_text or ""
            if offers_text.strip():
                offers.append({
                    "brand": brand_name,
                    "title": f"عروض من {brand_name}",
                    "description": offers_text,
                    "source": "snapchat",
                    "source_url": f"https://www.snapchat.com/add/{username}",
                    "scraped_at": datetime.utcnow(),
                })
        
        print(f"[Snapchat] Extracted {len(offers)} offers from screenshot analysis")
        return offers
    except Exception as error:
        print(f"[Snapchat] Error analyzing screenshot: {error}")
        import traceback
        traceback.print_exc()
        return []


async def _scrape_snapchat_profile_async(username: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Scrape Snapchat profile and extract stories and highlights separately.
    Equivalent to scrapeSnapchatProfile in TypeScript.
    """
    browser = None
    stories = []
    highlights = []
    
    try:
        print(f"[Snapchat] Starting scrape for @{username}")
        
        # Patch signal handling before launching browser
        import signal as signal_module
        import threading
        original_signal = signal_module.signal
        
        def safe_signal(signalnum, handler):
            try:
                if threading.current_thread() is threading.main_thread():
                    return original_signal(signalnum, handler)
            except:
                pass
            return signal_module.SIG_DFL
        
        signal_module.signal = safe_signal
        
        try:
            executable_path = os.environ.get('PUPPETEER_EXECUTABLE_PATH', '/usr/bin/chromium')
            if not os.path.exists(executable_path):
                executable_path = None
            
            launch_options = {
                "headless": True,
                "args": [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                ],
            }
            
            if executable_path and os.path.exists(executable_path):
                launch_options["executablePath"] = executable_path
            
            browser = await launch(launch_options)
        finally:
            try:
                signal_module.signal = original_signal
            except:
                pass
        
        page = await browser.newPage()
        await page.setViewport({"width": 1920, "height": 1080})
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'ar-KW,ar;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        })
        
        profile_url = f"https://www.snapchat.com/add/{username}"
        print(f"[Snapchat] Navigating to profile: {profile_url}")
        
        await page.goto(profile_url, {"waitUntil": "networkidle2", "timeout": 60000})
        await asyncio.sleep(5)
        
        # Take screenshot of the profile page (for fallback analysis)
        screenshot_url = await _take_snapchat_screenshot(page, username)
        
        # Extract JSON data from the page
        profile_data = await _extract_snapchat_json(page)
        
        if not profile_data:
            print(f"[Snapchat] No JSON data found for {username}, will use screenshot analysis")
            await browser.close()
            return {"stories": [], "highlights": [], "screenshot_url": screenshot_url}
        
        print(f"[Snapchat] Extracted profile data for {profile_data.get('username', username)}")
        
        # Extract stories (not highlights)
        if profile_data.get("story") and isinstance(profile_data["story"], list):
            for snap in profile_data["story"]:
                if snap.get("snapUrls", {}).get("mediaUrl"):
                    caption = profile_data.get("bio") or profile_data.get("displayName") or profile_data.get("pageTitle") or ""
                    snap_index = snap.get("snapIndex")
                    story_id = str(snap_index) if snap_index is not None else f"snap-{int(datetime.now().timestamp())}"
                    stories.append({
                        "storyId": story_id,
                        "caption": caption,
                        "author": profile_data.get("username") or profile_data.get("displayName") or username,
                        "storyUrl": snap["snapUrls"]["mediaUrl"],
                        "timestamp": snap.get("timestampInSec", {}).get("value", ""),
                        "mediaType": "image" if snap.get("snapMediaType") == 0 else "video",
                        "snapIndex": snap.get("snapIndex"),
                        "type": "story",
                    })
        
        # Extract curated highlights separately
        if profile_data.get("curatedHighlights") and isinstance(profile_data["curatedHighlights"], list):
            for highlight in profile_data["curatedHighlights"]:
                highlight_title = highlight.get("storyTitle", {}).get("value", "")
                if highlight.get("snapList") and isinstance(highlight["snapList"], list):
                    for snap in highlight["snapList"]:
                        if snap.get("snapUrls", {}).get("mediaUrl"):
                            highlights.append({
                                "storyId": f"highlight-{snap.get('snapIndex', int(datetime.now().timestamp()))}",
                                "caption": highlight_title,
                                "author": profile_data.get("username") or profile_data.get("displayName") or username,
                                "storyUrl": snap["snapUrls"]["mediaUrl"],
                                "timestamp": snap.get("timestampInSec", {}).get("value", ""),
                                "mediaType": "image",
                                "snapIndex": snap.get("snapIndex"),
                                "type": "highlight",
                                "highlightTitle": highlight_title,
                            })
        
        print(f"[Snapchat] Extracted {len(stories)} stories and {len(highlights)} highlights from {username}")
        await browser.close()
        return {"stories": stories, "highlights": highlights, "screenshot_url": screenshot_url}
        
    except Exception as error:
        print(f"[Snapchat] Error scraping profile {username}: {error}")
        import traceback
        traceback.print_exc()
        return {"stories": [], "highlights": []}
    finally:
        if browser:
            try:
                await browser.close()
            except:
                pass


def _convert_snapchat_to_offers(
    stories: List[Dict[str, Any]],
    highlights: List[Dict[str, Any]],
    brand_name: str,
    business_keywords: List[str],
    offer_keywords: List[str],
    price_keywords: List[str]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Convert Snapchat stories and highlights to brand offers.
    Returns (story_offers, highlight_offers).
    """
    story_offers = []
    highlight_offers = []
    
    # Promotional keywords
    promotional_keywords = [
        re.compile(r"خصم|تخفيض|عرض|promo|sale|discount|offer|special", re.IGNORECASE),
        re.compile(r"%|percent|بالمئة", re.IGNORECASE),
        re.compile(r"ذهب|gold|سعر|price", re.IGNORECASE),
        re.compile(r"كويت|kuwait", re.IGNORECASE),
    ]
    
    # Process stories
    for story in stories:
        caption = story.get("caption", "")
        has_promotion = any(pattern.search(caption) for pattern in promotional_keywords)
        
        discount_match = re.search(r"(\d+)%?\s*(?:off|خصم|تخفيض)", caption, re.IGNORECASE)
        discount = float(discount_match.group(1)) if discount_match else None
        
        is_gold_related = "ذهب" in caption.lower() or "gold" in caption.lower()
        is_kuwait_related = "كويت" in caption.lower() or "kuwait" in caption.lower()
        
        if has_promotion or discount or is_gold_related or is_kuwait_related:
            offer = {
                "brand": brand_name or story.get("author", "Snapchat User"),
                "title": caption[:100] if caption else f"Snapchat Story from {story.get('author')}",
                "description": caption or "",
                "discount_percentage": discount,
                "source": "snapchat",
                "source_url": story.get("storyUrl", f"https://www.snapchat.com/add/{story.get('author')}"),
                "scraped_at": datetime.utcnow(),
            }
            story_offers.append(offer)
    
    # Process highlights
    for highlight in highlights:
        caption = highlight.get("caption") or highlight.get("highlightTitle", "")
        has_promotion = any(pattern.search(caption) for pattern in promotional_keywords)
        
        discount_match = re.search(r"(\d+)%?\s*(?:off|خصم|تخفيض)", caption, re.IGNORECASE)
        discount = float(discount_match.group(1)) if discount_match else None
        
        is_gold_related = "ذهب" in caption.lower() or "gold" in caption.lower()
        is_kuwait_related = "كويت" in caption.lower() or "kuwait" in caption.lower()
        
        if has_promotion or discount or is_gold_related or is_kuwait_related:
            offer = {
                "brand": brand_name or highlight.get("author", "Snapchat User"),
                "title": caption[:100] if caption else f"Snapchat Highlight from {highlight.get('author')}",
                "description": caption or "",
                "discount_percentage": discount,
                "source": "snapchat",
                "source_url": highlight.get("storyUrl", f"https://www.snapchat.com/add/{highlight.get('author')}"),
                "scraped_at": datetime.utcnow(),
            }
            highlight_offers.append(offer)
    
    return story_offers, highlight_offers


class ScrapeSnapchatByUsernameRequest(BaseModel):
    username: str
    brand_name: str


class ScrapeSnapchatGoldOffersRequest(BaseModel):
    search_query: str = "ذهب كويت"


@router.post("/scrape-snapchat/by-username")
def scrape_snapchat_by_username(
    request: ScrapeSnapchatByUsernameRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape Snapchat by username (returns stories and highlights separately).
    Equivalent to scrapeSnapchatByUsername in TypeScript.
    """
    try:
        # Get business keywords first
        config = (
            db.query(CompetitorBusinessConfig)
            .filter(
                CompetitorBusinessConfig.client_id == current_client.id,
                CompetitorBusinessConfig.is_active.is_(True),
            )
            .first()
        )
        
        business_keywords = []
        offer_keywords = []
        price_keywords = []
        
        if config:
            business_keywords = [k.strip() for k in config.keywords.split(",") if k.strip()] if config.keywords else []
            offer_keywords = [k.strip() for k in config.offer_keywords.split(",") if k.strip()] if config.offer_keywords else []
            price_keywords = [k.strip() for k in config.price_keywords.split(",") if k.strip()] if config.price_keywords else []
        
        # Run async scraping in a thread pool
        import concurrent.futures
        
        def run_in_thread():
            import signal as signal_module
            import threading
            
            original_signal = signal_module.signal
            
            def patched_signal(signalnum, handler):
                try:
                    if threading.current_thread() is not threading.main_thread():
                        return signal_module.SIG_DFL
                except:
                    pass
                try:
                    return original_signal(signalnum, handler)
                except (ValueError, OSError):
                    return signal_module.SIG_DFL
            
            signal_module.signal = patched_signal
            
            try:
                import pyppeteer.launcher as launcher_module
                launcher_module.signal = signal_module
            except:
                pass
            
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(_scrape_snapchat_profile_async(request.username))
            finally:
                new_loop.close()
                try:
                    signal_module.signal = original_signal
                except:
                    pass
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            result = future.result(timeout=300)
        
        stories = result.get("stories", [])
        highlights = result.get("highlights", [])
        screenshot_url = result.get("screenshot_url")
        
        # If no stories/highlights found, analyze screenshot
        screenshot_offers = []
        if len(stories) == 0 and len(highlights) == 0 and screenshot_url:
            print(f"[Snapchat] No stories/highlights found, analyzing screenshot for {request.username}")
            # Run analysis in async context
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            screenshot_offers = loop.run_until_complete(
                _analyze_snapchat_screenshot(screenshot_url, request.brand_name, request.username, db, current_client.id)
            )
        
        # Convert to offers
        story_offers, highlight_offers = _convert_snapchat_to_offers(
            stories, highlights, request.brand_name, business_keywords, offer_keywords, price_keywords
        )
        
        # Add screenshot offers to story offers if no stories found
        if len(story_offers) == 0 and screenshot_offers:
            story_offers.extend(screenshot_offers)
        
        # Persist offers to database
        total_stories = 0
        total_highlights = 0
        
        for offer in story_offers:
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "snapchat",
                    CompetitorBrandOffer.source_url == offer["source_url"],
                )
                .first()
            )
            
            if not existing:
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
                total_stories += 1
        
        for offer in highlight_offers:
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "snapchat",
                    CompetitorBrandOffer.source_url == offer["source_url"],
                )
                .first()
            )
            
            if not existing:
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
                total_highlights += 1
        
        db.commit()
        
        return {
            "success": True,
            "stories": [
                {
                    "brand": o["brand"],
                    "title": o["title"],
                    "description": o.get("description"),
                    "discountPercentage": o.get("discount_percentage"),
                    "source": o["source"],
                    "sourceUrl": o["source_url"],
                }
                for o in story_offers
            ],
            "highlights": [
                {
                    "brand": o["brand"],
                    "title": o["title"],
                    "description": o.get("description"),
                    "discountPercentage": o.get("discount_percentage"),
                    "source": o["source"],
                    "sourceUrl": o["source_url"],
                }
                for o in highlight_offers
            ],
            "message": f"تم جمع {total_stories} قصة و {total_highlights} highlight من حساب @{request.username}",
        }
    except Exception as exc:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل جمع بيانات Snapchat: {str(exc)}",
        )


@router.post("/scrape-snapchat/{account_id}")
def scrape_snapchat_account(
    account_id: int,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape a specific Snapchat account by ID.
    """
    # Verify the account exists and belongs to the current client
    account = (
        db.query(CompetitorSocialMediaAccount)
        .filter(
            CompetitorSocialMediaAccount.id == account_id,
            CompetitorSocialMediaAccount.client_id == current_client.id,
            CompetitorSocialMediaAccount.platform == "snapchat",
        )
        .first()
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الحساب غير موجود أو لا ينتمي إلى حسابك",
        )
    
    if not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="الحساب غير نشط. يرجى تفعيله أولاً",
        )
    
    try:
        # Get business keywords first
        config = (
            db.query(CompetitorBusinessConfig)
            .filter(
                CompetitorBusinessConfig.client_id == current_client.id,
                CompetitorBusinessConfig.is_active.is_(True),
            )
            .first()
        )
        
        business_keywords = []
        offer_keywords = []
        price_keywords = []
        
        if config:
            business_keywords = [k.strip() for k in config.keywords.split(",") if k.strip()] if config.keywords else []
            offer_keywords = [k.strip() for k in config.offer_keywords.split(",") if k.strip()] if config.offer_keywords else []
            price_keywords = [k.strip() for k in config.price_keywords.split(",") if k.strip()] if config.price_keywords else []
        
        # Run async scraping in a thread pool
        import concurrent.futures
        
        def run_in_thread():
            import signal as signal_module
            import threading
            
            original_signal = signal_module.signal
            
            def patched_signal(signalnum, handler):
                try:
                    if threading.current_thread() is not threading.main_thread():
                        return signal_module.SIG_DFL
                except:
                    pass
                try:
                    return original_signal(signalnum, handler)
                except (ValueError, OSError):
                    return signal_module.SIG_DFL
            
            signal_module.signal = patched_signal
            
            try:
                import pyppeteer.launcher as launcher_module
                launcher_module.signal = signal_module
            except:
                pass
            
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(_scrape_snapchat_profile_async(account.username))
            finally:
                new_loop.close()
                try:
                    signal_module.signal = original_signal
                except:
                    pass
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            result = future.result(timeout=300)
        
        stories = result.get("stories", [])
        highlights = result.get("highlights", [])
        screenshot_url = result.get("screenshot_url")
        
        # If no stories/highlights found, analyze screenshot
        screenshot_offers = []
        if len(stories) == 0 and len(highlights) == 0 and screenshot_url:
            print(f"[Snapchat] No stories/highlights found, analyzing screenshot for {account.username}")
            # Run analysis in async context
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            screenshot_offers = loop.run_until_complete(
                _analyze_snapchat_screenshot(screenshot_url, account.brand_name, account.username, db, current_client.id)
            )
        
        # Convert to offers
        story_offers, highlight_offers = _convert_snapchat_to_offers(
            stories, highlights, account.brand_name, business_keywords, offer_keywords, price_keywords
        )
        
        # Add screenshot offers to story offers if no stories found
        if len(story_offers) == 0 and screenshot_offers:
            story_offers.extend(screenshot_offers)
        
        # Persist offers to database
        total_stories = 0
        total_highlights = 0
        
        for offer in story_offers:
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "snapchat",
                    CompetitorBrandOffer.source_url == offer["source_url"],
                )
                .first()
            )
            
            if not existing:
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
                total_stories += 1
        
        for offer in highlight_offers:
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "snapchat",
                    CompetitorBrandOffer.source_url == offer["source_url"],
                )
                .first()
            )
            
            if not existing:
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
                total_highlights += 1
        
        db.commit()
        
        return {
            "success": True,
            "stories": [
                {
                    "brand": o["brand"],
                    "title": o["title"],
                    "description": o.get("description"),
                    "discountPercentage": o.get("discount_percentage"),
                    "source": o["source"],
                    "sourceUrl": o["source_url"],
                }
                for o in story_offers
            ],
            "highlights": [
                {
                    "brand": o["brand"],
                    "title": o["title"],
                    "description": o.get("description"),
                    "discountPercentage": o.get("discount_percentage"),
                    "source": o["source"],
                    "sourceUrl": o["source_url"],
                }
                for o in highlight_offers
            ],
            "message": f"تم جمع {total_stories} قصة و {total_highlights} highlight من حساب @{account.username}",
        }
    except Exception as exc:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل جمع بيانات Snapchat: {str(exc)}",
        )


@router.post("/scrape-snapchat/all")
def scrape_all_snapchat_accounts(
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape all active Snapchat accounts for the current client.
    Equivalent to scrapeAllSnapchatGoldContent in TypeScript.
    """
    # Get all active Snapchat accounts
    accounts = (
        db.query(CompetitorSocialMediaAccount)
        .filter(
            CompetitorSocialMediaAccount.client_id == current_client.id,
            CompetitorSocialMediaAccount.platform == "snapchat",
            CompetitorSocialMediaAccount.is_active.is_(True),
        )
        .all()
    )
    
    if not accounts:
        return {
            "success": False,
            "totalStories": 0,
            "totalHighlights": 0,
            "message": "لا توجد حسابات Snapchat نشطة",
        }
    
    print(f"[Snapchat Scraper] Found {len(accounts)} active Snapchat accounts")
    
    # Get business keywords first
    config = (
        db.query(CompetitorBusinessConfig)
        .filter(
            CompetitorBusinessConfig.client_id == current_client.id,
            CompetitorBusinessConfig.is_active.is_(True),
        )
        .first()
    )
    
    business_keywords = []
    offer_keywords = []
    price_keywords = []
    
    if config:
        business_keywords = [k.strip() for k in config.keywords.split(",") if k.strip()] if config.keywords else []
        offer_keywords = [k.strip() for k in config.offer_keywords.split(",") if k.strip()] if config.offer_keywords else []
        price_keywords = [k.strip() for k in config.price_keywords.split(",") if k.strip()] if config.price_keywords else []
    
    # Prepare account data
    accounts_data = [
        {
            "username": acc.username,
            "brand_name": acc.brand_name,
        }
        for acc in accounts
    ]
    
    # Scrape all accounts sequentially
    async def scrape_all_async(accounts_list, keywords_dict):
        browser = None
        all_story_offers = []
        all_highlight_offers = []
        
        try:
            # Patch signal handling
            import signal as signal_module
            import threading
            original_signal = signal_module.signal
            
            def safe_signal(signalnum, handler):
                try:
                    if threading.current_thread() is threading.main_thread():
                        return original_signal(signalnum, handler)
                except:
                    pass
                return signal_module.SIG_DFL
            
            signal_module.signal = safe_signal
            
            try:
                executable_path = os.environ.get('PUPPETEER_EXECUTABLE_PATH', '/usr/bin/chromium')
                if not os.path.exists(executable_path):
                    executable_path = None
                
                launch_options = {
                    "headless": True,
                    "args": [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                    ],
                }
                
                if executable_path and os.path.exists(executable_path):
                    launch_options["executablePath"] = executable_path
                
                browser = await launch(launch_options)
            finally:
                try:
                    signal_module.signal = original_signal
                except:
                    pass
            
            for i, account_data in enumerate(accounts_list):
                print(f"[Snapchat Scraper] Scraping account {i + 1}/{len(accounts_list)}: {account_data['username']}")
                
                try:
                    if i > 0:
                        await asyncio.sleep(3)  # Delay between accounts
                    
                    result = await _scrape_snapchat_profile_async(account_data['username'])
                    stories = result.get("stories", [])
                    highlights = result.get("highlights", [])
                    
                    # Convert to offers
                    story_offers, highlight_offers = _convert_snapchat_to_offers(
                        stories, highlights, account_data['brand_name'],
                        keywords_dict['business_keywords'],
                        keywords_dict['offer_keywords'],
                        keywords_dict['price_keywords']
                    )
                    
                    all_story_offers.extend(story_offers)
                    all_highlight_offers.extend(highlight_offers)
                    
                    print(f"[Snapchat Scraper] Found {len(story_offers)} story offers and {len(highlight_offers)} highlight offers from {account_data['username']}")
                    
                except Exception as error:
                    print(f"[Snapchat Scraper] Error scraping {account_data['username']}: {error}")
            
            await browser.close()
            
            # Remove duplicates based on sourceUrl
            unique_story_offers = list({o["source_url"]: o for o in all_story_offers}.values())
            unique_highlight_offers = list({o["source_url"]: o for o in all_highlight_offers}.values())
            
            return {
                "success": len(unique_story_offers) > 0 or len(unique_highlight_offers) > 0,
                "totalStories": len(unique_story_offers),
                "totalHighlights": len(unique_highlight_offers),
                "all_story_offers": unique_story_offers,
                "all_highlight_offers": unique_highlight_offers,
                "message": f"تم جمع {len(unique_story_offers)} قصة و {len(unique_highlight_offers)} highlight من Snapchat",
            }
        except Exception as error:
            if browser:
                await browser.close()
            print(f"[Snapchat Scraper] Error in scrape_all_async: {error}")
            return {
                "success": False,
                "totalStories": 0,
                "totalHighlights": 0,
                "all_story_offers": [],
                "all_highlight_offers": [],
                "message": f"خطأ: {str(error)}",
            }
    
    # Run async function in a thread pool
    try:
        import concurrent.futures
        
        keywords_dict = {
            "business_keywords": business_keywords,
            "offer_keywords": offer_keywords,
            "price_keywords": price_keywords,
        }
        
        def run_in_thread():
            import signal as signal_module
            import threading
            
            original_signal = signal_module.signal
            
            def patched_signal(signalnum, handler):
                try:
                    if threading.current_thread() is not threading.main_thread():
                        return signal_module.SIG_DFL
                except:
                    pass
                try:
                    return original_signal(signalnum, handler)
                except (ValueError, OSError):
                    return signal_module.SIG_DFL
            
            signal_module.signal = patched_signal
            
            try:
                import pyppeteer.launcher as launcher_module
                launcher_module.signal = signal_module
            except:
                pass
            
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(scrape_all_async(accounts_data, keywords_dict))
            finally:
                new_loop.close()
                try:
                    signal_module.signal = original_signal
                except:
                    pass
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            result = future.result(timeout=600)  # 10 minute timeout
        
        # Save offers to database (in main thread)
        total_stories = 0
        total_highlights = 0
        
        for offer in result.get("all_story_offers", []):
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "snapchat",
                    CompetitorBrandOffer.source_url == offer["source_url"],
                )
                .first()
            )
            
            if not existing:
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
                total_stories += 1
        
        for offer in result.get("all_highlight_offers", []):
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "snapchat",
                    CompetitorBrandOffer.source_url == offer["source_url"],
                )
                .first()
            )
            
            if not existing:
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
                total_highlights += 1
        
        db.commit()
        
        return {
            "success": total_stories > 0 or total_highlights > 0,
            "totalStories": total_stories,
            "totalHighlights": total_highlights,
            "message": result.get("message", ""),
        }
    except Exception as exc:
        db.rollback()
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "totalStories": 0,
            "totalHighlights": 0,
            "message": f"خطأ: {str(exc)}",
        }


@router.post("/scrape-snapchat/gold-offers")
def scrape_snapchat_gold_offers(
    request: ScrapeSnapchatGoldOffersRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape Snapchat gold offers by search query.
    Equivalent to scrapeSnapchatGoldOffers in TypeScript.
    Note: This endpoint uses a predefined list of known Kuwait gold/jewelry accounts.
    """
    # List of known Kuwait gold/jewelry Snapchat usernames
    kuwait_gold_accounts = [
        "thhab_com",
        "thahab.kw",
        "gwaisha_alarbash",
    ]
    
    # Get business keywords
    config = (
        db.query(CompetitorBusinessConfig)
        .filter(
            CompetitorBusinessConfig.client_id == current_client.id,
            CompetitorBusinessConfig.is_active.is_(True),
        )
        .first()
    )
    
    business_keywords = []
    offer_keywords = []
    price_keywords = []
    
    if config:
        business_keywords = [k.strip() for k in config.keywords.split(",") if k.strip()] if config.keywords else []
        offer_keywords = [k.strip() for k in config.offer_keywords.split(",") if k.strip()] if config.offer_keywords else []
        price_keywords = [k.strip() for k in config.price_keywords.split(",") if k.strip()] if config.price_keywords else []
    
    # Scrape each account
    async def scrape_accounts_async(usernames, keywords_dict):
        browser = None
        all_story_offers = []
        all_highlight_offers = []
        
        try:
            # Patch signal handling
            import signal as signal_module
            import threading
            original_signal = signal_module.signal
            
            def safe_signal(signalnum, handler):
                try:
                    if threading.current_thread() is threading.main_thread():
                        return original_signal(signalnum, handler)
                except:
                    pass
                return signal_module.SIG_DFL
            
            signal_module.signal = safe_signal
            
            try:
                executable_path = os.environ.get('PUPPETEER_EXECUTABLE_PATH', '/usr/bin/chromium')
                if not os.path.exists(executable_path):
                    executable_path = None
                
                launch_options = {
                    "headless": True,
                    "args": [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                    ],
                }
                
                if executable_path and os.path.exists(executable_path):
                    launch_options["executablePath"] = executable_path
                
                browser = await launch(launch_options)
            finally:
                try:
                    signal_module.signal = original_signal
                except:
                    pass
            
            for username in usernames:
                print(f"[Snapchat Gold Offers] Scraping account: {username}")
                result = await _scrape_snapchat_profile_async(username)
                stories = result.get("stories", [])
                highlights = result.get("highlights", [])
                
                # Convert to offers
                story_offers, highlight_offers = _convert_snapchat_to_offers(
                    stories, highlights, username,
                    keywords_dict['business_keywords'],
                    keywords_dict['offer_keywords'],
                    keywords_dict['price_keywords']
                )
                
                all_story_offers.extend(story_offers)
                all_highlight_offers.extend(highlight_offers)
                
                await asyncio.sleep(2)  # Delay between accounts
            
            await browser.close()
            
            # Remove duplicates
            unique_offers = list({o["source_url"]: o for o in all_story_offers + all_highlight_offers}.values())
            
            return unique_offers
        except Exception as error:
            if browser:
                await browser.close()
            print(f"[Snapchat Gold Offers] Error: {error}")
            return []
    
    # Run async function in a thread pool
    try:
        import concurrent.futures
        
        keywords_dict = {
            "business_keywords": business_keywords,
            "offer_keywords": offer_keywords,
            "price_keywords": price_keywords,
        }
        
        def run_in_thread():
            import signal as signal_module
            import threading
            
            original_signal = signal_module.signal
            
            def patched_signal(signalnum, handler):
                try:
                    if threading.current_thread() is not threading.main_thread():
                        return signal_module.SIG_DFL
                except:
                    pass
                try:
                    return original_signal(signalnum, handler)
                except (ValueError, OSError):
                    return signal_module.SIG_DFL
            
            signal_module.signal = patched_signal
            
            try:
                import pyppeteer.launcher as launcher_module
                launcher_module.signal = signal_module
            except:
                pass
            
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(scrape_accounts_async(kuwait_gold_accounts, keywords_dict))
            finally:
                new_loop.close()
                try:
                    signal_module.signal = original_signal
                except:
                    pass
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            all_offers = future.result(timeout=600)
        
        # Save offers to database
        total_offers = 0
        for offer in all_offers:
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "snapchat",
                    CompetitorBrandOffer.source_url == offer["source_url"],
                )
                .first()
            )
            
            if not existing:
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
                total_offers += 1
        
        db.commit()
        
        return {
            "success": total_offers > 0,
            "offers": [
                {
                    "brand": o["brand"],
                    "title": o["title"],
                    "description": o.get("description"),
                    "discountPercentage": o.get("discount_percentage"),
                    "source": o["source"],
                    "sourceUrl": o["source_url"],
                }
                for o in all_offers
            ],
            "message": f"تم جمع {total_offers} عرض من Snapchat" if total_offers > 0 else "لم يتم العثور على عروض",
        }
    except Exception as exc:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل جمع عروض Snapchat: {str(exc)}",
        )


# @router.post("/scrape/website")

