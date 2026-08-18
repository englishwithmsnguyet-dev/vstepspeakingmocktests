import re
import os
import shutil
from bs4 import BeautifulSoup

root_dir = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'
test5_dir = os.path.join(root_dir, 'test 5')
html_path = os.path.join(test5_dir, 'test05-index.html')

# 1. Copy app.js and styles.css
shutil.copy(os.path.join(root_dir, 'test 1', 'app.js'), os.path.join(test5_dir, 'app.js'))
shutil.copy(os.path.join(root_dir, 'test 1', 'styles.css'), os.path.join(test5_dir, 'styles.css'))

# 2. Inject TTS Buttons
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'(<span class="level-badge b1">B1 LEVEL</span>)',
    r'\1\n                                        <button class="tts-play-btn" onclick="playTTS(this)"><i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu</button>',
    content
)

content = re.sub(
    r'(<span class="level-badge b2">B2 LEVEL</span>)',
    r'\1\n                                        <button class="tts-play-btn" onclick="playTTS(this)"><i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu</button>',
    content
)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

# 3. Rebuild answers
with open('test5_format.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

answers = []
current_level = None
current_html_paragraphs = []

def finish_answer():
    global current_level, current_html_paragraphs
    if current_level and current_html_paragraphs:
        html_text = "<br><br>".join(current_html_paragraphs)
        answers.append({'html': html_text})
        current_html_paragraphs = []
    current_level = None

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    if line.endswith('LEVEL'):
        finish_answer()
        current_level = line
    elif (line.startswith('[_|') or line.startswith('[B|')) and current_level and 'LEVEL' not in line:
        runs = line.split(' | ')
        html_parts = []
        for r in runs:
            m = re.match(r'\[([B_])\|([0-9A-F]+|None)\] (.*)', r)
            if m:
                is_bold = m.group(1) == 'B'
                color = m.group(2)
                text = m.group(3)
                
                if is_bold and color != 'None':
                    html_parts.append(f'<strong style="color: #{color.lower()};">{text}</strong>')
                elif is_bold:
                    html_parts.append(f'<strong>{text}</strong>')
                else:
                    html_parts.append(text)
            else:
                html_parts.append(r)
        
        p_text = "".join(html_parts)
        p_text = p_text.replace(" .", ".").replace(" ,", ",").replace(" ’ s", "’s").replace(" ' s", "'s")
        p_text = p_text.replace(" ?", "?").replace(" !", "!")
        
        clean_text = re.sub(r'<[^>]+>', '', p_text).strip()
        if clean_text and clean_text[0].isdigit() and ". " in clean_text[:5]:
            finish_answer()
        elif clean_text.startswith("PART ") or clean_text.startswith("Let's talk about") or clean_text.startswith("SITUATION") or clean_text.startswith("TOPIC"):
            finish_answer()
        elif clean_text == "FOLLOW-UP QUESTIONS":
            finish_answer()
        else:
            current_html_paragraphs.append(p_text)

finish_answer()
print(f"Extracted {len(answers)} answers from test5_format.txt")

with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

level_contents = soup.find_all('div', class_='level-content')

for i, lc in enumerate(level_contents):
    if i >= len(answers):
        break
    eng_html = answers[i]['html']
    
    toggle = lc.find('div', class_='translation-toggle')
    text_div = lc.find('div', class_='translation-text')
    
    lc.clear()
    eng_soup = BeautifulSoup(eng_html, 'html.parser')
    lc.append(eng_soup)
    
    if toggle:
        lc.append(toggle)
    if text_div:
        lc.append(text_div)

html_output = str(soup)
html_output = html_output.replace('\\"', '"')

html_output = re.sub(
    r'<strong[^>]*>it</strong>\s*<strong[^>]*>[’\']</strong>\s*<strong[^>]*>s\s*',
    r'<strong style="color: #00b0f0;">it’s ',
    html_output
)

html_output = re.sub(
    r'<strong>do</strong>\s*<strong[^>]*>n[’\']</strong>\s*<strong[^>]*>t\s*',
    r'<strong>don’t ',
    html_output
)

html_output = re.sub(
    r'<strong[^>]*>don</strong>\s*<strong[^>]*>[’\']</strong>\s*<strong[^>]*>t\s*',
    r'<strong style="color: #00b0f0;">don’t ',
    html_output
)

# Merge strong tags
def merge_strong_space(match):
    style1 = match.group(1) or ""
    text1 = match.group(2)
    space = match.group(3)
    style2 = match.group(4) or ""
    text2 = match.group(5)
    if style1 == style2:
        if style1:
            return f'<strong {style1}>{text1}{space}{text2}</strong>'
        else:
            return f'<strong>{text1}{space}{text2}</strong>'
    return match.group(0)

def merge_strong_nospace(match):
    style1 = match.group(1) or ""
    text1 = match.group(2)
    style2 = match.group(3) or ""
    text2 = match.group(4)
    if style1 == style2:
        if style1:
            return f'<strong {style1}>{text1}{text2}</strong>'
        else:
            return f'<strong>{text1}{text2}</strong>'
    return match.group(0)

pattern_space = re.compile(r'<strong(?: (style="[^"]+"))?>([^<]*)</strong>(\s+)<strong(?: (style="[^"]+"))?>([^<]*)</strong>')
pattern_nospace = re.compile(r'<strong(?: (style="[^"]+"))?>([^<]*)</strong><strong(?: (style="[^"]+"))?>([^<]*)</strong>')

prev_html = ""
while html_output != prev_html:
    prev_html = html_output
    html_output = pattern_space.sub(merge_strong_space, html_output)
    
prev_html = ""
while html_output != prev_html:
    prev_html = html_output
    html_output = pattern_nospace.sub(merge_strong_nospace, html_output)

# Vietnamese coloring
red_keywords = [
    "gợi ý một yếu tố cho em gái tôi cân nhắc khi chọn trường đại học",
    "chọn xếp hạng của trường",
    "xếp hạng của trường",
    "yếu tố",
    "cân nhắc khi nộp đơn xin việc",
    "xem xét khi xin việc",
    "xin việc"
]

green_keywords = [
    "chọn một trường đại học dựa trên khoảng cách từ nhà",
    "chất lượng giáo dục quan trọng hơn",
    "chọn một trường đại học chủ yếu dựa trên khoảng cách từ nhà",
    "một trường đại học gần nhà có thể không cung cấp môi trường học tập tốt nhất"
]

purple_keywords = [
    "học phí",
    "một trường đại học rẻ hơn",
    "có thể không luôn mang lại nền giáo dục tốt nhất",
    "sinh viên thường có thể tìm thấy học bổng",
    "hoặc hỗ trợ tài chính"
]

blue_keywords = [
    "uống trà xanh vài lần một tuần", "hương vị thanh mát và giúp tôi thư giãn",
    "uống một tách vào buổi sáng", "cảm thấy sảng khoái và tập trung suốt cả ngày",
    "sự thay thế lành mạnh hơn cho nhiều loại đồ uống có đường",
    "trong những giờ nghỉ giải lao ngắn khi làm việc", "tỉnh táo và duy trì sự tập trung",
    "làm việc hiệu quả hơn và cảm thấy năng suất hơn", "phổ biến ở nước tôi",
    "những người lớn tuổi", "phải chăng, thanh mát", "mang lại nhiều lợi ích cho sức khỏe",
    "trở thành một phần quan trọng của văn hóa Việt Nam",
    "đến các khu chợ và trung tâm mua sắm đông đúc", "bận rộn, đặc biệt là vào cuối tuần",
    "trung tâm thương mại, lễ hội âm nhạc và các sự kiện công cộng",
    "tràn đầy năng lượng và thu hút số lượng lớn người tham gia", "nhiều điều thú vị để xem",
    "mệt mỏi vì quá ồn ào", "bầu không khí sôi động và tràn đầy năng lượng",
    "ngột ngạt vì tiếng ồn và đám đông lớn", "thư giãn và tập trung tốt hơn",
    "thoải mái hơn trong môi trường thanh bình", "thanh bình, nơi tôi có thể thư giãn, tập trung vào công việc và nạp lại năng lượng sau một ngày bận rộn",
    "mang lại một nền giáo dục tốt", "học hỏi từ những giáo viên giàu kinh nghiệm",
    "sử dụng tài liệu học tập tốt hơn", "cải thiện kiến thức và kỹ năng của mình",
    "cơ sở vật chất và nguồn tài liệu học tập tốt hơn", "sử dụng thư viện, phòng thí nghiệm và tài liệu học tập hiện đại",
    "học tập hiệu quả hơn", "cung cấp nền giáo dục chất lượng cao",
    "học hỏi từ những giảng viên giàu kinh nghiệm", "tiếp cận các nguồn tài liệu học tập tốt hơn",
    "phát triển kiến thức và kỹ năng hiệu quả hơn", "có lợi cho sự nghiệp tương lai của em ấy",
    "thích sinh viên từ các trường đại học danh tiếng", "tìm được một công việc tốt dễ dàng hơn sau khi tốt nghiệp",
    "cung cấp mức thu nhập ổn định", "trả tiền cho chi phí sinh hoạt hàng ngày",
    "hỗ trợ gia đình", "cải thiện chất lượng cuộc sống", "môi trường làm việc thân thiện",
    "làm việc với những đồng nghiệp tốt và người quản lý hỗ trợ", "cảm thấy vui vẻ và có động lực hơn",
    "hoàn thành tốt công việc của mình", "mang lại cơ hội học hỏi những điều mới",
    "đào tạo để nâng cao kỹ năng", "tiến bộ trong sự nghiệp", "đáp ứng nhu cầu cơ bản",
    "chi trả tiền thuê nhà, thực phẩm và các chi phí khác", "cảm thấy an toàn về mặt tài chính",
    "tạo ra một bầu không khí tích cực", "cộng tác hiệu quả với những người khác",
    "giảm căng thẳng", "hoạt động tốt hơn", "cung cấp cơ hội phát triển nghề nghiệp",
    "tham gia các chương trình đào tạo", "nâng cao kỹ năng", "chuẩn bị cho sự thăng tiến trong tương lai",
    "kỹ năng giao tiếp và làm việc nhóm", "kỹ năng giải quyết vấn đề", "làm việc hiệu quả hơn",
    "kỹ năng giao tiếp, làm việc nhóm và giải quyết vấn đề", "khả năng thích nghi và sẵn sàng học hỏi những điều mới",
    "làm việc tốt trong môi trường chuyên nghiệp", "công nghệ thông tin, y học và tài chính",
    "đòi hỏi kiến thức và kỹ năng chuyên môn sâu", "công nghệ thông tin, chăm sóc sức khỏe, tài chính và quản lý kinh doanh",
    "bằng cấp tốt và chuyên môn sâu rộng", "hoàn thành các nhiệm vụ nhanh chóng và hiệu quả hơn",
    "giao tiếp trong công việc dễ dàng hơn", "tăng đáng kể hiệu quả nơi làm việc",
    "tự động hóa các công việc thường nhật và cải thiện giao tiếp",
    "làm việc từ xa, tiếp cận thông tin ngay lập tức và cộng tác hiệu quả hơn với các đồng nghiệp",
    "làm việc năng suất hơn bao giờ hết"
]

def color_vietnamese(match):
    trans_content = match.group(1)
    
    for kw in red_keywords:
        trans_content = trans_content.replace(kw, f'<strong style="color: #ee0000;">{kw}</strong>')
    
    for kw in green_keywords:
        trans_content = trans_content.replace(kw, f'<strong style="color: #70ad47;">{kw}</strong>')
        
    for kw in purple_keywords:
        trans_content = trans_content.replace(kw, f'<strong style="color: #7030a0;">{kw}</strong>')
        
    for kw in blue_keywords:
        if f'>{kw}<' not in trans_content and f'="{kw}"' not in trans_content:
            trans_content = trans_content.replace(kw, f'<strong style="color: #00b0f0;">{kw}</strong>')
            
    trans_content = re.sub(r'<strong[^>]*><strong[^>]*>(.*?)</strong></strong>', r'<strong style="color: #00b0f0;">\1</strong>', trans_content)
    
    return f'<div class="translation-text" style="display: none; white-space: pre-line;">{trans_content}</div>'

html_output = re.sub(r'<div class="translation-text" style="display: none; white-space: pre-line;">(.*?)</div>', color_vietnamese, html_output, flags=re.DOTALL)
html_output = html_output.replace('<strong><strong', '<strong').replace('</strong></strong>', '</strong>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_output)

print("Successfully updated test05-index.html")
