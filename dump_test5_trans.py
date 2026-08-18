import re
from bs4 import BeautifulSoup

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 5/test05-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

level_contents = soup.find_all('div', class_='level-content')

for i, lc in enumerate(level_contents):
    # The English text is everything before the translation-toggle
    toggle = lc.find('div', class_='translation-toggle')
    text_div = lc.find('div', class_='translation-text')
    
    if toggle and text_div:
        # Extract English HTML by removing the toggle and text_div
        eng_soup = BeautifulSoup(str(lc), 'html.parser')
        eng_soup.find('div', class_='translation-toggle').decompose()
        eng_soup.find('div', class_='translation-text').decompose()
        
        print(f"--- ITEM {i+1} ---")
        print("EN:", eng_soup.decode_contents().strip().replace('\n', ' '))
        print("VI:", text_div.decode_contents().strip().replace('\n', ' '))
        print()
