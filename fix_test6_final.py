import re
from bs4 import BeautifulSoup

format_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test6_format.txt'
html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 6/test06-index.html'

with open(format_path, 'r', encoding='utf-8') as f:
    lines = [line.strip() for line in f if line.strip()]

items = []
current_item = []

for line in lines:
    if line.startswith('[B|None] B1 LEVEL') or line.startswith('[B|None] B2 LEVEL'):
        if current_item:
            items.append(current_item)
            current_item = []
        continue
    
    if '|' in line and ('[_|None]' in line or '[B|' in line):
        plain_text = re.sub(r'\[[B_]\|([0-9A-F]+|None)\]\s*', '', line).replace(' | ', '').strip()
        if plain_text.startswith('PART') or plain_text.startswith('SITUATION') or plain_text.startswith('TOPIC'):
            continue
        if plain_text.startswith('Let\'s talk') or plain_text.startswith('1.') or plain_text.startswith('2.') or plain_text.startswith('3.'):
            continue
        if 'SPEAKING MOCK TEST' in plain_text or plain_text.startswith('Follow-up questions') or plain_text.startswith('There are several reasons why responsibility is important'):
            continue
        
        if '[B|' in line or '[_|' in line:
            current_item.append(line)

if current_item:
    items.append(current_item)

def format_item(item_lines):
    html_lines = []
    for line in item_lines:
        line = line.replace(' | ', '')
        matches = re.findall(r'\[([B_])\|([0-9A-F]+|None)\]\s*([^\[]+)', line)
        html_line = ""
        for is_bold, color, text in matches:
            text = text.strip('\n')
            if not text:
                continue
            if is_bold == 'B':
                if color != 'None':
                    html_line += f'<strong style="color: #{color.lower()};">{text}</strong>'
                else:
                    html_line += f'<strong>{text}</strong>'
            else:
                html_line += text
        if html_line.strip():
            html_lines.append(html_line.strip())
            
    if len(html_lines) > 1:
        return "<br/><br/>".join(html_lines)
    elif len(html_lines) == 1:
        return html_lines[0]
    return ""

parsed_html_items = [format_item(item) for item in items]

# SLICE THE FIRST JUNK ITEM!
if len(parsed_html_items) > 22:
    parsed_html_items = parsed_html_items[1:]

for i in range(len(parsed_html_items)):
    parsed_html_items[i] = parsed_html_items[i].replace('</strong><strong style="color: #00b0f0;">', '')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong> <strong style="color: #00b0f0;">', ' ')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong><strong style="color: #ee0000;">', '')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong> <strong style="color: #ee0000;">', ' ')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong><strong style="color: #70ad47;">', '')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong> <strong style="color: #70ad47;">', ' ')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong><strong style="color: #7030a0;">', '')
    parsed_html_items[i] = parsed_html_items[i].replace('</strong> <strong style="color: #7030a0;">', ' ')

print(f"Extracted exactly {len(parsed_html_items)} English items.")

