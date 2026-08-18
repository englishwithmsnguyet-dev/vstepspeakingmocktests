import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Fix literal backslashes first
html = html.replace(r'\"', '"')

# Fix it's
# Original: <strong style="color: #00b0f0;">it</strong><strong style="color: #00b0f0;">’</strong><strong style="color: #00b0f0;">s
html = re.sub(
    r'<strong style="color: #00b0f0;">it</strong>\s*<strong style="color: #00b0f0;">’</strong>\s*<strong style="color: #00b0f0;">s',
    r'<strong style="color: #00b0f0;">it’s',
    html
)

# Fix don't
# Original: <strong>do</strong><strong style="color: #00b0f0;">n’</strong><strong style="color: #00b0f0;">t
# Wait, let's look at the grep output:
# students <strong>do</strong><strong style="color: #00b0f0;">n’</strong><strong style="color: #00b0f0;">t need to
html = re.sub(
    r'<strong>do</strong>\s*<strong style="color: #00b0f0;">n’</strong>\s*<strong style="color: #00b0f0;">t',
    r'<strong>don’t',
    html
)

# Wait, in the B2 level, don't is:
# <strong style="color: #00b0f0;">don</strong><strong style="color: #00b0f0;">’</strong><strong style="color: #00b0f0;">t need to
html = re.sub(
    r'<strong style="color: #00b0f0;">don</strong>\s*<strong style="color: #00b0f0;">’</strong>\s*<strong style="color: #00b0f0;">t',
    r'<strong style="color: #00b0f0;">don’t',
    html
)

# And B1 don't was actually:
# [B|None] do | [B|None] n’ | [B|None] t need to leave
# So it should be <strong>do</strong><strong>n’</strong><strong>t
html = re.sub(
    r'<strong>do</strong>\s*<strong>n’</strong>\s*<strong>t',
    r'<strong>don’t',
    html
)

# What about the bad replacement I did?
# I replaced with r"do</strong><strong style=\"color: #00b0f0;\">n’</strong><strong style=\"color: #00b0f0;\">t"
# So after removing backslashes, it is:
# <strong>do</strong><strong style="color: #00b0f0;">n’</strong><strong style="color: #00b0f0;">t
html = re.sub(
    r'<strong>do</strong>\s*<strong style="color: #00b0f0;">n’</strong>\s*<strong style="color: #00b0f0;">t',
    r'<strong>don’t',
    html
)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixed it's and don't")
