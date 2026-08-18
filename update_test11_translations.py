# -*- coding: utf-8 -*-
import re
import os
from bs4 import BeautifulSoup

root_dir = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'
test_dir = os.path.join(root_dir, 'test 11')
html_path = os.path.join(test_dir, 'test11-index.html')

with open('test11_format.txt', 'r', encoding='utf-8') as f:
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

translations = [
    "Tôi thường viết những việc quan trọng vào sổ tay. Nó giúp tôi nhớ các công việc và cuộc hẹn. Tôi kiểm tra nó mỗi ngày.",
    "Tôi thường sử dụng sổ tay hoặc điện thoại để theo dõi những việc quan trọng. Việc viết ra giúp tôi sống có tổ chức và tránh quên các công việc quan trọng. Đó là một thói quen mà tôi thấy rất hữu ích.",
    "Vâng, tôi đã từng. Có một lần, tôi quên ngày sinh nhật của bạn tôi. Cô ấy đã hơi thất vọng. Tôi đã xin lỗi và mua cho cô ấy một món quà nhỏ sau đó.",
    "Vâng, tôi đã từng. Vài năm trước, tôi quên một cuộc họp quan trọng vì tôi không kiểm tra lịch trình của mình cẩn thận. Kết quả là tôi đến muộn và phải xin lỗi. Kể từ đó, tôi đã trở nên cẩn thận hơn về việc quản lý thời gian của mình.",
    "Tôi nghĩ mọi người đã ghi nhớ tốt hơn trong quá khứ. Họ không phụ thuộc vào công nghệ nhiều như chúng ta ngày nay. Kết quả là họ phải tự mình ghi nhớ mọi thứ.",
    "Tôi tin rằng mọi người đã ghi nhớ tốt hơn trong quá khứ vì họ phụ thuộc nhiều hơn vào trí nhớ của mình. Ngày nay, nhiều người phụ thuộc nhiều vào điện thoại thông minh và các thiết bị kỹ thuật số. Điều này có thể khiến họ ít có khả năng tự ghi nhớ thông tin hơn.",
    "Vâng, tôi có. Đôi khi tôi sử dụng xe buýt để di chuyển quanh thành phố. Chúng rất dễ sử dụng và có sẵn ở nhiều khu vực. Tôi thường chọn chúng cho những chuyến đi ngắn.",
    "Vâng, tôi có. Đôi khi tôi sử dụng phương tiện giao thông công cộng, đặc biệt là xe buýt, để di chuyển quanh thành phố. Đây là một lựa chọn tiện lợi cho những chuyến đi ngắn. Bên cạnh đó, tôi không phải lo lắng về việc đỗ xe.",
    "Tôi thích các phương tiện cá nhân hơn. Chúng tiện lợi và linh hoạt hơn. Tôi có thể đi lại bất cứ khi nào tôi muốn. Chúng cũng giúp tôi tiết kiệm thời gian.",
    "Tôi thích các phương tiện cá nhân hơn vì chúng cho tôi sự tự do hơn khi đi lại. Điều này có nghĩa là tôi không phải tuân theo một lịch trình cố định hoặc chờ phương tiện công cộng. Điều này giúp tôi tiết kiệm rất nhiều thời gian, đặc biệt là vào những ngày bận rộn.",
    "Phương tiện giao thông công cộng có nhiều lợi ích. Nó giúp mọi người tiết kiệm tiền. Nó cũng giảm tình trạng tắc đường và bảo vệ môi trường.",
    "Phương tiện giao thông công cộng mang lại một số lợi thế. Nó cho phép mọi người tiết kiệm tiền chi phí đi lại. Nó cũng có thể giảm ùn tắc giao thông và giúp bảo vệ môi trường bằng cách giảm mức độ ô nhiễm.",
    "À, nếu tôi phải chọn một cách để cải thiện kỹ năng tiếng Anh của mình, tôi sẽ chọn tham gia một câu lạc bộ tiếng Anh.\n\nĐầu tiên, đây là một hoạt động mang tính giáo dục vì nó cho tôi cơ hội thực hành tiếng Anh thường xuyên. Tôi có thể học từ mới và cải thiện kỹ năng nói của mình. Vì vậy, tôi có thể trở nên tự tin hơn trong việc sử dụng tiếng Anh.\n\nThứ hai, đây là một hoạt động mang tính xã hội vì tôi có thể gặp gỡ những người có cùng sở thích tiếng Anh. Chúng tôi có thể học hỏi lẫn nhau và chia sẻ kinh nghiệm hữu ích. Vì vậy, tôi có thể duy trì động lực học tiếng Anh.\n\nTôi sẽ không chọn việc nói chuyện với người bản ngữ vì tôi có thể không có nhiều cơ hội để gặp họ. Đối với việc đi du lịch nước ngoài, nó ít phù hợp hơn vì nó có thể rất đắt đỏ.\n\nTóm lại, tôi tin rằng tham gia một câu lạc bộ tiếng Anh là lựa chọn tốt nhất cho tình huống này.",
    "À, nếu tôi phải chọn một cách để cải thiện kỹ năng tiếng Anh của mình, tôi sẽ chọn tham gia một câu lạc bộ tiếng Anh.\n\nĐầu tiên, đây là một hoạt động mang tính giáo dục vì nó cho phép tôi thực hành nói tiếng Anh thường xuyên. Bên cạnh đó, nó giúp tôi cải thiện kỹ năng phát âm và giao tiếp. Bằng cách này, tôi có thể trở nên tự tin hơn khi sử dụng tiếng Anh.\n\nThứ hai, đây là một hoạt động mang tính xã hội vì nó cho tôi cơ hội gặp gỡ những người có cùng sở thích. Hơn nữa, tôi có thể chia sẻ kinh nghiệm học tập và thảo luận về các chủ đề khác nhau bằng tiếng Anh. Nhờ vậy, tôi có thể duy trì động lực và cải thiện tiếng Anh của mình hiệu quả hơn.\n\nTôi sẽ không chọn đi du lịch nước ngoài vì nó có thể quá đắt. Đối với việc nói chuyện với người bản ngữ, nó ít phù hợp hơn vì một số người học có thể cảm thấy ngại ngùng hoặc lo lắng khi nói chuyện với người lạ.\n\nTóm lại, tôi tin rằng tham gia một câu lạc bộ tiếng Anh là lựa chọn tốt nhất cho tình huống này.",
    "Có một số cách để làm cho thế giới trở thành một nơi tốt đẹp hơn.\n\nMột biện pháp hiệu quả là giảm ô nhiễm. Ví dụ, mọi người nên sử dụng ít nhựa hơn và tái chế nhiều rác thải hơn. Kết quả là môi trường có thể trở nên sạch sẽ hơn.\n\nMột phương pháp thiết thực khác là làm công việc tình nguyện. Chẳng hạn, mọi người có thể giúp đỡ các gia đình khó khăn và hỗ trợ các hoạt động cộng đồng. Do đó, xã hội có thể trở nên quan tâm và hỗ trợ hơn.\n\nMột cách tiếp cận hữu ích nữa là tuân thủ luật pháp và các quy định. Điều này giúp duy trì trật tự và sự an toàn trong xã hội. Kết quả là mọi người có thể tận hưởng chất lượng cuộc sống tốt hơn.\n\nTóm lại, có một số cách hiệu quả để làm cho thế giới trở nên tốt đẹp hơn, như đã đề cập ở trên.",
    "Có một số cách để làm cho thế giới trở thành một nơi tốt đẹp hơn.\n\nMột biện pháp hiệu quả là giảm ô nhiễm. Ví dụ, mọi người có thể tái chế rác thải và sử dụng các sản phẩm thân thiện với môi trường. Kết quả là, môi trường có thể trở nên sạch sẽ và lành mạnh hơn.\n\nMột phương pháp thiết thực khác là làm công việc tình nguyện. Chẳng hạn, các tình nguyện viên có thể giúp đỡ những người khó khăn và hỗ trợ các hoạt động cộng đồng. Điều này có thể cải thiện cuộc sống của người dân và củng cố các cộng đồng.\n\nMột cách tiếp cận hữu ích nữa là tuân thủ luật pháp và các quy định. Khi mọi người tuân theo pháp luật, xã hội trở nên có tổ chức và ổn định hơn. Do đó, mọi người có thể sống trong một môi trường an toàn hơn.\n\nTóm lại, có một số cách hiệu quả để làm cho thế giới trở thành một nơi tốt đẹp hơn.",
    "Tôi nghĩ ô nhiễm không khí là một trong những vấn đề môi trường nghiêm trọng nhất ở đất nước tôi. Nó ảnh hưởng đến sức khỏe của con người và chất lượng cuộc sống. Ở một số thành phố, không khí không được sạch sẽ cho lắm.",
    "Theo tôi, ô nhiễm không khí và ô nhiễm nguồn nước là những vấn đề môi trường nghiêm trọng nhất. Chúng có thể ảnh hưởng đến sức khỏe con người và phá hủy các hệ sinh thái. Kết quả là, nhiều cộng đồng phải đối mặt với những thách thức về môi trường.",
    "Tôi nghĩ cả hai nên nhận trách nhiệm. Chính phủ có thể tạo ra các luật pháp và chính sách. Các cá nhân nên tuân thủ các quy tắc và đóng góp cho xã hội.",
    "Tôi nghĩ cả các cá nhân và chính phủ nên chia sẻ trách nhiệm. Chính phủ có thể tạo ra các chính sách, trong khi các cá nhân có thể thực hiện những hành động tích cực trong cuộc sống hàng ngày. Chỉ thông qua sự hợp tác, xã hội mới có thể cải thiện hiệu quả.",
    "Những người trẻ tuổi có thể giúp đỡ bằng cách bảo vệ môi trường và giúp đỡ người khác. Họ cũng có thể học hành chăm chỉ và phát triển những kỹ năng hữu ích. Những hành động này có thể làm cho xã hội trở nên tốt đẹp hơn.",
    "Thanh niên có thể xây dựng một tương lai tốt đẹp hơn bằng cách bảo vệ môi trường. Hơn nữa, việc tham gia vào các hoạt động cộng đồng có thể giúp giải quyết các vấn đề xã hội. Bằng cách làm việc cùng nhau, họ có thể tạo ra một tác động tích cực đến thế giới."
]

