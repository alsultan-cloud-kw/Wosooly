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
    InstagramCredentials,
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
    InstagramCredentialsInput,
)
from utils.auth import get_current_client
from pydantic import BaseModel


router = APIRouter()


@router.post("/instagram-profiles", response_model=InstagramProfileResponse)
def add_instagram_profile(
    profile: InstagramProfileCreate,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Add or update an Instagram profile for the current client.
    This is the FastAPI equivalent of the original Next.js addInstagramProfile action.
    """
    try:
        # Check if account already exists for this client
        existing = (
            db.query(CompetitorSocialMediaAccount)
            .filter(
                CompetitorSocialMediaAccount.client_id == current_client.id,
                CompetitorSocialMediaAccount.username == profile.username,
                CompetitorSocialMediaAccount.platform == "instagram",
            )
            .first()
        )

        if existing:
            existing.brand_name = profile.brand_name
            existing.profile_url = profile.profile_url
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return InstagramProfileResponse(
                success=True,
                message="تم تحديث البروفايل بنجاح",
                data=SocialMediaAccountSchema.model_validate(existing),
            )

        account = CompetitorSocialMediaAccount(
            client_id=current_client.id,
            username=profile.username,
            brand_name=profile.brand_name,
            platform="instagram",
            profile_url=profile.profile_url,
            is_active=True,
        )
        db.add(account)
        db.commit()
        db.refresh(account)

        return InstagramProfileResponse(
            success=True,
            message="تم إضافة البروفايل بنجاح",
            data=SocialMediaAccountSchema.model_validate(account),
        )

    except IntegrityError:
        db.rollback()
        # Unique constraint violation, most likely duplicate username/platform per client
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="البروفايل موجود بالفعل",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل إضافة البروفايل: {str(e)}",
        )


@router.get("/instagram-profiles", response_model=List[SocialMediaAccountSchema])
def list_instagram_profiles(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
    active_only: bool = True,
):
    """
    List Instagram profiles for the current client.
    """
    query = db.query(CompetitorSocialMediaAccount).filter(
        CompetitorSocialMediaAccount.client_id == current_client.id,
        CompetitorSocialMediaAccount.platform == "instagram",
    )

    if active_only:
        query = query.filter(CompetitorSocialMediaAccount.is_active.is_(True))

    accounts = query.order_by(CompetitorSocialMediaAccount.created_at.desc()).all()
    return [SocialMediaAccountSchema.model_validate(acc) for acc in accounts]


@router.delete("/instagram-profiles/{profile_id}")
def delete_instagram_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Delete an Instagram profile for the current client.
    """
    account = (
        db.query(CompetitorSocialMediaAccount)
        .filter(
            CompetitorSocialMediaAccount.id == profile_id,
            CompetitorSocialMediaAccount.client_id == current_client.id,
            CompetitorSocialMediaAccount.platform == "instagram",
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="البروفايل غير موجود",
        )

    db.delete(account)
    db.commit()
    return {"success": True, "message": "تم حذف البروفايل بنجاح"}


@router.patch("/instagram-profiles/{profile_id}/toggle")
def toggle_instagram_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Toggle active status of an Instagram profile.
    """
    account = (
        db.query(CompetitorSocialMediaAccount)
        .filter(
            CompetitorSocialMediaAccount.id == profile_id,
            CompetitorSocialMediaAccount.client_id == current_client.id,
            CompetitorSocialMediaAccount.platform == "instagram",
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="البروفايل غير موجود",
        )

    account.is_active = not account.is_active
    db.commit()
    db.refresh(account)

    return {
        "success": True,
        "message": "تم تحديث حالة البروفايل بنجاح",
        "data": SocialMediaAccountSchema.model_validate(account),
    }


INSTAGRAM_EMAIL = os.getenv("INSTAGRAM_EMAIL", "tayehtayeh006@gmail.com")
INSTAGRAM_USERNAME = os.getenv("INSTAGRAM_USERNAME", "mgku.wait")
INSTAGRAM_PASSWORD = os.getenv("INSTAGRAM_PASSWORD", "@MG123456")


def get_instagram_credentials(db: Session, client_id: int) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Get Instagram credentials for a client.
    Returns (username, password, email) tuple.
    Falls back to environment variables if client credentials not found.
    """
    creds = db.query(InstagramCredentials).filter(
        InstagramCredentials.client_id == client_id
    ).first()
    
    if creds:
        return (creds.username, creds.password, creds.email)
    
    # Fallback to environment variables
    return (INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD, INSTAGRAM_EMAIL)


async def _login_to_instagram(page, username: Optional[str] = None, password: Optional[str] = None) -> bool:
    """
    Login to Instagram using pyppeteer.
    Equivalent to the TypeScript loginToInstagram function.
    """
    try:
        print("[Instagram Login] Navigating to login page...")
        await page.goto("https://www.instagram.com/accounts/login/", {
            "waitUntil": "networkidle2",
            "timeout": 60000
        })
        await asyncio.sleep(3)

        # Check if already logged in
        is_logged_in = await page.evaluate("""() => {
            return document.querySelector('a[href*="/direct/"]') !== null ||
                document.querySelector('svg[aria-label="Home"]') !== null;
        }""")

        if is_logged_in:
            print("[Instagram Login] Already logged in")
            return True

        # Wait for login form
        print("[Instagram Login] Waiting for login form...")
        await page.waitForSelector('input[name="username"]', {"timeout": 10000})
        await page.waitForSelector('input[name="password"]', {"timeout": 10000})
        await asyncio.sleep(2)

        # Fill in credentials
        print("[Instagram Login] Entering credentials...")
        login_username = username or INSTAGRAM_USERNAME
        login_password = password or INSTAGRAM_PASSWORD
        await page.type('input[name="username"]', login_username, {"delay": 100})
        await page.type('input[name="password"]', login_password, {"delay": 100})
        await asyncio.sleep(1)

        # Click login button
        print("[Instagram Login] Clicking login button...")
        login_button = await page.J('button[type="submit"]')
        if login_button:
            await login_button.click()
        else:
            # Try alternative - find button by text
            buttons = await page.JJ('button')
            for btn in buttons:
                text = await page.evaluate("(el) => el.textContent", btn)
                if text and "log in" in text.lower():
                    await btn.click()
                    break

        # Wait for navigation
        try:
            await page.waitForNavigation({"waitUntil": "networkidle2", "timeout": 30000})
        except:
            pass
        await asyncio.sleep(5)

        # Check if login was successful
        login_success = await page.evaluate("""() => {
            return document.querySelector('a[href*="/direct/"]') !== null ||
                document.querySelector('svg[aria-label="Home"]') !== null ||
                window.location.href.includes('/accounts/onetap/') ||
                window.location.href === 'https://www.instagram.com/';
        }""")

        if login_success:
            print("[Instagram Login] Login successful!")

            # Handle "Save Your Login Info?" prompt
            try:
                await asyncio.sleep(2)
                buttons = await page.JJ('button')
                for btn in buttons:
                    text = await page.evaluate("(el) => el.textContent?.toLowerCase() || ''", btn)
                    if "not now" in text or "لاحقاً" in text:
                        await btn.click()
                        await asyncio.sleep(2)
                        break
            except:
                pass

            # Handle "Turn on Notifications" prompt
            try:
                await asyncio.sleep(2)
                buttons = await page.JJ('button')
                for btn in buttons:
                    text = await page.evaluate("(el) => el.textContent?.toLowerCase() || ''", btn)
                    if "not now" in text or "لاحقاً" in text:
                        await btn.click()
                        await asyncio.sleep(2)
                        break
            except:
                pass

            return True
        else:
            error_message = await page.evaluate("""() => {
                const errorEl = document.querySelector('#slfErrorAlert, [role="alert"]');
                return errorEl?.textContent || '';
            }""")
            if error_message:
                print(f"[Instagram Login] Login failed: {error_message}")
            else:
                print("[Instagram Login] Login failed: Unknown error")
            return False
    except Exception as error:
        print(f"[Instagram Login] Error during login: {error}")
        return False


async def _extract_instagram_json(page, username: str) -> Optional[Dict[str, Any]]:
    """
    Extract JSON data from Instagram page using multiple methods.
    Equivalent to the TypeScript extractInstagramJSON function.
    """
    result = await page.evaluate("""() => {
        const debugInfo = {
            foundScripts: 0,
            scriptTypes: [],
            windowKeys: [],
            dataStructures: [],
            graphqlData: null,
        };

        // Log window object keys
        if (typeof window !== 'undefined') {
            debugInfo.windowKeys = Object.keys(window).filter(k =>
                k.includes('shared') || k.includes('data') || k.includes('graphql') || k.includes('require') ||
                k.includes('xdt') || k.includes('ig') || k.includes('__')
            );
        }

        // Try window._sharedData (but filter for ProfilePage data, not inbox)
        if (window._sharedData) {
            debugInfo.dataStructures.push('window._sharedData');
            // Check if it has ProfilePage data (profile page, not inbox)
            if (window._sharedData.entry_data && window._sharedData.entry_data.ProfilePage) {
                return { data: window._sharedData, debug: debugInfo };
            }
            // If no ProfilePage, still return it but we'll filter later
            return { data: window._sharedData, debug: debugInfo };
        }

        // Try window.__additionalDataLoaded
        if (window.__additionalDataLoaded) {
            debugInfo.dataStructures.push('window.__additionalDataLoaded');
            return { data: window.__additionalDataLoaded, debug: debugInfo };
        }

        // Try window.__d
        if (window.__d) {
            debugInfo.dataStructures.push('window.__d');
            try {
                const __d = window.__d;
                if (Array.isArray(__d) && __d.length > 0) {
                    for (const item of __d) {
                        if (item && typeof item === 'object') {
                            if (item.user || item.graphql?.user || item.edge_owner_to_timeline_media) {
                                debugInfo.graphqlData = 'found in __d';
                                return { data: item, debug: debugInfo };
                            }
                        }
                    }
                }
            } catch (e) {
                // Continue
            }
        }

        // Try script tags with JSON data
        const scripts = document.querySelectorAll('script[type="application/json"]');
        debugInfo.foundScripts = scripts.length;

        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            try {
                const text = script.textContent || "";
                debugInfo.scriptTypes.push(`script[${i}]: ${text.substring(0, 150)}...`);

                if (text.includes("ProfilePage") || text.includes("edge_owner_to_timeline_media") ||
                    text.includes("graphql") || text.includes("user") || text.includes("timeline") ||
                    text.includes("xdt_api") || text.includes("edge_web")) {
                    try {
                        const data = JSON.parse(text);
                        debugInfo.dataStructures.push(`script[${i}] contains ProfilePage/graphql`);

                        if (data.entry_data?.ProfilePage) return { data, debug: debugInfo };
                        if (data.require) return { data, debug: debugInfo };
                        if (data.graphql) return { data, debug: debugInfo };
                        if (data.xdt_api__v1__feed__user_timeline_graphql_connection) return { data, debug: debugInfo };
                        if (data.data?.user) return { data: data.data, debug: debugInfo };
                        if (data.user) return { data, debug: debugInfo };
                    } catch (parseError) {
                        debugInfo.scriptTypes.push(`script[${i}]: Parse error - ${parseError}`);
                    }
                }
            } catch (e) {
                debugInfo.scriptTypes.push(`script[${i}]: Error - ${e}`);
            }
        }

        // Try alternative: look for script tags with require("TimeSlice")
        const allScripts = document.querySelectorAll('script:not([type="application/json"])');
        for (let i = 0; i < Math.min(allScripts.length, 20); i++) {
            const script = allScripts[i];
            const text = script.textContent || "";
            if (text.includes("window._sharedData") || text.includes("ProfilePage") ||
                text.includes("graphql") || text.includes("edge_owner_to_timeline_media") ||
                text.includes("xdt_api") || text.includes("edge_web")) {
                try {
                    const patterns = [
                        /window\._sharedData\s*=\s*({[\s\S]+?});/,
                        /window\.__additionalDataLoaded\s*\([^,]+,\s*({[\s\S]+?})\)/,
                        /"ProfilePage":\s*(\[[\s\S]+?\])/,
                        /"graphql":\s*({[\s\S]+?})/,
                        /"xdt_api__v1__feed__user_timeline_graphql_connection":\s*({[\s\S]+?})/,
                        /"data":\s*({[\s\S]+?"user"[\s\S]+?})/,
                    ];

                    for (const pattern of patterns) {
                        const match = text.match(pattern);
                        if (match && match[1]) {
                            try {
                                const parsed = JSON.parse(match[1]);
                                debugInfo.dataStructures.push(`extracted from script[${i}] with pattern`);
                                return { data: parsed, debug: debugInfo };
                            } catch (e) {
                                try {
                                    const fixed = match[1].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                                    const parsed = JSON.parse(fixed);
                                    debugInfo.dataStructures.push(`extracted from script[${i}] (fixed)`);
                                    return { data: parsed, debug: debugInfo };
                                } catch (e2) {
                                    // Continue
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Continue
                }
            }
        }

        return { data: null, debug: debugInfo };
    }""")

    # Log debug info
    if result.get("debug"):
        print(f"[Instagram JSON Extraction] Debug Info: {json.dumps(result['debug'], indent=2)}")

    return result.get("data")


def _parse_instagram_posts(json_data: Optional[Dict[str, Any]], username: str) -> List[Dict[str, Any]]:
    """
    Parse Instagram posts from JSON data.
    Equivalent to the TypeScript parseInstagramPosts function.
    """
    posts = []

    try:
        if not json_data:
            print("[Instagram Parser] No JSON data provided")
            return []

        user_data = None
        edges = []

        # Method 1: ProfilePage structure
        if json_data.get("entry_data", {}).get("ProfilePage", [{}])[0].get("graphql", {}).get("user"):
            user_data = json_data["entry_data"]["ProfilePage"][0]["graphql"]["user"]
            edges = user_data.get("edge_owner_to_timeline_media", {}).get("edges", [])
            print(f"[Instagram Parser] Found {len(edges)} posts using ProfilePage structure")
        # Method 2: require structure
        elif json_data.get("require"):
            # Try to find user data in require array recursively
            def find_user_in_require(arr):
                for item in arr:
                    if isinstance(item, list):
                        found = find_user_in_require(item)
                        if found:
                            return found
                    elif isinstance(item, dict) and item.get("graphql", {}).get("user"):
                        return item["graphql"]["user"]
                return None

            user_data = find_user_in_require(json_data["require"])
            if user_data:
                edges = user_data.get("edge_owner_to_timeline_media", {}).get("edges", [])
                print(f"[Instagram Parser] Found {len(edges)} posts using require structure")
        # Method 3: Direct graphql structure
        elif json_data.get("graphql", {}).get("user"):
            user_data = json_data["graphql"]["user"]
            edges = user_data.get("edge_owner_to_timeline_media", {}).get("edges", [])
            print(f"[Instagram Parser] Found {len(edges)} posts using direct graphql structure")
        # Method 4: xdt_api structure
        elif json_data.get("xdt_api__v1__feed__user_timeline_graphql_connection"):
            edges = json_data["xdt_api__v1__feed__user_timeline_graphql_connection"].get("edges", [])
            print(f"[Instagram Parser] Found {len(edges)} posts using xdt_api structure")
        # Method 5: GraphQL API response structure (when json_data is response["data"])
        elif json_data.get("data", {}).get("user"):
            user_data = json_data["data"]["user"]
            edges = user_data.get("edge_owner_to_timeline_media", {}).get("edges", [])
            print(f"[Instagram Parser] Found {len(edges)} posts using GraphQL API structure (data.user)")
        # Method 5b: Direct user in data object (when json_data is already response["data"])
        elif json_data.get("user"):
            user_data = json_data["user"]
            edges = user_data.get("edge_owner_to_timeline_media", {}).get("edges", [])
            print(f"[Instagram Parser] Found {len(edges)} posts using direct user structure (from data)")
        # Method 6: Direct user object with separate edge_owner_to_timeline_media
        elif json_data.get("user") and json_data.get("edge_owner_to_timeline_media"):
            user_data = json_data["user"]
            edges = json_data["edge_owner_to_timeline_media"].get("edges", [])
            print(f"[Instagram Parser] Found {len(edges)} posts using direct user structure")
        # Method 7: Look for timeline media as a separate field (not nested in user)
        elif json_data.get("edge_owner_to_timeline_media"):
            edges = json_data["edge_owner_to_timeline_media"].get("edges", [])
            print(f"[Instagram Parser] Found {len(edges)} posts using direct edge_owner_to_timeline_media structure")
        # Method 8: Look for any field containing "timeline" or "media" with edges
        else:
            # Recursive search for posts in any structure (define function BEFORE using it)
            def find_posts_data(obj, depth=0):
                if depth > 5:
                    return None
                if not isinstance(obj, dict):
                    return None
                # PRIORITY: Check if this object directly has timeline media (NOT highlights!)
                if "edge_owner_to_timeline_media" in obj:
                    timeline_media = obj.get("edge_owner_to_timeline_media")
                    if isinstance(timeline_media, dict) and timeline_media.get("edges"):
                        return obj
                # Check for user with timeline media
                if obj.get("user") and obj.get("edge_owner_to_timeline_media"):
                    return obj
                if obj.get("graphql", {}).get("user"):
                    return obj["graphql"]
                    # Check if this object has edges that look like timeline posts (NOT highlights/reels)
                    if "edges" in obj and isinstance(obj.get("edges"), list):
                        edges_list = obj.get("edges", [])
                        if edges_list and len(edges_list) > 0:
                            first_edge = edges_list[0]
                            if isinstance(first_edge, dict) and first_edge.get("node"):
                                node = first_edge.get("node")
                                # Only accept if it has shortcode (timeline posts)
                                # Highlights/reels have 'title', 'cover_media' but NO shortcode
                                if node.get("shortcode"):
                                    return obj
                                # Reject if it looks like highlights/reels (has title/cover_media but no shortcode)
                                if node.get("title") or node.get("cover_media"):
                                    return None
                # Recursively search
                for key, value in obj.items():
                    # Skip highlights and other non-timeline fields
                    if key in ["highlights", "edge_highlight_reels", "edge_related_profiles"]:
                        continue
                    result = find_posts_data(value, depth + 1)
                    if result:
                        return result
                return None

            # Search for any field that might contain timeline posts (NOT highlights)
            found = None
            for key, value in json_data.items():
                # Skip highlights and inbox data
                if key in ["highlights", "edge_highlight_reels", "xdt_get_inbox_tray_items", "edge_related_profiles"]:
                    continue
                if isinstance(value, dict):
                    # Check if this dict has timeline media
                    if "edge_owner_to_timeline_media" in value:
                        timeline_media = value.get("edge_owner_to_timeline_media")
                        if isinstance(timeline_media, dict) and timeline_media.get("edges"):
                            found = value
                            print(f"[Instagram Parser] Found timeline media in field '{key}'")
                            break
                    # Check if this dict has edges that look like timeline posts
                    if "edges" in value and isinstance(value.get("edges"), list):
                        edges_list = value.get("edges", [])
                        if edges_list and len(edges_list) > 0:
                            first_edge = edges_list[0]
                            if isinstance(first_edge, dict) and first_edge.get("node"):
                                node = first_edge.get("node")
                                # Only accept timeline posts (have shortcode, not highlights/reels)
                                # Highlights/reels have 'title', 'cover_media' but NO shortcode
                                if node.get("shortcode"):
                                    found = value
                                    print(f"[Instagram Parser] Found {len(edges_list)} timeline posts in field '{key}'")
                                    break
                                # Reject highlights/reels explicitly
                                elif node.get("title") or node.get("cover_media"):
                                    continue  # Skip highlights/reels
            
            # If not found in direct fields, try recursive search
            if not found:
                found = find_posts_data(json_data)
            
            if found:
                # Check if found object has timeline media directly
                if "edge_owner_to_timeline_media" in found:
                    edges = found.get("edge_owner_to_timeline_media", {}).get("edges", [])
                    print(f"[Instagram Parser] Found {len(edges)} posts using recursive search (direct timeline)")
                elif found.get("user"):
                    user_data = found["user"]
                    edges = user_data.get("edge_owner_to_timeline_media", {}).get("edges", [])
                    print(f"[Instagram Parser] Found {len(edges)} posts using recursive search (user.timeline)")
                elif "edges" in found:
                    # Filter out highlights/reels from edges - only keep timeline posts with shortcode
                    all_edges = found.get("edges", [])
                    edges = []
                    for edge in all_edges:
                        node = edge.get("node", {})
                        # Only include if it's a timeline post (has shortcode)
                        # Highlights/reels have 'title', 'cover_media' but NO shortcode
                        if node.get("shortcode"):
                            edges.append(edge)
                        # Explicitly reject highlights/reels
                        elif node.get("title") or node.get("cover_media"):
                            continue  # Skip highlights/reels
                    print(f"[Instagram Parser] Found {len(edges)} timeline posts (filtered from {len(all_edges)} total edges)")
                    if len(edges) == 0 and len(all_edges) > 0:
                        print(f"[Instagram Parser] WARNING: All {len(all_edges)} edges are highlights/reels, not timeline posts")
                else:
                    edges = []
            else:
                edges = []

        if len(edges) == 0:
            print("[Instagram Parser] No posts found in JSON data structure")
            print(f"[Instagram Parser] JSON keys: {list(json_data.keys())[:10] if json_data else []}")
            
            # Additional debugging: check if user exists and what keys it has
            if user_data:
                if isinstance(user_data, dict):
                    user_keys = list(user_data.keys())[:25]
                    print(f"[Instagram Parser] User data keys: {user_keys}")
                    if "edge_owner_to_timeline_media" in user_data:
                        timeline_media = user_data.get("edge_owner_to_timeline_media")
                        print(f"[Instagram Parser] edge_owner_to_timeline_media type: {type(timeline_media)}")
                        if isinstance(timeline_media, dict):
                            timeline_keys = list(timeline_media.keys())
                            print(f"[Instagram Parser] edge_owner_to_timeline_media keys: {timeline_keys}")
                            edges_list = timeline_media.get("edges", [])
                            print(f"[Instagram Parser] edges list length: {len(edges_list)}")
                            if len(edges_list) == 0:
                                # Check for alternative structures
                                if "page_info" in timeline_media:
                                    print("[Instagram Parser] Found page_info but no edges - might need pagination")
                        else:
                            print(f"[Instagram Parser] edge_owner_to_timeline_media is not a dict")
                else:
                    print(f"[Instagram Parser] User data is not a dict: {type(user_data)}")
            
            return []

        # Parse each post (limit to 4 posts per account)
        # Filter to only include actual timeline posts (have shortcode), not highlights/reels
        valid_edges = []
        for edge in edges:
            node = edge.get("node")
            if not node:
                continue
            # Only include if it has shortcode (timeline posts)
            # Highlights/reels have different structure (title, cover_media, etc.)
            if node.get("shortcode"):
                valid_edges.append(edge)
        
        if len(valid_edges) == 0:
            print(f"[Instagram Parser] No valid timeline posts found (all {len(edges)} edges are highlights/reels)")
            return []
        
        print(f"[Instagram Parser] Filtered {len(valid_edges)} timeline posts from {len(edges)} total edges")
        
        for edge in valid_edges[:4]:
            node = edge.get("node")
            if not node:
                continue

            # Extract caption - try multiple possible structures
            caption = ""
            caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
            if caption_edges and len(caption_edges) > 0:
                caption = caption_edges[0].get("node", {}).get("text", "")
            # Try alternative caption paths
            if not caption:
                caption = node.get("caption", "") or node.get("text", "")
            # Try accessing caption directly from node
            if not caption and isinstance(node.get("edge_media_to_caption"), dict):
                # Sometimes caption is nested differently
                caption_data = node.get("edge_media_to_caption", {})
                if isinstance(caption_data, dict) and "edges" in caption_data:
                    edges_list = caption_data.get("edges", [])
                    if edges_list and len(edges_list) > 0:
                        first_edge = edges_list[0]
                        if isinstance(first_edge, dict):
                            caption_node = first_edge.get("node", {})
                            if isinstance(caption_node, dict):
                                caption = caption_node.get("text", "") or caption_node.get("caption", "")

            post = {
                "id": node.get("id", ""),
                "shortcode": node.get("shortcode", ""),
                "caption": caption,
                "postUrl": f"https://www.instagram.com/p/{node.get('shortcode', '')}/",
                "timestamp": node.get("taken_at_timestamp"),
                "likes": node.get("edge_media_preview_like", {}).get("count") or node.get("edge_liked_by", {}).get("count") or 0,
                "comments": node.get("edge_media_to_comment", {}).get("count") or 0,
                "is_video": node.get("is_video", False),
                "display_url": node.get("display_url", ""),
                "thumbnail_src": node.get("thumbnail_src", ""),
                "imageUrl": node.get("display_url") or node.get("thumbnail_src", ""),
                "owner": {
                    "id": node.get("owner", {}).get("id") or (user_data.get("id") if user_data else ""),
                    "username": node.get("owner", {}).get("username") or username,
                    "full_name": node.get("owner", {}).get("full_name") or (user_data.get("full_name") if user_data else ""),
                    "profile_pic_url": node.get("owner", {}).get("profile_pic_url") or (user_data.get("profile_pic_url") if user_data else ""),
                    "is_verified": node.get("owner", {}).get("is_verified") or (user_data.get("is_verified") if user_data else False),
                },
            }
            
            # Debug: Log post data to see what we're getting
            print(f"[Instagram Parser] Post {len(posts) + 1}: shortcode={post['shortcode']}, caption_length={len(caption)}, has_caption={bool(caption)}")
            if caption:
                print(f"[Instagram Parser] Caption preview: {caption[:100]}...")
            else:
                # Log node keys to debug why caption is missing
                node_keys = list(node.keys())[:20]
                print(f"[Instagram Parser] No caption found. Node keys: {node_keys}")
                if "edge_media_to_caption" in node:
                    print(f"[Instagram Parser] edge_media_to_caption structure: {type(node.get('edge_media_to_caption'))}")

            # Extract hashtags and mentions
            if post["caption"]:
                hashtags = re.findall(r"#(\w+)", post["caption"])
                mentions = re.findall(r"@(\w+)", post["caption"])
                post["hashtags"] = [f"#{tag}" for tag in hashtags]
                post["mentions"] = [f"@{mention}" for mention in mentions]

            # Extract location
            if node.get("location"):
                post["location"] = {
                    "id": node["location"].get("id"),
                    "name": node["location"].get("name"),
                }

            posts.append(post)

    except Exception as error:
        print(f"[Instagram Parser] Error parsing Instagram JSON: {error}")
        import traceback
        traceback.print_exc()

    return posts


def _convert_posts_to_offers(
    posts: List[Dict[str, Any]],
    brand_name: str,
    business_keywords: List[str],
    offer_keywords: List[str],
    price_keywords: List[str]
) -> List[Dict[str, Any]]:
    """
    Convert Instagram posts to brand offers.
    Equivalent to the TypeScript convertPostsToOffers function.
    """
    offers = []
    processed_posts = posts[:4]  # Limit to 4 posts
    min_posts_to_save = 2
    saved_count = 0

    # Arabic promotional keywords
    arabic_promo_keywords = [
        r"خصم", r"خصومات", r"تخفيض", r"تخفيضات", r"تنزيلات", r"أكواد الخصم",
        r"كود خصم", r"كوبون", r"كوبونات", r"عروض", r"عرض", r"عروض خاصة",
        r"توفير", r"توفيرات"
    ]

    # Combine all keywords
    all_keywords = business_keywords + offer_keywords + price_keywords
    all_keyword_patterns = [re.compile(k, re.IGNORECASE) for k in all_keywords]
    arabic_patterns = [re.compile(k, re.IGNORECASE) for k in arabic_promo_keywords]

    # Common promotional patterns
    common_promo_patterns = [
        re.compile(r"%|percent|بالمئة|في المئة", re.IGNORECASE),
        re.compile(r"promo|sale|special|جديد|new|limited|محدود", re.IGNORECASE),
    ]

    today = datetime.utcnow()

    for i, post in enumerate(processed_posts):
        caption = post.get("caption", "")

        # Check for promotional keywords
        has_promotion = (
            any(pattern.search(caption) for pattern in all_keyword_patterns) or
            any(pattern.search(caption) for pattern in arabic_patterns) or
            any(pattern.search(caption) for pattern in common_promo_patterns)
        )

        # Extract discount percentage
        discount_match = (
            re.search(r"(\d+)%?\s*(?:off|خصم|تخفيض|discount|توفير)", caption, re.IGNORECASE) or
            re.search(r"(?:خصم|تخفيض|discount)\s*(\d+)%?", caption, re.IGNORECASE)
        )
        discount = float(discount_match.group(1)) if discount_match else None

        # Check if business-related
        is_business_related = (
            any(pattern.search(caption) for pattern in [re.compile(k, re.IGNORECASE) for k in business_keywords]) or
            any(pattern.search(caption) for pattern in [re.compile(k, re.IGNORECASE) for k in price_keywords])
        )

        # Save if: has promotion/discount/business-related OR is one of latest 2 posts
        is_priority_post = has_promotion or discount or is_business_related
        is_latest_post = i < min_posts_to_save

        if is_priority_post or is_latest_post:
            # Build description - use caption if available, otherwise create meaningful description
            if caption and caption.strip():
                full_description = caption
            else:
                # If no caption, create a description with post info
                full_description = f"منشور من {post.get('owner', {}).get('full_name') or post.get('owner', {}).get('username', brand_name)}"
                if post.get("postUrl"):
                    full_description += f"\n\n🔗 {post['postUrl']}"

            if post.get("owner", {}).get("full_name"):
                owner_info = f"من: {post['owner']['full_name']} (@{post['owner']['username']})"
                if caption and caption.strip():
                    full_description = f"{owner_info}\n\n{full_description}"
                else:
                    full_description = owner_info + "\n\n" + full_description

            if post.get("likes"):
                full_description += f"\n\n👍 {post['likes']} إعجاب"

            if post.get("comments"):
                full_description += f" | 💬 {post['comments']} تعليق"

            if post.get("hashtags"):
                full_description += f"\n\n{' '.join(post['hashtags'])}"

            if post.get("location", {}).get("name"):
                full_description += f"\n\n📍 {post['location']['name']}"

            # Create title - prefer caption, fallback to meaningful title
            if caption and caption.strip():
                title = caption[:100] if len(caption) > 100 else caption
            else:
                # Create a more meaningful title when caption is missing
                owner_name = post.get('owner', {}).get('full_name') or post.get('owner', {}).get('username', brand_name)
                title = f"منشور من {owner_name}"
                if post.get("shortcode"):
                    title += f" ({post['shortcode']})"

            offer = {
                "brand": post.get("owner", {}).get("full_name") or brand_name or post.get("owner", {}).get("username", "Unknown"),
                "title": title,
                "description": full_description,
                "discount_percentage": discount,
                "source": "instagram",
                "source_url": post.get("postUrl", ""),
                "scraped_at": today,
            }

            offers.append(offer)
            saved_count += 1
            print(f"[Instagram] Saved post {i + 1}/{len(processed_posts)} from {brand_name}: {'Priority' if is_priority_post else 'Latest'}")

    print(f"[Instagram] Total posts processed: {len(processed_posts)}, Saved: {saved_count}, Offers: {len(offers)}")
    return offers


async def _scrape_instagram_account_async(
    username: str,
    brand_name: str,
    business_keywords: List[str],
    offer_keywords: List[str],
    price_keywords: List[str],
    instagram_username: Optional[str] = None,
    instagram_password: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Scrape a single Instagram account.
    Equivalent to the TypeScript scrapeInstagramAccount function.
    """
    browser = None
    try:
        print(f"[Instagram Scraper] Starting scrape for @{username}")

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
            # Try to use system Chromium if available
            executable_path = os.environ.get('PUPPETEER_EXECUTABLE_PATH', '/usr/bin/chromium')
            if not os.path.exists(executable_path):
                executable_path = None  # Let pyppeteer download its own
            
            launch_options = {
                "headless": True,
                "args": [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-extensions',
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-breakpad',
                    '--disable-client-side-phishing-detection',
                    '--disable-default-apps',
                    '--disable-features=TranslateUI',
                    '--disable-hang-monitor',
                    '--disable-ipc-flooding-protection',
                    '--disable-popup-blocking',
                    '--disable-prompt-on-repost',
                    '--disable-renderer-backgrounding',
                    '--disable-sync',
                    '--disable-translate',
                    '--metrics-recording-only',
                    '--no-first-run',
                    '--safebrowsing-disable-auto-update',
                    '--enable-automation',
                    '--password-store=basic',
                    '--use-mock-keychain',
                ],
            }
            
            if executable_path and os.path.exists(executable_path):
                launch_options["executablePath"] = executable_path
                print(f"[Instagram Scraper] Using Chromium at: {executable_path}")
            
            browser = await launch(launch_options)
        except Exception as e:
            print(f"[Instagram Scraper] Error launching browser: {e}")
            # Restore original signal before re-raising
            try:
                signal_module.signal = original_signal
            except:
                pass
            raise
        finally:
            # Restore original signal
            try:
                signal_module.signal = original_signal
            except:
                pass
        page = await browser.newPage()
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        # Login first
        logged_in = await _login_to_instagram(page, instagram_username, instagram_password)
        if not logged_in:
            print(f"[Instagram Scraper] Failed to login. Cannot scrape {username}")
            await browser.close()
            return []

        # Navigate to profile
        url = f"https://www.instagram.com/{username}/"
        print(f"[Instagram Scraper] Navigating to: {url}")

        # Set up response listener for GraphQL API calls (BEFORE navigation, like TypeScript)
        graphql_responses = []

        async def handle_response(response):
            try:
                url = response.url
                if ('graphql/query' in url or 'api/graphql' in url or 'query_hash' in url or
                    ('user' in url and 'profile' in url)):
                    try:
                        response_data = await response.json()
                        if response_data:
                            graphql_responses.append({"url": url, "data": response_data})
                            print(f"[Instagram Scraper] Intercepted GraphQL response: {url[:80]}...")
                    except Exception as json_error:
                        # Some responses might not be JSON
                        pass
            except Exception as e:
                # Ignore errors in response handler
                pass

        # Register response handler BEFORE navigation (like TypeScript version)
        # pyppeteer supports async handlers via ensure_future
        page.on('response', lambda resp: asyncio.ensure_future(handle_response(resp)))

        await page.goto(url, {"waitUntil": "networkidle2", "timeout": 90000})
        
        # Wait for GraphQL requests to complete - Instagram loads data asynchronously (like TypeScript)
        await asyncio.sleep(12)
        
        # Check if page loaded correctly (like TypeScript version)
        try:
            page_title = await page.evaluate("""() => document.title""")
            print(f"[Instagram Scraper] Page title: {page_title}")
        except:
            pass
        
        # Check for login prompt or private account (like TypeScript version)
        try:
            login_prompt = await page.querySelector('input[name="username"]')
            if login_prompt:
                print(f"[Instagram Scraper] Login prompt detected - Instagram may require authentication")
            
            private_account = await page.evaluate("""() => {
                const h2Elements = Array.from(document.querySelectorAll('h2'));
                return h2Elements.some(el => el.textContent?.includes('This Account is Private') ||
                    el.textContent?.includes('هذا الحساب خاص'));
            }""")
            if private_account:
                print(f"[Instagram Scraper] Account {username} is private")
        except:
            pass
        
        # Try scrolling to trigger more GraphQL requests for timeline media (after initial wait)
        try:
            print("[Instagram Scraper] Scrolling to trigger timeline media loading...")
            # Scroll down to load more content
            await page.evaluate("""() => {
                window.scrollTo(0, document.body.scrollHeight / 3);
            }""")
            await asyncio.sleep(2)
            await page.evaluate("""() => {
                window.scrollTo(0, document.body.scrollHeight / 2);
            }""")
            await asyncio.sleep(2)
            await page.evaluate("""() => {
                window.scrollTo(0, document.body.scrollHeight);
            }""")
            await asyncio.sleep(3)
            print(f"[Instagram Scraper] After scrolling, GraphQL responses count: {len(graphql_responses)}")
        except Exception as e:
            print(f"[Instagram Scraper] Error during scrolling: {e}")

        # Extract JSON data
        json_data = await _extract_instagram_json(page, username)
        print(f"[Instagram Scraper] JSON data extracted: {'Found' if json_data else 'Not found'}")
        
        # Check if json_data actually contains user/profile data
        has_user_data = False
        if json_data:
            # Check various possible structures for user data
            if (json_data.get("entry_data", {}).get("ProfilePage") or
                json_data.get("graphql", {}).get("user") or
                json_data.get("data", {}).get("user") or
                json_data.get("user") or
                json_data.get("xdt_api__v1__feed__user_timeline_graphql_connection")):
                has_user_data = True
        
        # Try GraphQL responses if JSON is empty or has no keys (like TypeScript version)
        # But also try GraphQL even if JSON exists, as GraphQL might have more complete data
        posts = []
        if graphql_responses:
            print(f"[Instagram Scraper] Trying to use intercepted GraphQL responses ({len(graphql_responses)} found)...")
            for response_wrapper in graphql_responses:
                response = response_wrapper.get("data") or response_wrapper
                
                # Skip if response is None or not a dict
                if not response or not isinstance(response, dict):
                    continue
                
                # Log response structure for debugging
                print(f"[Instagram Scraper] GraphQL response keys: {list(response.keys())[:10]}")
                
                # Check multiple possible GraphQL response structures
                # Check if response.data exists and is not None
                response_data = response.get("data")
                if response_data and isinstance(response_data, dict):
                    # First, check if this response directly has user timeline media
                    if response_data.get("user"):
                        user_obj = response_data.get("user")
                        if isinstance(user_obj, dict):
                            # Check if account is private
                            if user_obj.get("is_private"):
                                print(f"[Instagram Scraper] WARNING: Account @{username} is PRIVATE - cannot access posts without following")
                            
                            # Check if user has timeline media directly
                            if user_obj.get("edge_owner_to_timeline_media"):
                                timeline_media = user_obj.get("edge_owner_to_timeline_media")
                                if isinstance(timeline_media, dict) and timeline_media.get("edges"):
                                    posts = _parse_instagram_posts(response_data, username)
                                    if posts:
                                        print(f"[Instagram Scraper] Found {len(posts)} posts from GraphQL user.timeline")
                                        await browser.close()
                                        return posts
                    
                    # Try to find posts in response_data (general search)
                    posts = _parse_instagram_posts(response_data, username)
                    if posts:
                        print(f"[Instagram Scraper] Found {len(posts)} posts from GraphQL response_data")
                        await browser.close()
                        return posts
                    
                    # Look for timeline media in other GraphQL responses
                    # Timeline media might be in a separate query response
                    for other_response_wrapper in graphql_responses:
                        other_response = other_response_wrapper.get("data") or other_response_wrapper
                        if other_response and isinstance(other_response, dict):
                            other_data = other_response.get("data")
                            if other_data and isinstance(other_data, dict):
                                # Check for timeline media specifically (not highlights)
                                if "edge_owner_to_timeline_media" in other_data:
                                    posts = _parse_instagram_posts(other_data, username)
                                    if posts:
                                        print(f"[Instagram Scraper] Found {len(posts)} posts from separate timeline GraphQL response")
                                        await browser.close()
                                        return posts
                                # Also check if user has timeline media
                                if other_data.get("user", {}).get("edge_owner_to_timeline_media"):
                                    posts = _parse_instagram_posts(other_data, username)
                                    if posts:
                                        print(f"[Instagram Scraper] Found {len(posts)} posts from user timeline in GraphQL response")
                                        await browser.close()
                                        return posts
                
                # Check if user is directly in response
                if response.get("user"):
                    posts = _parse_instagram_posts(response, username)
                    if posts:
                        print(f"[Instagram Scraper] Found {len(posts)} posts from GraphQL response (user)")
                        await browser.close()
                        return posts
                
                # Try to find user data recursively (simpler logic like TypeScript version)
                def find_user_in_response_simple(obj, depth=0):
                    if depth > 3:
                        return None
                    if not isinstance(obj, dict):
                        return None
                    # Match TypeScript logic: obj.user && (obj.edge_owner_to_timeline_media || obj.data?.user)
                    if obj.get("user"):
                        if obj.get("edge_owner_to_timeline_media"):
                            return obj
                        if obj.get("data") and isinstance(obj.get("data"), dict) and obj.get("data").get("user"):
                            return obj
                    # Recursively search
                    for key, value in obj.items():
                        result = find_user_in_response_simple(value, depth + 1)
                        if result:
                            return result
                    return None
                
                found_user_simple = find_user_in_response_simple(response)
                if found_user_simple:
                    print("[Instagram Scraper] Using GraphQL response data (simple recursive search)")
                    posts = _parse_instagram_posts(found_user_simple, username)
                    if posts:
                        await browser.close()
                        return posts
                
                # Try recursive search for posts in the entire response
                def find_posts_in_response(obj, depth=0):
                    if depth > 5:
                        return None
                    if not isinstance(obj, dict):
                        return None
                    # PRIORITY: Check if this object has timeline media (not highlights/reels)
                    if "edge_owner_to_timeline_media" in obj:
                        # Verify it's actually timeline posts, not highlights
                        timeline_media = obj.get("edge_owner_to_timeline_media", {})
                        if isinstance(timeline_media, dict):
                            edges = timeline_media.get("edges", [])
                            if edges and len(edges) > 0:
                                first_edge = edges[0]
                                if isinstance(first_edge, dict):
                                    node = first_edge.get("node", {})
                                    # Timeline posts have shortcode, highlights/reels don't
                                    if node.get("shortcode"):
                                        return obj
                    # Check if edges contain actual timeline post nodes (with shortcode)
                    if obj.get("edges") and isinstance(obj.get("edges"), list):
                        edges = obj.get("edges", [])
                        if edges and len(edges) > 0 and isinstance(edges[0], dict) and edges[0].get("node"):
                            node = edges[0].get("node")
                            # Only accept if it has shortcode (timeline posts), not highlights/reels
                            if node.get("shortcode"):
                                return obj
                    # Recursively search, but skip highlights/reels
                    for key, value in obj.items():
                        # Skip metadata and non-timeline media types
                        if key in ["extensions", "status", "errors", "highlights", "edge_highlight_reels", "edge_felix_video_timeline"]:
                            continue
                        result = find_posts_in_response(value, depth + 1)
                        if result:
                            return result
                    return None
                
                found_posts = find_posts_in_response(response)
                if found_posts:
                    print("[Instagram Scraper] Using GraphQL response data (recursive search for posts)")
                    # Try to enrich found_posts with user data if available in response
                    if "user" not in found_posts and response_data and isinstance(response_data, dict):
                        if response_data.get("user"):
                            found_posts["user"] = response_data.get("user")
                    posts = _parse_instagram_posts(found_posts, username)
                    if posts:
                        # Debug: Check if posts have captions
                        posts_with_captions = [p for p in posts if p.get("caption")]
                        print(f"[Instagram Scraper] Found {len(posts)} posts, {len(posts_with_captions)} have captions")
                        await browser.close()
                        return posts

        # If JSON data exists, log it (like TypeScript version)
        if json_data:
            print(f"[Instagram Scraper] JSON data found. Top-level keys: {list(json_data.keys())[:10]}")
        else:
            print(f"[Instagram Scraper] No JSON data found. Trying alternative methods...")
            
            # Try to extract JSON from window objects (like TypeScript version)
            try:
                window_data = await page.evaluate("""() => {
                    const data = {};
                    if (window._sharedData) {
                        // Only include if it has ProfilePage (not inbox data)
                        if (window._sharedData.entry_data && window._sharedData.entry_data.ProfilePage) {
                            data._sharedData = window._sharedData;
                        }
                    }
                    if (window.__additionalDataLoaded) {
                        data.__additionalDataLoaded = window.__additionalDataLoaded;
                    }
                    return data;
                }""")
                
                if window_data.get("_sharedData") or window_data.get("__additionalDataLoaded"):
                    print(f"[Instagram Scraper] Found data in window object")
                    window_json_data = window_data.get("_sharedData") or window_data.get("__additionalDataLoaded")
                    # Only parse if it's not inbox data
                    if window_json_data and not window_json_data.get("xdt_get_inbox_tray_items"):
                        posts = _parse_instagram_posts(window_json_data, username)
                        if posts:
                            print(f"[Instagram Scraper] Found {len(posts)} posts from window object")
                            await browser.close()
                            return posts
            except Exception as window_error:
                print(f"[Instagram Scraper] Error extracting window data: {window_error}")

        # Parse posts from JSON (only if we haven't found posts from GraphQL or window)
        if not posts and has_user_data:
            posts = _parse_instagram_posts(json_data, username)
            print(f"[Instagram Scraper] Parsed {len(posts)} posts from JSON")
            if posts:
                await browser.close()
                return posts

        # If no posts from JSON/GraphQL, try DOM scraping as fallback (like TypeScript version)
        if not posts:
            print(f"[Instagram Scraper] Trying DOM scraping as fallback...")
            try:
                dom_posts = await page.evaluate("""(username) => {
                    const posts = [];
                    // Try to find post links (limit to 4 posts)
                    const links = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
                    links.forEach((link, index) => {
                        if (index < 4) {
                            const href = link.href;
                            const img = link.querySelector('img');
                            posts.push({
                                postUrl: href,
                                imageUrl: img ? img.src : '',
                                caption: img ? img.alt : '',
                            });
                        }
                    });
                    return posts;
                }""", username)
                
                print(f"[Instagram Scraper] Found {len(dom_posts)} posts from DOM")
                
                # Convert DOM posts to InstagramPost format
                if dom_posts and len(dom_posts) > 0:
                    converted_posts = []
                    for idx, p in enumerate(dom_posts):
                        shortcode_match = re.search(r'/(p|reel)/([^/]+)', p.get("postUrl", ""))
                        shortcode = shortcode_match.group(2) if shortcode_match else ""
                        
                        post = {
                            "id": f"dom-{idx}",
                            "shortcode": shortcode,
                            "caption": p.get("caption", ""),
                            "postUrl": p.get("postUrl", ""),
                            "imageUrl": p.get("imageUrl", ""),
                            "owner": {
                                "id": "",
                                "username": username,
                            },
                        }
                        converted_posts.append(post)
                    
                    if converted_posts:
                        await browser.close()
                        return converted_posts
            except Exception as dom_error:
                print(f"[Instagram Scraper] DOM scraping error: {dom_error}")

        await browser.close()

        if not posts or len(posts) == 0:
            print(f"[Instagram Scraper] No posts found for {username}")
            return []

        # Get business keywords before converting (in main thread)
        # Note: We'll get keywords in the main thread and pass them to the async function
        # For now, return posts and convert in main thread
        return posts

    except Exception as error:
        print(f"[Instagram Scraper] Error scraping Instagram account {username}: {error}")
        import traceback
        traceback.print_exc()
        return []
    finally:
        if browser:
            await browser.close()


@router.post("/instagram/login")
def login_to_instagram(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Login to Instagram.
    Equivalent to the TypeScript loginToInstagram function.
    Returns success status and message.
    """
    try:
        # Run async login in a thread pool
        import concurrent.futures
        
        async def login_async():
            browser = None
            try:
                print("[Instagram Login] Starting login process...")
                
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
                await page.setUserAgent(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                
                # Get client credentials
                instagram_username, instagram_password, _ = get_instagram_credentials(db, current_client.id)
                
                # Perform login
                logged_in = await _login_to_instagram(page, instagram_username, instagram_password)
                await browser.close()
                
                if logged_in:
                    return {"success": True, "message": "تم تسجيل الدخول إلى إنستجرام بنجاح"}
                else:
                    return {"success": False, "message": "فشل تسجيل الدخول إلى إنستجرام"}
            except Exception as error:
                print(f"[Instagram Login] Error during login: {error}")
                if browser:
                    await browser.close()
                return {"success": False, "message": f"خطأ أثناء تسجيل الدخول: {str(error)}"}
        
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
                return new_loop.run_until_complete(login_async())
            finally:
                new_loop.close()
                try:
                    signal_module.signal = original_signal
                except:
                    pass
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            result = future.result(timeout=120)  # 2 minute timeout for login
        
        return result
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل تسجيل الدخول إلى إنستجرام: {str(exc)}",
        )


@router.get("/instagram/{username}/latest-post")
def get_latest_instagram_post(
    username: str,
    brand_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Get the latest post from an Instagram account (even if not promotional).
    Equivalent to the TypeScript getLatestInstagramPost function.
    """
    try:
        # Run async scraping in a thread pool
        import concurrent.futures
        
        async def get_latest_post_async(usrname, bname, ig_username, ig_password):
            browser = None
            try:
                print(f"[Instagram] Getting latest post for @{usrname}")
                
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
                await page.setUserAgent(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                
                # Login first
                logged_in = await _login_to_instagram(page, ig_username, ig_password)
                if not logged_in:
                    print(f"[Instagram] Failed to login. Cannot get latest post for {usrname}")
                    await browser.close()
                    return None
                
                url = f"https://www.instagram.com/{usrname}/"
                print(f"[Instagram] Navigating to: {url}")
                
                # Set up response listener for GraphQL
                graphql_responses = []
                
                async def handle_response(response):
                    url_resp = response.url
                    if ('graphql/query' in url_resp or 'api/graphql' in url_resp or 'query_hash' in url_resp or
                        ('user' in url_resp and 'profile' in url_resp)):
                        try:
                            response_data = await response.json()
                            if response_data:
                                graphql_responses.append({"url": url_resp, "data": response_data})
                        except:
                            pass
                
                page.on('response', lambda resp: asyncio.ensure_future(handle_response(resp)))
                
                await page.goto(url, {"waitUntil": "networkidle2", "timeout": 90000})
                await asyncio.sleep(12)
                
                # Extract JSON data
                json_data = await _extract_instagram_json(page, usrname)
                
                # Try GraphQL responses if JSON extraction failed
                if (not json_data or len(json_data) == 0) and graphql_responses:
                    for response_wrapper in graphql_responses:
                        response = response_wrapper.get("data") or response_wrapper
                        if response.get("data", {}).get("user"):
                            posts = _parse_instagram_posts(response["data"], usrname)
                            if posts:
                                latest_post = posts[0]
                                await browser.close()
                                return {
                                    "caption": latest_post.get("caption", ""),
                                    "imageUrl": latest_post.get("imageUrl") or latest_post.get("thumbnail_src"),
                                    "postUrl": latest_post.get("postUrl", ""),
                                    "timestamp": latest_post.get("timestamp") and datetime.fromtimestamp(latest_post["timestamp"]).isoformat(),
                                }
                        if response.get("user"):
                            posts = _parse_instagram_posts(response, usrname)
                            if posts:
                                latest_post = posts[0]
                                await browser.close()
                                return {
                                    "caption": latest_post.get("caption", ""),
                                    "imageUrl": latest_post.get("imageUrl") or latest_post.get("thumbnail_src"),
                                    "postUrl": latest_post.get("postUrl", ""),
                                    "timestamp": latest_post.get("timestamp") and datetime.fromtimestamp(latest_post["timestamp"]).isoformat(),
                                }
                
                # Parse posts from JSON
                posts = _parse_instagram_posts(json_data, usrname)
                await browser.close()
                
                if posts:
                    latest_post = posts[0]
                    return {
                        "caption": latest_post.get("caption", ""),
                        "imageUrl": latest_post.get("imageUrl") or latest_post.get("thumbnail_src"),
                        "postUrl": latest_post.get("postUrl", ""),
                        "timestamp": latest_post.get("timestamp") and datetime.fromtimestamp(latest_post["timestamp"]).isoformat(),
                    }
                
                return None
            except Exception as error:
                print(f"[Instagram] Error getting latest post for {usrname}: {error}")
                return None
            finally:
                if browser:
                    await browser.close()
        
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
            
            # Get client credentials
            instagram_username, instagram_password, _ = get_instagram_credentials(db, current_client.id)
            
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(get_latest_post_async(username, brand_name, instagram_username, instagram_password))
            finally:
                new_loop.close()
                try:
                    signal_module.signal = original_signal
                except:
                    pass
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            result = future.result(timeout=300)
        
        if result:
            return result
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"لم يتم العثور على منشورات لحساب @{username}",
            )
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل الحصول على آخر منشور: {str(exc)}",
        )


class ScrapeInstagramByUsernameRequest(BaseModel):
    username: str
    brand_name: str


@router.post("/scrape-instagram/by-username")
def scrape_instagram_account_by_username(
    request: ScrapeInstagramByUsernameRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape a single Instagram account by username.
    Equivalent to the TypeScript scrapeInstagramAccount function.
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
                return new_loop.run_until_complete(_scrape_instagram_account_async(
                    request.username, request.brand_name, business_keywords, offer_keywords, price_keywords
                ))
            finally:
                new_loop.close()
                try:
                    signal_module.signal = original_signal
                except:
                    pass
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            posts = future.result(timeout=300)
        
        # Convert posts to offers (in main thread)
        offers = _convert_posts_to_offers(posts, request.brand_name, business_keywords, offer_keywords, price_keywords)
        
        # Persist offers to database
        total_offers = 0
        for offer in offers:
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "instagram",
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

        # Return offers in the format expected by frontend
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
            "totalOffers": total_offers,
            "offers": offers_response,
            "message": f"تم جمع {total_offers} عرض من حساب @{request.username}" if total_offers > 0 else f"لم يتم العثور على عروض في حساب @{request.username}",
        }
    except Exception as exc:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل جمع بيانات إنستجرام: {str(exc)}",
        )


@router.post("/scrape-instagram/{account_id}")
def scrape_instagram_account(
    account_id: int,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape a specific Instagram account by ID.
    Equivalent to the TypeScript scrapeInstagramAccount function.
    """
    # Verify the account exists and belongs to the current client
    account = (
        db.query(CompetitorSocialMediaAccount)
        .filter(
            CompetitorSocialMediaAccount.id == account_id,
            CompetitorSocialMediaAccount.client_id == current_client.id,
            CompetitorSocialMediaAccount.platform == "instagram",
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
        # Run async scraping in a thread pool to avoid signal handler issues
        import concurrent.futures
        import threading
        
        # Get business keywords first (in main thread)
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

        def run_in_thread():
            # Patch signal module to prevent signal handler errors in non-main threads
            import signal as signal_module
            import threading
            
            # Store original signal function
            original_signal = signal_module.signal
            
            def patched_signal(signalnum, handler):
                # Check if we're in the main thread
                try:
                    current_thread = threading.current_thread()
                    main_thread = threading.main_thread()
                    if current_thread is not main_thread:
                        # In non-main thread, just return SIG_DFL without calling signal()
                        return signal_module.SIG_DFL
                except:
                    pass
                
                # In main thread, try to set the signal handler
                try:
                    return original_signal(signalnum, handler)
                except (ValueError, OSError) as e:
                    # If signal handling fails (e.g., not in main thread), return SIG_DFL
                    return signal_module.SIG_DFL
            
            # Apply patch to signal module
            signal_module.signal = patched_signal
            
            # Also patch in pyppeteer's launcher module if it's already imported
            try:
                import pyppeteer.launcher as launcher_module
                # Patch the signal module reference in launcher
                launcher_module.signal = signal_module
            except Exception as e:
                print(f"[Instagram Scraper] Could not patch pyppeteer launcher signal: {e}")
            
            # Create new event loop in this thread
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(_scrape_instagram_account_async(
                    account.username, account.brand_name, business_keywords, offer_keywords, price_keywords
                ))
            finally:
                new_loop.close()
                # Restore original signal function
                try:
                    signal_module.signal = original_signal
                except:
                    pass
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            posts = future.result(timeout=300)  # 5 minute timeout

        # Convert posts to offers (in main thread where we have db access)
        offers = _convert_posts_to_offers(posts, account.brand_name, business_keywords, offer_keywords, price_keywords)

        # Persist offers to database
        total_offers = 0
        for offer in offers:
            # Check if offer already exists (avoid duplicates)
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "instagram",
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
            "success": True,
            "totalOffers": total_offers,
            "message": f"تم جمع {total_offers} عرض من حساب @{account.username}" if total_offers > 0 else f"لم يتم العثور على عروض في حساب @{account.username}",
        }
    except Exception as exc:
        db.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Instagram Scraper] Error scraping {account.username}: {exc}")
        print(f"[Instagram Scraper] Traceback: {error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل جمع بيانات إنستجرام: {str(exc)}",
        )


@router.post("/scrape-instagram/all")
def scrape_all_instagram_accounts(
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Scrape all active Instagram accounts for the current client.
    Equivalent to the TypeScript scrapeAllInstagramAccounts function.
    """
    # Get all active Instagram accounts
    accounts = (
        db.query(CompetitorSocialMediaAccount)
        .filter(
            CompetitorSocialMediaAccount.client_id == current_client.id,
            CompetitorSocialMediaAccount.platform == "instagram",
            CompetitorSocialMediaAccount.is_active.is_(True),
        )
        .all()
    )

    if not accounts:
        return {
            "success": False,
            "totalOffers": 0,
            "message": "لا توجد حسابات إنستجرام نشطة",
        }

    print(f"[Instagram Scraper] Found {len(accounts)} active Instagram accounts")

    # Get business keywords first (in main thread)
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

    # Prepare account data for async function
    accounts_data = [
        {
            "username": acc.username,
            "brand_name": acc.brand_name,
        }
        for acc in accounts
    ]

    # Get client credentials
    instagram_username, instagram_password, _ = get_instagram_credentials(db, current_client.id)
    
    # Use a single browser session for all accounts
    async def scrape_all_async(accounts_list, keywords_dict, ig_username, ig_password):
        browser = None
        try:
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
                # Try to use system Chromium if available
                executable_path = os.environ.get('PUPPETEER_EXECUTABLE_PATH', '/usr/bin/chromium')
                if not os.path.exists(executable_path):
                    executable_path = None  # Let pyppeteer download its own
                
                launch_options = {
                    "headless": True,
                    "args": [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-software-rasterizer',
                        '--disable-extensions',
                        '--disable-background-networking',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-breakpad',
                        '--disable-client-side-phishing-detection',
                        '--disable-default-apps',
                        '--disable-features=TranslateUI',
                        '--disable-hang-monitor',
                        '--disable-ipc-flooding-protection',
                        '--disable-popup-blocking',
                        '--disable-prompt-on-repost',
                        '--disable-renderer-backgrounding',
                        '--disable-sync',
                        '--disable-translate',
                        '--metrics-recording-only',
                        '--no-first-run',
                        '--safebrowsing-disable-auto-update',
                        '--enable-automation',
                        '--password-store=basic',
                        '--use-mock-keychain',
                    ],
                }
                
                if executable_path and os.path.exists(executable_path):
                    launch_options["executablePath"] = executable_path
                    print(f"[Instagram Scraper] Using Chromium at: {executable_path}")
                
                browser = await launch(launch_options)
            except Exception as e:
                print(f"[Instagram Scraper] Error launching browser: {e}")
                # Restore original signal before re-raising
                try:
                    signal_module.signal = original_signal
                except:
                    pass
                raise
            finally:
                # Restore original signal
                try:
                    signal_module.signal = original_signal
                except:
                    pass
            page = await browser.newPage()
            await page.setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )

            # Login once for all accounts
            logged_in = await _login_to_instagram(page, ig_username, ig_password)
            if not logged_in:
                print("[Instagram Scraper] Failed to login. Cannot scrape accounts")
                await browser.close()
                return {
                    "success": False,
                    "totalOffers": 0,
                    "message": "فشل تسجيل الدخول إلى إنستجرام",
                    "all_offers": [],
                }

            print(f"[Instagram Scraper] Successfully logged in. Scraping {len(accounts_list)} accounts sequentially...")

            all_offers = []
            errors = []

            for i, account_data in enumerate(accounts_list):
                print(f"[Instagram Scraper] Scraping account {i + 1}/{len(accounts_list)}: {account_data['username']}")

                try:
                    # Add delay between accounts
                    if i > 0:
                        await asyncio.sleep(3)

                    # Scrape account (reuse same page)
                    url = f"https://www.instagram.com/{account_data['username']}/"
                    
                    # Set up response listener for GraphQL (per account)
                    graphql_responses = []
                    
                    async def handle_response(response):
                        url_resp = response.url
                        if ('graphql/query' in url_resp or 'api/graphql' in url_resp or 'query_hash' in url_resp or
                            ('user' in url_resp and 'profile' in url_resp)):
                            try:
                                response_data = await response.json()
                                if response_data:
                                    graphql_responses.append({"url": url_resp, "data": response_data})
                                    print(f"[Instagram Scraper] Intercepted GraphQL response: {url_resp[:80]}...")
                            except:
                                pass
                    
                    # Set up response handler for this account
                    # Note: pyppeteer doesn't have removeAllListeners, so we'll just add another handler
                    # The closure will capture graphql_responses for this iteration
                    page.on('response', lambda resp: asyncio.ensure_future(handle_response(resp)))
                    
                    await page.goto(url, {"waitUntil": "networkidle2", "timeout": 90000})
                    await asyncio.sleep(12)

                    # Extract and parse
                    json_data = await _extract_instagram_json(page, account_data['username'])
                    
                    # Check if json_data has user data
                    has_user_data = False
                    if json_data:
                        if (json_data.get("entry_data", {}).get("ProfilePage") or
                            json_data.get("graphql", {}).get("user") or
                            json_data.get("data", {}).get("user") or
                            json_data.get("user") or
                            json_data.get("xdt_api__v1__feed__user_timeline_graphql_connection")):
                            has_user_data = True
                    
                    # Try GraphQL responses first
                    posts = []
                    if graphql_responses:
                        print(f"[Instagram Scraper] Trying GraphQL responses for {account_data['username']} ({len(graphql_responses)} found)...")
                        for response_wrapper in graphql_responses:
                            response = response_wrapper.get("data") or response_wrapper
                            
                            # Skip if response is None or not a dict
                            if not response or not isinstance(response, dict):
                                continue
                            
                            print(f"[Instagram Scraper] GraphQL response keys: {list(response.keys())[:10]}")
                            
                            # Check if response.data exists and is not None
                            response_data = response.get("data")
                            if response_data and isinstance(response_data, dict) and response_data.get("user"):
                                posts = _parse_instagram_posts(response_data, account_data['username'])
                                if posts:
                                    break
                            
                            if response.get("user"):
                                posts = _parse_instagram_posts(response, account_data['username'])
                                if posts:
                                    break
                            
                            # Recursive search
                            def find_user_in_response(obj, depth=0):
                                if depth > 3:
                                    return None
                                if not isinstance(obj, dict):
                                    return None
                                if obj.get("user") and (obj.get("edge_owner_to_timeline_media") or 
                                                      (obj.get("data") and isinstance(obj.get("data"), dict) and obj.get("data").get("user"))):
                                    return obj
                                for key, value in obj.items():
                                    result = find_user_in_response(value, depth + 1)
                                    if result:
                                        return result
                                return None
                            
                            found_user = find_user_in_response(response)
                            if found_user:
                                posts = _parse_instagram_posts(found_user, account_data['username'])
                                if posts:
                                    break
                    
                    # Fallback to JSON if GraphQL didn't work
                    if not posts and has_user_data:
                        posts = _parse_instagram_posts(json_data, account_data['username'])

                    if posts:
                        offers = _convert_posts_to_offers(
                            posts, 
                            account_data['brand_name'], 
                            keywords_dict['business_keywords'],
                            keywords_dict['offer_keywords'],
                            keywords_dict['price_keywords']
                        )
                        all_offers.extend(offers)
                        print(f"[Instagram Scraper] Found {len(offers)} offers from {account_data['username']}")

                except Exception as error:
                    error_msg = f"{account_data['brand_name']}: {str(error)}"
                    errors.append(error_msg)
                    print(f"[Instagram Scraper] Error scraping {account_data['username']}: {error}")

            await browser.close()

            return {
                "success": len(all_offers) > 0,
                "totalOffers": len(all_offers),
                "message": f"تم العثور على {len(all_offers)} عرض ترويجي من إنستجرام." + (f" ملاحظة: {', '.join(errors[:3])}" if errors else ""),
                "all_offers": all_offers,
                "errors": errors,
            }

        except Exception as error:
            if browser:
                await browser.close()
            print(f"[Instagram Scraper] Error in scrape_all_instagram_accounts: {error}")
            return {
                "success": False,
                "totalOffers": 0,
                "message": f"خطأ: {str(error)}",
                "all_offers": [],
                "errors": [str(error)],
            }

    # Run async function in a thread pool to avoid signal handler issues
    try:
        import concurrent.futures
        
        keywords_dict = {
            "business_keywords": business_keywords,
            "offer_keywords": offer_keywords,
            "price_keywords": price_keywords,
        }
        
        def run_in_thread():
            # Patch signal module to prevent signal handler errors in non-main threads
            import signal as signal_module
            import threading
            
            # Store original signal function
            original_signal = signal_module.signal
            
            def patched_signal(signalnum, handler):
                # Check if we're in the main thread
                try:
                    current_thread = threading.current_thread()
                    main_thread = threading.main_thread()
                    if current_thread is not main_thread:
                        # In non-main thread, just return SIG_DFL without calling signal()
                        return signal_module.SIG_DFL
                except:
                    pass
                
                # In main thread, try to set the signal handler
                try:
                    return original_signal(signalnum, handler)
                except (ValueError, OSError) as e:
                    # If signal handling fails (e.g., not in main thread), return SIG_DFL
                    return signal_module.SIG_DFL
            
            # Apply patch to signal module
            signal_module.signal = patched_signal
            
            # Also patch in pyppeteer's launcher module if it's already imported
            try:
                import pyppeteer.launcher as launcher_module
                # Patch the signal module reference in launcher
                launcher_module.signal = signal_module
            except Exception as e:
                print(f"[Instagram Scraper] Could not patch pyppeteer launcher signal: {e}")
            
            # Create new event loop in this thread
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(scrape_all_async(accounts_data, keywords_dict, instagram_username, instagram_password))
            finally:
                new_loop.close()
                # Restore original signal function
                try:
                    signal_module.signal = original_signal
                except:
                    pass
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            result = future.result(timeout=600)  # 10 minute timeout for multiple accounts
        
        # Save offers to database (in main thread)
        total_offers = 0
        for offer in result.get("all_offers", []):
            existing = (
                db.query(CompetitorBrandOffer)
                .filter(
                    CompetitorBrandOffer.client_id == current_client.id,
                    CompetitorBrandOffer.brand == offer["brand"],
                    CompetitorBrandOffer.title == offer["title"],
                    CompetitorBrandOffer.source == "instagram",
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
            "totalOffers": total_offers,
            "message": result.get("message", ""),
        }
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "totalOffers": 0,
            "message": f"خطأ: {str(exc)}",
        }


@router.post("/instagram/credentials")
def save_instagram_credentials(
    data: InstagramCredentialsInput,
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Save or update Instagram credentials for the current client.
    """
    try:
        creds = db.query(InstagramCredentials).filter(
            InstagramCredentials.client_id == current_client.id
        ).first()

        if creds:
            # Update existing credentials
            creds.username = data.username
            # Only update password if provided
            if data.password and data.password.strip():
                creds.password = data.password
            if data.email is not None:
                creds.email = data.email
        else:
            # Create new credentials
            if not data.password or not data.password.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password is required when creating new credentials",
                )
            creds = InstagramCredentials(
                client_id=current_client.id,
                username=data.username,
                password=data.password,
                email=data.email if data.email else None,
            )
            db.add(creds)

        db.commit()
        db.refresh(creds)

        return {
            "success": True,
            "message": "تم حفظ بيانات تسجيل الدخول إلى إنستجرام بنجاح",
        }
    except Exception as e:
        db.rollback()
        print(f"[Instagram Credentials] Error saving credentials: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل حفظ بيانات تسجيل الدخول: {str(e)}",
        )


@router.get("/instagram/credentials")
def get_instagram_credentials_endpoint(
    db: Session = Depends(get_db),
    current_client: Client = Depends(get_current_client),
):
    """
    Get Instagram credentials for the current client (without password).
    """
    try:
        creds = db.query(InstagramCredentials).filter(
            InstagramCredentials.client_id == current_client.id
        ).first()

        if not creds:
            return {
                "success": False,
                "hasCredentials": False,
                "message": "لا توجد بيانات تسجيل دخول محفوظة",
            }

        return {
            "success": True,
            "hasCredentials": True,
            "username": creds.username,
            "email": creds.email,
            "message": "تم جلب بيانات تسجيل الدخول بنجاح",
        }
    except Exception as e:
        print(f"[Instagram Credentials] Error getting credentials: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل جلب بيانات تسجيل الدخول: {str(e)}",
        )



