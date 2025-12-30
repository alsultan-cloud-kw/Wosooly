"""
Script to properly extract sections from competitor_analysis.py
"""
import re

# Read the original file
with open('../competitor_analysis.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Get common imports (first 60 lines)
common_imports = ''.join(lines[0:60])

# Instagram-specific: lines 66-218 (instagram-profiles endpoints) + 1170-3020 (scraping functions and endpoints)
instagram_section = lines[66:218] + ['\n'] + lines[1169:3020]

# Snapchat-specific: lines 3398-4700
snapchat_section = lines[3398:4700]

# TikTok-specific: lines 3363-3377
tiktok_section = lines[3363:3378]

# Website-specific: lines 1063-1167 (ScrapeBrandWebsitesRequest + scrape/brand-websites) + 3119-3342 (helper functions) + 4700-4781 (scrape/website, scrape/products)
website_section = lines[1063:1167] + ['\n'] + lines[3119:3342] + ['\n'] + lines[4700:4781]

# Write Instagram file
with open('instagram.py', 'w', encoding='utf-8') as f:
    f.write(common_imports)
    f.write('\n')
    f.write('router = APIRouter()\n')
    f.write('\n')
    f.writelines(instagram_section)

# Write Snapchat file
with open('snapchat.py', 'w', encoding='utf-8') as f:
    f.write(common_imports)
    f.write('\n')
    f.write('router = APIRouter()\n')
    f.write('\n')
    f.writelines(snapchat_section)

# Write TikTok file
with open('tiktok.py', 'w', encoding='utf-8') as f:
    f.write(common_imports)
    f.write('\n')
    f.write('router = APIRouter()\n')
    f.write('\n')
    f.writelines(tiktok_section)

# Write Website file
with open('website.py', 'w', encoding='utf-8') as f:
    f.write(common_imports)
    f.write('\n')
    f.write('router = APIRouter()\n')
    f.write('\n')
    f.writelines(website_section)

print("Files created successfully!")

