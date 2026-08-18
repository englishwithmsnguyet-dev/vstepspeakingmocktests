import re

path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 2/test02-index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'<div class="level-content">(.*?)</div>\s*(?:</div>|$)', re.DOTALL)
matches = pattern.findall(content)

# Actually, the div nesting can be tricky. Let's just search for the English + Vietnamese pair manually:
levels = re.split(r'<div class="level-content">', content)[1:]
for level in levels:
    # Get everything until the closing div of translation-text
    parts = level.split('<div class="translation-text"')
    if len(parts) > 1:
        english = parts[0]
        vietnamese = parts[1].split('</div>')[0]
        if '<strong' not in vietnamese:
            print("ENGLISH:", english[:100].strip())
            print("VIETNAMESE:", vietnamese.split('>')[-1].strip())
            print("-" * 50)
