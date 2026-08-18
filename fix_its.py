import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Remove all backslashes from style="color..."
html = html.replace('\\"', '"')

# Now let's blindly replace the tags around it's
html = re.sub(
    r'<strong[^>]*>it</strong>\s*<strong[^>]*>[’\']</strong>\s*<strong[^>]*>s\s*',
    r'<strong style="color: #00b0f0;">it’s ',
    html
)

html = re.sub(
    r'<strong>do</strong>\s*<strong[^>]*>n[’\']</strong>\s*<strong[^>]*>t\s*',
    r'<strong>don’t ',
    html
)

html = re.sub(
    r'<strong[^>]*>don</strong>\s*<strong[^>]*>[’\']</strong>\s*<strong[^>]*>t\s*',
    r'<strong style="color: #00b0f0;">don’t ',
    html
)

# And fix 'it ' s convenient' if it somehow became a single tag:
html = html.replace("it ' s", "it's")

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixed it's")
