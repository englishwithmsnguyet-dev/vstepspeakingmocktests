import re

file_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 10/test10-index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

part3_start = html.find('<!-- Panel Part 3 -->')
part4_end = html.find('<!-- Panel Part 4 -->')
working_block = html[part3_start:part4_end]

matches = re.findall(r'<div class="translation-text"([^>]*)>(.*?)</div>', working_block, flags=re.DOTALL)
print("Matches found:", len(matches))
for m in matches:
    print(m[0][:50], m[1][:50])