def format_vietnamese(text):
    reds = [
        "chọn một cách để cải thiện kỹ năng tiếng Anh của mình", "tham gia một câu lạc bộ tiếng Anh",
        "cách", "cách hiệu quả", "làm cho thế giới trở thành một nơi tốt đẹp hơn",
        "làm cho thế giới trở nên tốt đẹp hơn", "làm cho thế giới trở thành một nơi tốt đẹp hơn"
    ]
    greens = [
        "nói chuyện với người bản ngữ", "không có nhiều cơ hội để gặp họ",
        "đi du lịch nước ngoài", "quá đắt"
    ]
    purples = [
        "đi du lịch nước ngoài", "rất đắt đỏ",
        "nói chuyện với người bản ngữ", "ngại ngùng hoặc lo lắng", "khi nói chuyện với người lạ"
    ]
    blues = [
        "viết những việc quan trọng vào sổ tay", "nhớ các công việc và", "cuộc hẹn", "kiểm tra nó mỗi ngày",
        "sử dụng sổ tay hoặc điện thoại để theo dõi những việc quan trọng", "sống có tổ chức", "tránh quên các công việc quan trọng",
        "quên ngày sinh nhật của bạn tôi", "hơi thất vọng", "xin lỗi", "mua cho cô ấy một món quà nhỏ sau đó",
        "quên một cuộc họp quan trọng", "không kiểm tra", "lịch trình của mình cẩn thận", "đến muộn", "phải xin lỗi", "trở nên cẩn thận hơn về việc quản lý thời gian của mình",
        "ghi nhớ tốt hơn trong quá khứ", "không phụ thuộc vào công nghệ", "nhiều như chúng ta ngày nay", "tự mình ghi nhớ mọi thứ",
        "phụ thuộc nhiều hơn vào", "trí nhớ của mình", "phụ thuộc nhiều vào điện thoại thông minh và các thiết bị kỹ thuật số", "ít có khả năng tự ghi nhớ thông tin hơn",
        "đôi khi sử dụng xe buýt để di chuyển quanh thành phố", "dễ sử dụng", "có sẵn ở nhiều khu vực", "chọn chúng cho những chuyến đi ngắn",
        "sử dụng phương tiện giao thông công cộng", "đặc biệt là xe buýt", "di chuyển quanh thành phố", "lựa chọn tiện lợi cho những chuyến đi ngắn", "không phải lo lắng về việc đỗ xe",
        "phương tiện cá nhân hơn", "tiện lợi và linh hoạt hơn", "đi lại bất cứ khi nào tôi muốn", "tiết kiệm thời gian",
        "cho tôi sự tự do hơn khi đi lại", "không phải tuân theo một lịch trình cố định", "chờ phương tiện công cộng", "tiết kiệm rất nhiều thời gian", "vào những ngày bận rộn",
        "tiết kiệm tiền", "giảm tình trạng tắc đường", "tắc đường", "bảo vệ môi trường",
        "chi phí đi lại", "giảm ùn tắc giao thông", "môi trường",
        "hoạt động mang tính giáo dục", "thực hành tiếng Anh", "thường xuyên", "học từ mới", "cải thiện kỹ năng nói của mình", "tự tin hơn trong việc sử dụng tiếng Anh",
        "hoạt động mang tính xã hội", "gặp gỡ những người có cùng sở thích tiếng Anh", "tiếng Anh", "học hỏi lẫn nhau", "chia sẻ kinh nghiệm hữu ích", "duy trì động lực học tiếng Anh",
        "thực hành nói tiếng Anh", "cải thiện kỹ năng phát âm và giao tiếp", "tự tin hơn khi sử dụng tiếng Anh",
        "gặp gỡ những người có cùng sở thích", "sở thích", "chia sẻ kinh nghiệm học tập", "thảo luận về các chủ đề khác nhau bằng", "duy trì động lực", "cải thiện tiếng Anh của mình hiệu quả hơn",
        "giảm ô nhiễm", "sử dụng ít nhựa hơn", "tái chế", "nhiều rác thải hơn", "trở nên sạch sẽ hơn",
        "làm công việc tình nguyện", "giúp đỡ các gia đình khó khăn", "khó khăn", "gia đình", "hỗ trợ các hoạt động cộng đồng", "quan tâm và hỗ trợ hơn", "và", "hỗ trợ",
        "tuân thủ luật pháp và các quy định", "duy trì trật tự", "sự an toàn trong xã hội", "tận hưởng chất lượng cuộc sống tốt hơn",
        "tái chế rác thải", "sử dụng các sản phẩm thân thiện với môi trường", "sạch sẽ và lành mạnh hơn",
        "giúp đỡ những người khó khăn", "người", "cải thiện cuộc sống của người dân", "củng cố các cộng đồng",
        "tuân theo pháp luật", "trở nên có tổ chức và ổn định hơn", "sống trong một môi trường an toàn hơn",
        "ô nhiễm không khí", "vấn đề môi trường nghiêm trọng nhất ở đất nước tôi", "ảnh hưởng đến sức khỏe của con người", "chất lượng cuộc sống", "không khí không được sạch sẽ cho lắm",
        "ô nhiễm nguồn nước", "ảnh hưởng đến sức khỏe con người", "phá hủy các hệ sinh thái", "đối mặt với những thách thức về môi trường",
        "cả hai nên nhận trách nhiệm", "Chính phủ", "tạo ra các luật pháp và chính sách", "Các cá nhân", "tuân thủ các quy tắc", "đóng góp cho xã hội",
        "cả các cá nhân và chính phủ", "chia sẻ trách nhiệm", "tạo ra các chính sách", "thực hiện những hành động tích cực trong cuộc sống hàng ngày", "sự hợp tác", "cải thiện hiệu quả",
        "bảo vệ môi trường", "giúp đỡ người khác", "học hành chăm chỉ", "phát triển những kỹ năng hữu ích", "làm cho xã hội trở nên tốt đẹp hơn"
    ]
    
    for w in reds:
        text = text.replace(w, f'<strong style="color: #ee0000;">{w}</strong>')
    for w in greens:
        text = text.replace(w, f'<strong style="color: #70ad47;">{w}</strong>')
    for w in purples:
        text = text.replace(w, f'<strong style="color: #7030a0;">{w}</strong>')
    for w in blues:
        if f'>{w}<' not in text and f'="{w}"' not in text:
            text = text.replace(w, f'<strong style="color: #00b0f0;">{w}</strong>')
    
    # fix nested
    text = re.sub(r'<strong[^>]*><strong[^>]*>(.*?)</strong></strong>', r'<strong style="color: #00b0f0;">\1</strong>', text)
            
    return f'<div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div><div class="translation-text" style="display: none; white-space: pre-line;">{text}</div>'

with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

level_contents = soup.find_all('div', class_='level-content')

for i, lc in enumerate(level_contents):
    if i >= len(answers):
        break
    
    eng_html = answers[i]['html']
    viet_html = format_vietnamese(translations[i])
    
    lc.clear()
    
    eng_soup = BeautifulSoup(eng_html, 'html.parser')
    lc.append(eng_soup)
    
    viet_soup = BeautifulSoup(viet_html, 'html.parser')
    lc.append(viet_soup)

html_output = str(soup)

# Inject TTS Buttons
html_output = re.sub(
    r'(<span class="level-badge b1">B1 LEVEL</span>)',
    r'\1\n                                        <button class="tts-play-btn" onclick="playTTS(this)"><i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu</button>',
    html_output
)

html_output = re.sub(
    r'(<span class="level-badge b2">B2 LEVEL</span>)',
    r'\1\n                                        <button class="tts-play-btn" onclick="playTTS(this)"><i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu</button>',
    html_output
)

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

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_output)

print("Successfully updated test11-index.html with translations and TTS")
