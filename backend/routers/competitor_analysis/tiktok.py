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


class ScrapeTikTokRequest(BaseModel):
    search_query: str
    business_config: Optional[Dict[str, Any]] = None


def _extract_info_from_analysis(analysis_text: str) -> Dict[str, Any]:
    """
    Extract structured information from Gemini analysis text.
    Similar to extractInfoFromAnalysis in TypeScript.
    """
    info = {
        "offers": [],
        "prices": [],
        "is_promotional": False,
    }
    
    # Check for promotional content
    promotional_keywords = [
        r"خصم|تخفيض|عرض|promo|sale|discount|offer|special",
        r"%|percent|بالمئة",
        r"جديد|new|limited|محدود",
    ]
    
    is_promotional = any(re.search(keyword, analysis_text, re.IGNORECASE) for keyword in promotional_keywords)
    info["is_promotional"] = is_promotional
    
    # Extract offers (look for numbered lists or bullet points)
    offer_patterns = [
        re.compile(r"(?:عرض|offer|promo)[\s:]+(.+?)(?:\n|$)", re.IGNORECASE),
        re.compile(r"(\d+)[\.\)]\s*(.+?)(?:\n|$)", re.IGNORECASE),
        re.compile(r"[-•]\s*(.+?)(?:\n|$)", re.IGNORECASE),
    ]
    
    for pattern in offer_patterns:
        matches = pattern.finditer(analysis_text)
        for match in matches:
            offer_text = match.group(1) if match.group(1) else match.group(2)
            if offer_text and len(offer_text.strip()) > 5:
                info["offers"].append(offer_text.strip())
    
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