translations = [
    "Chuyến đi yêu thích của tôi là chuyến đi đến Đà Nẵng cùng gia đình. Chúng tôi đã đến thăm nhiều địa điểm nổi tiếng và thử đồ ăn địa phương. Đó là một trải nghiệm đáng nhớ.",
    "Chuyến đi yêu thích của tôi là kỳ nghỉ cùng gia đình tại Đà Nẵng vài năm trước. Chúng tôi đã ghé thăm một số địa điểm nổi tiếng, tận hưởng những bãi biển tuyệt đẹp và trải nghiệm văn hóa địa phương. Đó là một chuyến đi khó quên vì tôi có thể thư giãn và dành thời gian chất lượng bên gia đình.",
    "Vâng, tôi có. Tôi thích thử đồ ăn địa phương vì nó thường ngon và độc đáo. Nó cũng cho phép tôi tìm hiểu thêm về văn hóa địa phương.",
    "Vâng, tôi có. Tôi luôn thử đồ ăn địa phương mỗi khi đến thăm một nơi mới. Lý do chính là nó cho phép tôi trải nghiệm văn hóa địa phương. Nó cũng giúp tôi khám phá những hương vị mới và làm cho chuyến đi của tôi trở nên đáng nhớ hơn.",
    "Tôi thích tham quan các điểm du lịch và chụp ảnh. Tôi cũng thích thử đồ ăn địa phương và mua quà lưu niệm.",
    "Các hoạt động yêu thích của tôi là tham quan các điểm thu hút nổi tiếng và thử đồ ăn địa phương. Tôi thích chúng vì chúng cho phép tôi có những trải nghiệm mới. Chúng cũng giúp tôi tạo ra những kỷ niệm khó quên.",
    "Tôi thường tái chế chai nhựa, giấy và lon. Những vật dụng này có thể được tái sử dụng và giúp giảm lượng rác thải.",
    "Tôi thường tái chế chai nhựa, các sản phẩm từ giấy và lon nhôm. Việc tái chế các vật liệu này giúp giảm ô nhiễm môi trường và khuyến khích một lối sống bền vững hơn.",
    "Vâng, nhiều người làm vậy. Họ thường phân loại rác thải có thể tái chế khỏi rác sinh hoạt gia đình. Điều này giúp giữ cho môi trường sạch sẽ hơn.",
    "Vâng, họ có. Nhiều người trong khu vực của tôi tái chế vì họ muốn bảo vệ môi trường. Họ thường phân loại rác thải có thể tái chế khỏi rác sinh hoạt gia đình. Kết quả là, khu vực này đang trở nên sạch sẽ hơn.",
    "Chính phủ có thể tổ chức các chiến dịch môi trường và các chương trình giáo dục. Họ cũng đặt các thùng rác tái chế ở những khu vực công cộng.",
    "Chính phủ nên khuyến khích mọi người tái chế bằng cách tổ chức các chiến dịch tái chế. Việc cung cấp các thùng rác tái chế ở những nơi công cộng cũng rất cần thiết. Những nỗ lực này giúp giảm lượng rác thải và phát triển những thói quen tái chế tốt.",
    "À, nếu tôi phải gợi ý một địa điểm cho bạn tôi học tập, tôi sẽ khuyên chọn một thư viện.\n\nTrước hết, nó là một nơi yên tĩnh vì mọi người đều học tập một cách yên lặng ở đó. Điều này giúp cô ấy tập trung tốt hơn. Vì vậy, cô ấy có thể học tập hiệu quả hơn.\n\nThứ hai, nó là một môi trường học tập tốt vì cô ấy có thể sử dụng nhiều sách và tài liệu học tập. Điều này giúp cô ấy học hỏi những điều mới dễ dàng hơn. Vì vậy, cô ấy có thể cải thiện kiến thức của mình.\n\nTôi không khuyên chọn một phòng ngủ yên tĩnh vì có thể có nhiều sự xao nhãng ở nhà. Đối với một phòng khách, nó kém phù hợp hơn vì nó thường ồn ào khi các thành viên khác trong gia đình ở nhà.\n\nTóm lại, tôi tin rằng một thư viện là lựa chọn tốt nhất cho tình huống này.",
    "À, nếu tôi phải gợi ý một địa điểm cho bạn tôi học tập, tôi sẽ khuyên chọn một thư viện.\n\nTrước hết, nó là một nơi yên tĩnh vì mọi người được mong đợi sẽ giữ im lặng. Bên cạnh đó, có ít sự xao nhãng hơn so với ở nhà. Bằng cách này, cô ấy có thể tập trung tốt hơn và học tập hiệu quả hơn.\n\nThứ hai, nó cung cấp một môi trường học tập tốt. Cô ấy có thể tiếp cận nhiều loại sách và tài liệu học tập bất cứ khi nào cô ấy cần. Kết quả là, cô ấy có thể thu nhận thêm kiến thức và cải thiện thành tích học tập của mình.\n\nTôi không khuyên học trong một phòng khách vì nó có thể ồn ào và gây xao nhãng. Đối với một phòng ngủ yên tĩnh, nó kém phù hợp hơn vì cô ấy có thể cảm thấy buồn ngủ hoặc mất động lực khi học một mình.\n\nTóm lại, tôi tin rằng một thư viện là lựa chọn tốt nhất cho tình huống này.",
    "Có một số lý do tại sao tinh thần trách nhiệm là quan trọng.\n\nMột yếu tố chính là tinh thần trách nhiệm giúp mọi người cải thiện kỹ năng làm việc nhóm. Điều này là do những người có trách nhiệm luôn hoàn thành nhiệm vụ của họ đúng hạn. Kết quả là, các nhóm có thể làm việc hiệu quả hơn.\n\nMột lý do đóng góp khác là tinh thần trách nhiệm giúp mọi người giành được sự tin tưởng từ người khác. Điều này có nghĩa là mọi người tin tưởng những người giữ lời hứa và làm tốt công việc của họ. Do đó, họ có thể xây dựng các mối quan hệ bền chặt hơn.\n\nMột vấn đề cơ bản nữa là tinh thần trách nhiệm giúp mọi người đạt được kết quả tốt hơn. Thực tế, những người có trách nhiệm luôn làm việc chăm chỉ hơn và thực hiện nghĩa vụ của họ một cách nghiêm túc. Điều này giúp họ thành công trong học tập và sự nghiệp.\n\nTóm lại, có một số lý do rõ ràng tại sao tinh thần trách nhiệm là quan trọng, như đã đề cập ở trên.",
    "Có một số lý do tại sao tinh thần trách nhiệm là quan trọng.\n\nMột yếu tố chính là tinh thần trách nhiệm giúp cải thiện kỹ năng làm việc nhóm. Điều này là do những người có trách nhiệm luôn hoàn thành nhiệm vụ của họ đúng thời hạn và hỗ trợ các thành viên khác trong nhóm. Kết quả là, toàn bộ nhóm có thể làm việc hiệu quả hơn.\n\nMột lời giải thích quan trọng khác là tinh thần trách nhiệm giúp mọi người giành được sự tin tưởng từ người khác. Khi mọi người giữ lời hứa và làm tốt nghĩa vụ của họ, người khác có nhiều khả năng tin tưởng họ hơn. Điều này có thể dẫn đến các mối quan hệ cá nhân và nghề nghiệp bền chặt hơn.\n\nMột yếu tố đóng góp khả thi nữa là tinh thần trách nhiệm giúp mọi người đạt được kết quả tốt hơn. Những người có trách nhiệm thường làm việc chăm chỉ hơn và chú ý nhiều hơn đến nhiệm vụ của họ. Do đó, họ có thể đạt được mục tiêu của mình dễ dàng hơn.\n\nTóm lại, có một số lý do rõ ràng tại sao tinh thần trách nhiệm là quan trọng, như đã đề cập ở trên.",
    "Người trẻ tuổi nên học tập nghiêm túc, tôn trọng cha mẹ và giúp đỡ công việc nhà. Những trách nhiệm này giúp họ trở nên trưởng thành hơn.",
    "Người trẻ tuổi nên chịu trách nhiệm cho việc học của họ, tôn trọng các thành viên trong gia đình và đóng góp vào các công việc nhà. Ngoài ra, họ nên học cách quản lý thời gian hiệu quả và đưa ra những quyết định có trách nhiệm.",
    "Tôi nghĩ những người ngày nay có trách nhiệm hơn vì họ có nhiều quyền truy cập vào giáo dục và thông tin hơn. Những điều này giúp họ hiểu rõ hơn về nghĩa vụ của mình.",
    "Tôi nghĩ tinh thần trách nhiệm phụ thuộc vào cá nhân nhiều hơn là vào các thế hệ. Tuy nhiên, những người ngày nay có thể có nhận thức lớn hơn về trách nhiệm của họ vì họ dễ dàng tiếp cận hơn với giáo dục, thông tin và các vấn đề xã hội.",
    "Cha mẹ và nhà trường có thể giao cho trẻ những nhiệm vụ đơn giản và khuyến khích chúng hoàn thành những nhiệm vụ đó một cách độc lập. Họ cũng nên dạy trẻ chấp nhận trách nhiệm cho hành động của mình.",
    "Cha mẹ và nhà trường có thể giúp trẻ trở nên có trách nhiệm hơn bằng cách giao những nhiệm vụ phù hợp với lứa tuổi và khuyến khích chúng tự đưa ra quyết định. Hơn nữa, trẻ em nên được dạy để chấp nhận hậu quả cho hành động của chúng và học hỏi từ những sai lầm của chúng."
]

