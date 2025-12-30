"""
Competitor Analysis Router
Combines all sub-routers for competitor analysis functionality.
"""
from fastapi import APIRouter
from . import common, instagram, snapchat, website, tiktok

router = APIRouter(
    prefix="/competitor-analysis",
    tags=["Competitor Analysis"],
)

# Include all sub-routers
router.include_router(common.router)
router.include_router(instagram.router)
router.include_router(snapchat.router)
router.include_router(website.router)
router.include_router(tiktok.router)