async def _analyze_tiktok_screenshot(
    screenshot_url: str,
    brand_name: str,
    username: str,
    db: Session,
    client_id: int
) -> List[Dict[str, Any]]:
    """
    Analyze screenshot and extract offers using Google Gemini API.
    Similar to analyzeTikTokScreenshotAndExtractOffers in TypeScript.
    """
    try:
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            print("[TikTok] GOOGLE_API_KEY not found, skipping image analysis")
            return []
        
        print(f"[TikTok] Analyzing screenshot for {username}")
        
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
                print(f"[TikTok] Error fetching image: {e}")
                return []
        
        if not image_data:
            print(f"[TikTok] Could not get image data from {screenshot_url}")
            return []
        
        # Check image size (max 20MB)
        if len(image_data) > 20 * 1024 * 1024:
            print(f"[TikTok] Image too large ({len(image_data)} bytes)")
            return []
        
        # Get business config for dynamic prompt
        config = (
            db.query(CompetitorBusinessConfig)
            .filter(
                CompetitorBusinessConfig.client_id == client_id,
                CompetitorBusinessConfig.is_active.is_(True),
            )
            .first()
        )
        
        business_type = config.business_type if config and config.business_type else "المحتوى"
        business_keywords = config.keywords if config and config.keywords else ""
        
        # Create analysis prompt
        context = f"صورة من حساب TikTok لـ {brand_name} (@{username})"
        
        prompt = f"""قم بتحليل هذه الصورة من {context}. ابحث عن:
1. أي عروض ترويجية أو خصومات مذكورة في الصورة
2. الأسعار إذا كانت موجودة
3. أي نصوص أو معلومات مهمة عن المنتجات
4. هل تحتوي الصورة على محتوى ترويجي؟

نوع العمل: {business_type}
الكلمات المفتاحية: {business_keywords}

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
                print(f"[TikTok] No candidates in Gemini response: {result}")
                analysis_text = ""
        except Exception as e:
            print(f"[TikTok] Error extracting text from Gemini response: {e}")
            analysis_text = ""
        
        if not analysis_text:
            print(f"[TikTok] No analysis result for {username}")
            return []
        
        # Extract structured information
        extracted_info = _extract_info_from_analysis(analysis_text)
        
        # Save analyzed image to database
        analyzed_image = CompetitorAnalyzedImage(
            client_id=client_id,
            brand_name=brand_name,
            image_url=screenshot_url,
            source="tiktok",
            source_url=f"https://www.tiktok.com/@{username}",
            analysis_result=analysis_text,
            extracted_info={
                "offers": extracted_info.get("offers", []),
                "prices": extracted_info.get("prices", []),
                "offersSection": extracted_info.get("offersSection")
            },
            is_promotional=extracted_info.get("promotionalContent", False),
        )
        db.add(analyzed_image)
        db.commit()
        
        # Convert analysis to offers
        offers = []
        
        if extracted_info.get("offers") and len(extracted_info["offers"]) > 0:
            for i, offer_text in enumerate(extracted_info["offers"]):
                # Extract discount if mentioned
                discount_match = re.search(r"(\d+)%?\s*(?:off|خصم|تخفيض|discount)", offer_text, re.IGNORECASE)
                discount = float(discount_match.group(1)) if discount_match else None
                
                offer = {
                    "brand": brand_name,
                    "title": f"[@{username}] {offer_text[:80]}",
                    "description": f"[{brand_name} - @{username}]\n\n{analysis_text}",
                    "discount_percentage": discount,
                    "source": "tiktok",
                    "source_url": f"https://www.tiktok.com/@{username}",
                    "scraped_at": datetime.utcnow(),
                }
                offers.append(offer)
        elif extracted_info.get("is_promotional") or analysis_text:
            # If promotional content detected but no structured offers, create one from analysis
            discount_match = re.search(r"(\d+)%?\s*(?:off|خصم|تخفيض|discount)", analysis_text, re.IGNORECASE)
            discount = float(discount_match.group(1)) if discount_match else None
            
            offer = {
                "brand": brand_name,
                "title": f"[@{username}] عروض من {brand_name}",
                "description": f"[{brand_name} - @{username}]\n\n{analysis_text}",
                "discount_percentage": discount,
                "source": "tiktok",
                "source_url": f"https://www.tiktok.com/@{username}",
                "scraped_at": datetime.utcnow(),
            }
            offers.append(offer)
        
        print(f"[TikTok] Extracted {len(offers)} offers from screenshot analysis for {username}")
        return offers
        
    except Exception as e:
        print(f"[TikTok] Error analyzing screenshot: {e}")
        import traceback
        traceback.print_exc()
        return []


async def _take_tiktok_screenshot(page, username: str) -> Optional[str]:
    """
    Take screenshot of TikTok profile page.
    Similar to takeTikTokProfileScreenshot in TypeScript.
    """
    try:
        print(f"[TikTok] Taking screenshot for {username}...")
        
        # Wait for page to load
        await asyncio.sleep(3)
        
        # Check if videos are visible
        has_videos = await page.evaluate("""() => {
            return document.querySelectorAll('a[href*="/video/"]').length > 0;
        }""")
        
        if not has_videos:
            print(f"[TikTok] No videos visible yet, scrolling to load...")
            # Scroll to trigger lazy loading
            for i in range(3):
                await page.evaluate("""() => {
                    window.scrollTo(0, document.body.scrollHeight);
                }""")
                await asyncio.sleep(2)
        
        # Scroll back to top
        await page.evaluate("""() => {
            window.scrollTo(0, 0);
        }""")
        
        # Wait for animations
        await asyncio.sleep(3)
        
        # Wait for images to load
        await page.evaluate("""() => {
            return Promise.all(
                Array.from(document.images).map((img) => {
                    if (img.complete) return Promise.resolve();
                    return new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                })
            );
        }""")
        
        await asyncio.sleep(2)
        
        # Take screenshot as base64
        print(f"[TikTok] Capturing full page screenshot...")
        screenshot_buffer = await page.screenshot({
            "fullPage": True,
            "encoding": "base64",
        })
        
        # Upload to Cloudinary (same as Snapchat)
        import cloudinary
        import cloudinary.uploader
        from io import BytesIO
        
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET")
        )
        
        # Convert base64 to bytes
        screenshot_bytes = base64.b64decode(screenshot_buffer)
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            BytesIO(screenshot_bytes),
            folder="tiktok-screenshots",
            public_id=f"tiktok-{username}-{int(datetime.now().timestamp())}",
            resource_type="image"
        )
        
        screenshot_url = result.get("secure_url")
        print(f"[TikTok] Screenshot saved: {screenshot_url}")
        return screenshot_url
        
    except Exception as e:
        print(f"[TikTok] Error taking screenshot: {e}")
        import traceback
        traceback.print_exc()
        return None


async def _extract_tiktok_videos(page, username: str) -> List[Dict[str, Any]]:
    """
    Extract TikTok videos from profile page.
    Similar to extractTikTokVideos in TypeScript.
    """
    try:
        # Wait for content to load
        await asyncio.sleep(5)
        
        # Scroll multiple times to load videos
        print("[TikTok] Scrolling to load all videos...")
        for i in range(5):
            await page.evaluate("""() => {
                window.scrollTo(0, document.body.scrollHeight);
            }""")
            await asyncio.sleep(3)
            
            video_count = await page.evaluate("""() => {
                return document.querySelectorAll('a[href*="/video/"]').length;
            }""")
            print(f"[TikTok] Found {video_count} video links after scroll {i + 1}")
        
        await asyncio.sleep(3)
        
        # Extract videos from page
        videos = await page.evaluate("""(username) => {
            const videoList = [];
            
            // Method 1: Extract from __UNIVERSAL_DATA_FOR_REHYDRATION__ script
            const scripts = document.querySelectorAll('script[id="__UNIVERSAL_DATA_FOR_REHYDRATION__"]');
            scripts.forEach((script) => {
                try {
                    const data = JSON.parse(script.textContent || '{}');
                    
                    // Recursive function to find videos in data structure
                    const findVideosInData = (obj, depth = 0) => {
                        if (!obj || typeof obj !== 'object' || depth > 6) return [];
                        
                        // Check if this object contains video data
                        if (obj.itemInfo?.itemStruct || obj.itemStruct) {
                            return [obj.itemInfo?.itemStruct || obj.itemStruct];
                        }
                        
                        if (Array.isArray(obj)) {
                            const results = [];
                            for (const item of obj) {
                                results.push(...findVideosInData(item, depth + 1));
                            }
                            return results;
                        }
                        
                        // Check for common TikTok video data structures
                        if (obj.videoList && Array.isArray(obj.videoList)) return obj.videoList;
                        if (obj.itemList && Array.isArray(obj.itemList)) return obj.itemList;
                        if (obj.videos && Array.isArray(obj.videos)) return obj.videos;
                        
                        // Recursively search object properties
                        for (const key in obj) {
                            if (obj.hasOwnProperty(key) && !key.startsWith('__')) {
                                const found = findVideosInData(obj[key], depth + 1);
                                if (found.length > 0) return found;
                            }
                        }
                        
                        return [];
                    };
                    
                    const foundVideos = findVideosInData(data);
                    
                    foundVideos.forEach((video) => {
                        const videoData = video?.itemStruct || video?.itemInfo?.itemStruct || video;
                        
                        if (videoData?.id) {
                            const videoId = String(videoData.id);
                            const caption = videoData.desc || videoData.description || '';
                            const authorId = videoData.author?.uniqueId || videoData.author?.id || username;
                            const thumbnailUrl = videoData.video?.cover || videoData.video?.dynamicCover || videoData.cover || videoData.thumbnail || '';
                            
                            videoList.push({
                                videoId: videoId,
                                caption: caption.substring(0, 500),
                                author: authorId,
                                videoUrl: `https://www.tiktok.com/@${authorId}/video/${videoId}`,
                                thumbnailUrl: thumbnailUrl,
                            });
                        }
                    });
                } catch (e) {
                    // Ignore parse errors
                }
            });
            
            // Method 2: Fallback - Extract from DOM elements
            if (videoList.length === 0) {
                const videoLinks = document.querySelectorAll('a[href*="/video/"]');
                const seenUrls = new Set();
                
                videoLinks.forEach((link) => {
                    const href = link.href;
                    if (!href || seenUrls.has(href)) return;
                    seenUrls.add(href);
                    
                    const videoIdMatch = href.match(/\\/video\\/(\\d+)/);
                    if (!videoIdMatch) return;
                    
                    const videoId = videoIdMatch[1];
                    const container = link.closest('div[class*="DivItemContainer"], div[class*="ItemContainer"]');
                    const captionEl = container?.querySelector('[data-e2e="user-post-item-desc"], span[class*="SpanText"], p');
                    const caption = captionEl?.textContent || '';
                    const imgEl = container?.querySelector('img') || link.querySelector('img');
                    const thumbnailUrl = imgEl?.src || '';
                    
                    videoList.push({
                        videoId: videoId,
                        caption: caption.substring(0, 500),
                        author: username,
                        videoUrl: href.startsWith('http') ? href : `https://www.tiktok.com${href}`,
                        thumbnailUrl: thumbnailUrl,
                    });
                });
            }
            
            // Remove duplicates based on videoId
            const uniqueVideos = Array.from(
                new Map(videoList.map((v) => [v.videoId, v])).values()
            );
            
            return uniqueVideos.slice(0, 20); // Limit to 20 latest videos
        }""", username)
        
        return videos
        
    except Exception as e:
        print(f"[TikTok] Error extracting videos: {e}")
        import traceback
        traceback.print_exc()
        return []


async def _scrape_tiktok_profile_async(username: str) -> Dict[str, Any]:
    """
    Scrape TikTok profile asynchronously.
    Similar to scrapeTikTokAccount in TypeScript.
    """
    browser = None
    try:
        # Signal handling inside async function (same as Snapchat)
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
            # Check for executable path - try system Chromium first, then fallback
            executable_path = os.environ.get('PUPPETEER_EXECUTABLE_PATH', '/usr/bin/chromium')
            if not os.path.exists(executable_path):
                # Try alternative paths
                alternative_paths = ['/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/chrome']
                for alt_path in alternative_paths:
                    if os.path.exists(alt_path):
                        executable_path = alt_path
                        break
                else:
                    executable_path = None  # Let pyppeteer download its own
            
            # Launch browser with options similar to Snapchat
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
            
            # Only set executablePath if we have a valid path
            if executable_path and os.path.exists(executable_path):
                launch_options["executablePath"] = executable_path
                print(f"[TikTok] Using Chromium at: {executable_path}")
            else:
                print(f"[TikTok] Using pyppeteer's bundled Chromium")
            
            # Retry logic for browser launch
            max_retries = 3
            browser = None
            for attempt in range(max_retries):
                try:
                    print(f"[TikTok] Launching browser (attempt {attempt + 1}/{max_retries})...")
                    browser = await launch(launch_options)
                    # Wait a bit to ensure browser is ready
                    await asyncio.sleep(2)
                    # Verify browser is connected
                    try:
                        pages = await browser.pages()
                        print(f"[TikTok] Browser launched successfully, {len(pages)} pages available")
                    except Exception as verify_error:
                        print(f"[TikTok] Browser verification failed: {verify_error}")
                        if browser:
                            try:
                                await browser.close()
                            except:
                                pass
                        browser = None
                        raise Exception(f"Browser not properly connected: {verify_error}")
                    break
                except Exception as launch_error:
                    print(f"[TikTok] Browser launch attempt {attempt + 1} failed: {launch_error}")
                    if browser:
                        try:
                            await browser.close()
                        except:
                            pass
                        browser = None
                    if attempt < max_retries - 1:
                        await asyncio.sleep(3)  # Wait longer between retries
                    else:
                        print(f"[TikTok] All browser launch attempts failed")
                        raise
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
        
        url = f"https://www.tiktok.com/@{username}"
        print(f"[TikTok] Navigating to: {url}")
        
        try:
            await page.goto(url, {
                "waitUntil": "domcontentloaded",
                "timeout": 90000
            })
        except Exception as e:
            print(f"[TikTok] Navigation timeout, continuing anyway...")
        
        # Wait for page to load
        await asyncio.sleep(5)
        
        # Wait for video elements
        try:
            await page.waitForSelector('a[href*="/video/"]', {"timeout": 15000})
        except:
            print("[TikTok] Video elements not found immediately, will try after scrolling...")
        
        # Scroll to load more content
        for i in range(5):
            await page.evaluate("""() => {
                window.scrollTo(0, document.body.scrollHeight);
            }""")
            await asyncio.sleep(3)
        
        await asyncio.sleep(5)
        
        # Scroll back to top
        await page.evaluate("""() => {
            window.scrollTo(0, 0);
        }""")
        await asyncio.sleep(2)
        
        # Take screenshot
        screenshot_url = await _take_tiktok_screenshot(page, username)
        
        # Extract videos
        videos = await _extract_tiktok_videos(page, username)
        
        await browser.close()
        
        return {
            "videos": videos,
            "screenshot_url": screenshot_url,
        }
        
    except Exception as e:
        print(f"[TikTok] Error scraping profile: {e}")
        import traceback
        traceback.print_exc()
        if browser:
            try:
                await browser.close()
            except:
                pass
        return {
            "videos": [],
            "screenshot_url": None,
        }


def _convert_tiktok_to_offers(
    videos: List[Dict[str, Any]],
    brand_name: str,
    business_keywords: List[str],
    offer_keywords: List[str],
    price_keywords: List[str],
) -> List[Dict[str, Any]]:
    """
    Convert TikTok videos to offers.
    """
    offers = []
    
    # Build promotional patterns
    offer_patterns = []
    if offer_keywords:
        offer_patterns = [re.compile(k, re.IGNORECASE) for k in offer_keywords]
    else:
        offer_patterns = [re.compile(r"خصم|تخفيض|عرض|promo|sale|discount|offer|special|جديد|new|limited|محدود", re.IGNORECASE)]
    
    promotional_keywords = offer_patterns + [
        re.compile(r"%|percent|بالمئة|في المئة", re.IGNORECASE),
        re.compile(r"كويت|kuwait|الكويت", re.IGNORECASE),
    ]
    
    # Build business keyword patterns
    keyword_patterns = [re.compile(k, re.IGNORECASE) for k in business_keywords] if business_keywords else []
    
    for video in videos[:15]:  # Limit to 15 videos
        caption = video.get("caption", "")
        
        # Check if matches business keywords
        matches_business = True
        if keyword_patterns:
            matches_business = any(pattern.search(caption) for pattern in keyword_patterns)
        
        # Check for promotional content
        has_promotion = any(pattern.search(caption) for pattern in promotional_keywords)
        
        # Extract discount
        discount_match = re.search(r"(\d+)%?\s*(?:off|خصم|تخفيض|discount|توفير)", caption, re.IGNORECASE)
        discount = float(discount_match.group(1)) if discount_match else None
        
        # Save if matches business keywords AND (has promotion/discount OR is latest video)
        is_priority = matches_business and (has_promotion or discount)
        is_latest = video == videos[0] if videos else False
        
        if is_priority or is_latest:
            offer = {
                "brand": brand_name or video.get("author", "TikTok Creator"),
                "title": f"[@{video.get('author', '')}] {caption[:80] if caption else f'فيديو من {brand_name}'}",
                "description": f"[{brand_name} - @{video.get('author', '')}]\n\n{caption}",
                "discount_percentage": discount,
                "source": "tiktok",
                "source_url": video.get("videoUrl", f"https://www.tiktok.com/@{video.get('author', '')}"),
                "scraped_at": datetime.utcnow(),
            }
            offers.append(offer)
    
    return offers


@router.post("/scrape/tiktok")
def scrape_tiktok(
    request: ScrapeTikTokRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape TikTok offers by search query.
    """
    return {
        "success": True,
        "offers": [],
        "message": "تم بدء عملية جمع بيانات TikTok",
    }