blue_keywords = [
    "chuyến đi đến Đà Nẵng cùng gia đình", "đến thăm nhiều địa điểm nổi tiếng", "thử đồ ăn địa phương", "một trải nghiệm đáng nhớ",
    "kỳ nghỉ cùng gia đình tại Đà Nẵng vài năm trước", "ghé thăm", "một số", "địa điểm", "nổi tiếng", "tận hưởng những bãi biển tuyệt đẹp", "trải nghiệm văn hóa địa phương", "một chuyến đi khó quên", "thư giãn", "dành thời gian chất lượng bên", "gia đình",
    "thích thử đồ ăn địa phương", "ngon", "độc đáo", "tìm hiểu", "thêm về văn hóa địa phương",
    "luôn thử đồ ăn địa phương", "đến thăm một nơi mới", "trải nghiệm văn hóa địa phương", "khám phá những hương vị mới", "làm cho chuyến đi của tôi trở nên đáng nhớ hơn",
    "tham quan các điểm du lịch", "chụp ảnh", "thử đồ ăn địa phương", "mua quà lưu niệm",
    "tham quan các điểm thu hút nổi tiếng", "thử đồ ăn địa phương", "có những trải nghiệm mới", "tạo ra những", "kỷ niệm", "khó quên",
    "tái chế chai nhựa", "giấy", "lon", "được", "tái sử dụng", "giảm lượng rác thải",
    "tái chế chai nhựa", "các sản phẩm từ giấy", "lon nhôm", "giảm ô nhiễm môi trường", "khuyến khích một", "lối sống", "bền vững hơn",
    "phân loại", "rác thải có thể tái chế khỏi rác sinh hoạt gia đình", "giữ cho môi trường sạch sẽ hơn",
    "bảo vệ", "môi trường", "phân loại rác thải có thể tái chế khỏi rác sinh hoạt gia đình", "trở nên sạch sẽ hơn",
    "tổ chức các chiến dịch môi trường và các chương trình giáo dục", "đặt các thùng rác tái chế ở những khu vực công cộng",
    "giảm lượng rác thải", "phát triển những", "thói quen", "tái chế tốt",
    "nó là một nơi yên tĩnh", "học tập một cách yên lặng", "tập trung tốt hơn", "học tập hiệu quả hơn",
    "nó là một môi trường học tập tốt", "sử dụng nhiều sách và tài liệu", "học tập", "học hỏi những điều mới", "cải thiện", "kiến thức", "của cô ấy",
    "giữ im lặng", "ít sự xao nhãng hơn", "tập trung tốt hơn", "học tập", "hiệu quả hơn",
    "cung cấp một môi trường học tập tốt", "tiếp cận nhiều loại sách", "và tài liệu học tập", "thu nhận thêm", "kiến thức", "cải thiện thành tích học tập của mình",
    "tinh thần trách nhiệm giúp mọi người cải thiện kỹ năng làm việc nhóm", "những người có trách nhiệm", "hoàn thành nhiệm vụ của họ đúng hạn", "làm việc hiệu quả hơn",
    "tinh thần trách nhiệm giúp mọi người giành được sự tin tưởng từ người khác", "giữ lời hứa", "làm tốt công việc của họ", "xây dựng các mối quan hệ bền chặt hơn",
    "tinh thần trách nhiệm giúp mọi người đạt được kết quả tốt hơn", "những người có trách nhiệm", "làm việc chăm chỉ hơn", "thực hiện nghĩa vụ của họ một cách nghiêm túc", "thành công trong học tập và sự nghiệp",
    "tinh thần trách nhiệm giúp cải thiện kỹ năng làm việc nhóm", "những người có trách nhiệm", "hoàn thành nhiệm vụ của họ đúng", "thời hạn", "hỗ trợ các", "thành viên", "khác trong nhóm", "làm việc hiệu quả hơn",
    "tinh thần trách nhiệm giúp mọi người giành được sự tin tưởng từ", "người khác", "giữ lời hứa", "làm tốt nghĩa vụ của họ", "tin tưởng họ", "dẫn đến các mối quan hệ cá nhân và nghề nghiệp bền chặt hơn",
    "tinh thần trách nhiệm giúp mọi người đạt được kết quả tốt hơn", "làm việc chăm chỉ hơn", "chú ý nhiều hơn đến nhiệm vụ của họ", "đạt được mục tiêu của mình", "dễ dàng hơn",
    "học tập nghiêm túc", "tôn trọng cha mẹ", "giúp đỡ công việc", "nhà", "trở nên trưởng thành hơn",
    "chịu trách nhiệm cho việc học của họ", "tôn trọng các thành viên trong gia đình", "đóng góp vào các công việc nhà", "học cách quản lý thời gian", "hiệu quả", "đưa ra những quyết định có trách nhiệm",
    "có trách nhiệm hơn", "có nhiều quyền truy cập vào giáo dục", "và thông tin", "hiểu rõ hơn về nghĩa vụ của mình",
    "phụ thuộc vào cá nhân nhiều hơn là vào các thế hệ", "có nhận thức lớn hơn về trách nhiệm của họ", "có", "quyền truy cập dễ dàng hơn vào giáo dục", "thông tin", "các vấn đề xã hội",
    "giao cho trẻ những nhiệm vụ đơn giản", "khuyến khích chúng hoàn thành", "những nhiệm vụ đó một cách độc lập", "dạy trẻ chấp nhận trách nhiệm cho", "hành động của mình",
    "trở nên có trách nhiệm hơn bằng cách giao những nhiệm vụ phù hợp với lứa tuổi", "khuyến khích chúng tự đưa ra quyết định", "chấp nhận hậu quả cho hành động của chúng", "học hỏi từ", "những sai lầm của chúng"
]

