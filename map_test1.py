import re
from bs4 import BeautifulSoup

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

level_contents = soup.find_all('div', class_='level-content')

for i, lc in enumerate(level_contents):
    eng = lc.contents[0].get_text(separator=" ").strip() if lc.contents else ""
    trans_div = lc.find('div', class_='translation-text')
    trans = trans_div.get_text(separator=' ').strip() if trans_div else ""
    
    bolds = [b.get_text() for b in lc.find_all('strong')]
    
    print(f"--- Ans {i} ---")
    print(f"Bolds: {bolds}")
    print(f"Trans: {trans}")
