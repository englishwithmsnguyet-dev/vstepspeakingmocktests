import re

# Fix Test 11
path11 = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 11/test11-index.html'
with open(path11, 'r', encoding='utf-8') as f:
    c11 = f.read()

c11 = c11.replace('<p class="topic-desc">There are several drawbacks of internships.</p>', '<p class="topic-desc">There are several ways to make the world a better place.</p>')

with open(path11, 'w', encoding='utf-8') as f:
    f.write(c11)

# Fix Test 12
path12 = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 12/test12-index.html'
with open(path12, 'r', encoding='utf-8') as f:
    c12 = f.read()

c12 = c12.replace('<p class="topic-desc">There are several drawbacks of internships.</p>', '<p class="topic-desc">Technology has influenced people\'s working habits in many ways.</p>')
c12 = re.sub(r'<span style="color: var\(--color-red\); font-weight: normal; display: block; margin-top: 8px;">Note \(Your own idea\) → Reduce paper usage in offices\. <span class="sol-translation" style="display: block; margin-top: 4px; margin-left: 0;">\(Ý kiến của riêng bạn → Giảm sử dụng giấy trong văn phòng\.\)</span></span>', '', c12)

with open(path12, 'w', encoding='utf-8') as f:
    f.write(c12)

print("Fixed topic-desc for Test 11 and Test 12")
