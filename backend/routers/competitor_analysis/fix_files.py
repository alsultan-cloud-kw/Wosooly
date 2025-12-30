"""
Script to properly extract and fix sections from competitor_analysis.py
"""
import re

# Read the original file
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
original_file = os.path.join(parent_dir, 'competitor_analysis.py')

with open(original_file, 'r', encoding='utf-8') as f:
    content = f.read()
    all_lines = content.split('\n')

# Get common imports (first 60 lines)
common_imports = '\n'.join(all_lines[0:60])

# ============================================
# Extract Instagram-specific code
# ============================================
# Lines 66-218: Instagram profile endpoints
# Lines 1169-3020: Instagram credentials, helper functions, and scraping endpoints
instagram_lines = all_lines[66:218] + [''] + all_lines[1169:3020]

instagram_content = f"""{common_imports}

router = APIRouter()


{chr(10).join(instagram_lines)}
"""

# ============================================
# Extract Snapchat-specific code
# ============================================
# Lines 3398-4700: Snapchat scraping functions and endpoints
snapchat_lines = all_lines[3398:4700]

snapchat_content = f"""{common_imports}

router = APIRouter()


# ============================================
# Snapchat Scraping Functions
# ============================================

{chr(10).join(snapchat_lines)}
"""

# ============================================
# Extract TikTok-specific code
# ============================================
# Lines 3091-3094: ScrapeTikTokRequest class
# Lines 3363-3377: scrape/tiktok endpoint
tiktok_lines = all_lines[3091:3095] + [''] + all_lines[3363:3378]

tiktok_content = f"""{common_imports}

router = APIRouter()


{chr(10).join(tiktok_lines)}
"""

# ============================================
# Extract Website-specific code
# ============================================
# Lines 1063-1167: ScrapeBrandWebsitesRequest + scrape/brand-websites
# Lines 3119-3342: Website helper functions
# Lines 4700-4781: scrape/website and scrape/products
website_lines = all_lines[1063:1167] + [''] + all_lines[3119:3342] + [''] + all_lines[4700:4781]

website_content = f"""{common_imports}

router = APIRouter()


{chr(10).join(website_lines)}
"""

# Write files
with open('instagram.py', 'w', encoding='utf-8') as f:
    f.write(instagram_content)

with open('snapchat.py', 'w', encoding='utf-8') as f:
    f.write(snapchat_content)

with open('tiktok.py', 'w', encoding='utf-8') as f:
    f.write(tiktok_content)

with open('website.py', 'w', encoding='utf-8') as f:
    f.write(website_content)

print("Files created successfully!")