@router.post("/scrape-tiktok/{account_id}")
def scrape_tiktok_account(
    account_id: int,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape a specific TikTok account by ID.
    """
    # Verify the account exists and belongs to the current client
    account = (
        db.query(CompetitorSocialMediaAccount)
        .filter(
            CompetitorSocialMediaAccount.id == account_id,
            CompetitorSocialMediaAccount.client_id == current_client.id,
            CompetitorSocialMediaAccount.platform == "tiktok",
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
                return new_loop.run_until_complete(_scrape_tiktok_profile_async(account.username))
            finally:
                new_loop.close()
                try:
                    signal_module.signal = original_signal
                except:
                    pass
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            result = future.result(timeout=300)
        
        videos = result.get("videos", [])
        screenshot_url = result.get("screenshot_url")
        
        # Analyze screenshot if available
        screenshot_offers = []
        if screenshot_url:
            print(f"[TikTok] Analyzing screenshot for {account.username}")
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            screenshot_offers = loop.run_until_complete(
                _analyze_tiktok_screenshot(screenshot_url, account.brand_name, account.username, db, current_client.id)
            )
        
        # Convert videos to offers
        video_offers = _convert_tiktok_to_offers(
            videos, account.brand_name, business_keywords, offer_keywords, price_keywords
        )
        
        # Combine screenshot offers with video offers
        all_offers = screenshot_offers + video_offers
        
        # Persist offers to database
        total_saved = 0
        
        for offer in all_offers:
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "tiktok",
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
                total_saved += 1
        
        db.commit()
        
        return {
            "success": True,
            "totalOffers": total_saved,
            "message": f"تم جمع {total_saved} عرض من حساب @{account.username}",
        }
        
    except Exception as exc:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل جمع بيانات TikTok: {str(exc)}",
        )


@router.post("/scrape-tiktok/all")
def scrape_all_tiktok_accounts(
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape all active TikTok accounts.
    """
    accounts = (
        db.query(CompetitorSocialMediaAccount)
        .filter(
            CompetitorSocialMediaAccount.client_id == current_client.id,
            CompetitorSocialMediaAccount.platform == "tiktok",
            CompetitorSocialMediaAccount.is_active.is_(True),
        )
        .all()
    )
    
    if not accounts:
        return {
            "success": False,
            "totalOffers": 0,
            "message": "لا توجد حسابات TikTok نشطة في قاعدة البيانات",
        }
    
    total_offers = 0
    errors = []
    
    for account in accounts:
        try:
            result = scrape_tiktok_account(account.id, background_tasks, db, current_client)
            if result.get("success"):
                total_offers += result.get("totalOffers", 0)
        except Exception as e:
            errors.append(f"{account.brand_name}: {str(e)}")
    
    return {
        "success": total_offers > 0,
        "totalOffers": total_offers,
        "message": f"تم جمع {total_offers} عرض من TikTok. {'ملاحظة: ' + ', '.join(errors) if errors else ''}",
    }