red_keywords = [
    "gợi ý một địa điểm cho bạn tôi học tập", "khuyên chọn một thư viện", "một thư viện",
    "tại sao tinh thần trách nhiệm là quan trọng"
]

green_keywords = [
    "một phòng ngủ yên tĩnh", "có thể có nhiều sự xao nhãng", "ở", "nhà",
    "học trong một phòng khách", "nó có thể ồn ào và gây xao nhãng",
    "lý do", "rõ ràng"
]

purple_keywords = [
    "một phòng khách", "nó thường ồn ào khi các thành viên khác trong gia đình", "ở nhà",
    "một phòng ngủ yên tĩnh", "cô ấy có thể cảm thấy buồn ngủ hoặc mất", "động lực khi học một mình"
]

blue_keywords.sort(key=len, reverse=True)
red_keywords.sort(key=len, reverse=True)
green_keywords.sort(key=len, reverse=True)
purple_keywords.sort(key=len, reverse=True)

with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

level_contents = soup.find_all('div', class_='level-content')

for i, lc in enumerate(level_contents):
    if i >= len(parsed_html_items):
        break
        
    # Clear content carefully keeping structure
    translation_toggle = lc.find('div', class_='translation-toggle')
    tts_btn = lc.find('button', class_='tts-btn')
    
    lc.clear()
    
    # 1. ADD ENGLISH
    if '<br/>' in parsed_html_items[i]:
        lc['style'] = "white-space: pre-line;"
    else:
        if 'style' in lc.attrs:
            del lc['style']
            
    parsed_eng = BeautifulSoup(parsed_html_items[i], 'html.parser')
    lc.append(parsed_eng)
    
    # 2. Add TTS BUTTON
    if tts_btn:
        lc.append(tts_btn)
        
    # 3. Add TRANSLATION TOGGLE
    if translation_toggle:
        lc.append(translation_toggle)
        
    # 4. Create TRANSLATION TEXT
    trans_content = translations[i]
    all_kws = [(kw, '#ee0000') for kw in red_keywords] + \
              [(kw, '#70ad47') for kw in green_keywords] + \
              [(kw, '#7030a0') for kw in purple_keywords] + \
              [(kw, '#00b0f0') for kw in blue_keywords]
              
    all_kws.sort(key=lambda x: len(x[0]), reverse=True)
    
    placeholders = {}
    counter = 0
    
    for kw, color in all_kws:
        if kw in trans_content:
            placeholder = f"__TAG_{counter}__"
            placeholders[placeholder] = f'<strong style="color: {color};">{kw}</strong>'
            trans_content = trans_content.replace(kw, placeholder)
            counter += 1
            
    for placeholder, tag in placeholders.items():
        trans_content = trans_content.replace(placeholder, tag)
        
    trans_div = soup.new_tag('div', attrs={'class': 'translation-text', 'style': 'display: none; white-space: pre-line;'})
    trans_div.append(BeautifulSoup(trans_content, 'html.parser'))
    lc.append(trans_div)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(str(soup).replace('\\"', '"'))

print("Updated perfectly with English and Vietnamese aligned!")
