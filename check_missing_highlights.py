import os
import re

root_dir = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'

for i in range(1, 13):
    path = os.path.join(root_dir, f'test {i}', f'test{i:02d}-index.html')
    if not os.path.exists(path):
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all translation-text divs
    pattern = re.compile(r'<div class="translation-text".*?>(.*?)</div>', re.DOTALL)
    matches = pattern.findall(content)
    
    missing_count = 0
    total = len(matches)
    for text in matches:
        if '<strong' not in text:
            missing_count += 1
            
    if total > 0:
        print(f"Test {i:02d}: {missing_count}/{total} translations are missing <strong tags.")
    else:
        print(f"Test {i:02d}: No translations found.")
