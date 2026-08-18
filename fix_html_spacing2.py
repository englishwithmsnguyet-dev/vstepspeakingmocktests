import re
from bs4 import BeautifulSoup

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Fix space after periods and commas if followed directly by a letter
html = re.sub(r'\.([A-Z])', r'. \1', html)
html = re.sub(r'</span>\. ([A-Z])', r'</span>. \1', html)
html = re.sub(r'</strong>\.([A-Z])', r'</strong>. \1', html)
html = re.sub(r'</strong>,([A-Za-z])', r'</strong>, \1', html)
html = re.sub(r',([A-Za-z])', r', \1', html)

# Ensure no double spaces
html = html.replace("  ", " ")

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixed spacing after periods.")
