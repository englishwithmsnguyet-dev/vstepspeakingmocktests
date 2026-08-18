import os
import glob
import re

workspace = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'

# Update index.html
index_path = os.path.join(workspace, 'index.html')
with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('<title>VSTEP Speaking Practice Dashboard - Miss Nguyet</title>', '<title>SPEAKING MOCK TESTS - ENGLISHWITHMISSNGUYET</title>')
with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Update all test pages
test_files = glob.glob(os.path.join(workspace, 'test *', '*.html'))
for filepath in test_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We replace "VSTEP Speaking Mock Test XX - Miss Nguyet" with "SPEAKING MOCK TEST XX - ENGLISHWITHMISSNGUYET"
    # Actually, we can use regex to preserve the test number
    new_content = re.sub(
        r'<title>VSTEP Speaking Mock Test (\d+) - Miss Nguyet</title>',
        r'<title>SPEAKING MOCK TEST \1 - ENGLISHWITHMISSNGUYET</title>',
        content
    )
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

print("Done updating titles.")
