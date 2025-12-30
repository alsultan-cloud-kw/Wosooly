"""
Script to split competitor_analysis.py into modular files.
"""
import re

# Read the original file
with open('../competitor_analysis.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find section boundaries
instagram_start = 66  # First Instagram endpoint
instagram_end = 3020  # Before TikTok
snapchat_start = 3398  # Snapchat Scraping Functions comment
snapchat_end = 4700  # Before website scraping
tiktok_start = 3363  # TikTok endpoint
tiktok_end = 3378  # Before Snapchat
website_start = 1071  # scrape/brand-websites
website_end = 1167  # Before Instagram credentials

# Get common imports (first 60 lines)
common_imports = ''.join(lines[0:60])

# Extract Instagram section (lines 66-3020)
instagram_lines = lines[66:3020]

# Extract Snapchat section (lines 3398-4700)
snapchat_lines = lines[3398:4700]

# Extract TikTok section (lines 3363-3378)
tiktok_lines = lines[3363:3378]

# Extract Website section (lines 1071-1167, 3119-3342, 4700-4781)
website_lines = lines[1071:1167] + lines[3119:3342] + lines[4700:4781]

# Write Instagram file
with open('instagram.py', 'w', encoding='utf-8') as f:
    f.write(common_imports)
    f.write('\n')
    f.write('router = APIRouter()\n')
    f.write('\n')
    f.writelines(instagram_lines)

# Write Snapchat file
with open('snapchat.py', 'w', encoding='utf-8') as f:
    f.write(common_imports)
    f.write('\n')
    f.write('router = APIRouter()\n')
    f.write('\n')
    f.writelines(snapchat_lines)

# Write TikTok file
with open('tiktok.py', 'w', encoding='utf-8') as f:
    f.write(common_imports)
    f.write('\n')
    f.write('router = APIRouter()\n')
    f.write('\n')
    f.writelines(tiktok_lines)

# Write Website file
with open('website.py', 'w', encoding='utf-8') as f:
    f.write(common_imports)
    f.write('\n')
    f.write('router = APIRouter()\n')
    f.write('\n')
    f.writelines(website_lines)

print("Files created successfully!")
