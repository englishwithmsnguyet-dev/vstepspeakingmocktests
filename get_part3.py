import re
from bs4 import BeautifulSoup

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 2/test02-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

lcs = soup.find_all('div', class_='level-content')

# Part 03 Topic is the last topic before follow-up questions
# Actually let's just print the last 6 answers (which are Part 3 + Followups)
for i in range(-8, 0):
    try:
        print(f"--- ANSWER {i} ---")
        lc = lcs[i]
        eng = lc.decode_contents().split('<div class="translation-toggle"')[0]
        eng_clean = re.sub(r'<strong[^>]*>(.*?)</strong>', r'[B]\1[/B]', eng)
        eng_clean = re.sub(r'<[^>]+>', '', eng_clean).strip()
        print("ENG:\n", eng_clean)
        
        trans = lc.find('div', class_='translation-text')
        if trans:
            print("VIET:\n", trans.get_text())
    except:
        pass
