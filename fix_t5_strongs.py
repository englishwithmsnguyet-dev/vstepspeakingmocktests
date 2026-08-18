import re
from bs4 import BeautifulSoup, NavigableString

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 5/test05-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

blue_keywords = [
    "uống trà xanh vài lần một tuần", "hương vị thanh mát", "cảm thấy thư giãn",
    "một trong những đồ uống yêu thích của tôi", "cảm thấy sảng khoái và tập trung suốt cả ngày",
    "một sự thay thế lành mạnh hơn cho nhiều loại đồ uống có đường",
    "uống trà xanh vào buổi sáng hoặc sau bữa trưa",
    "uống trà xanh vào buổi sáng hoặc trong những giờ nghỉ giải lao ngắn khi làm việc",
    "tỉnh táo", "duy trì sự tập trung", "làm việc hiệu quả hơn", "cảm thấy năng suất hơn",
    "một thức uống phổ biến", "uống nó mỗi ngày", "uống nó hàng ngày", "đặc biệt là những người lớn tuổi",
    "vô cùng phổ biến", "phải chăng", "thanh mát", "mang lại nhiều lợi ích cho sức khỏe",
    "trở thành một phần quan trọng của văn hóa Việt Nam",
    "một trung tâm mua sắm đông đúc", "một trải nghiệm rất thú vị", "tận hưởng thời gian rảnh rỗi", "mua nhiều thứ tôi cần",
    "ghé thăm nhiều nơi đông đúc", "trung tâm thương mại", "lễ hội âm nhạc", "các sự kiện công cộng",
    "tràn đầy năng lượng", "thu hút số lượng lớn người tham gia",
    "nhiều người", "rất nhiều hoạt động thú vị", "khám phá các cửa hàng khác nhau",
    "cảm thấy khá phấn khích", "bầu không khí sôi động và tràn đầy năng lượng",
    "cảm thấy ngột ngạt vì tiếng ồn và những đám đông lớn", "không thích ở những nơi này quá lâu",
    "thích những nơi yên tĩnh hơn", "thanh bình và thoải mái hơn", "thư giãn", "tập trung tốt hơn vào những gì tôi đang làm",
    "mang lại một bầu không khí thanh bình", "tập trung vào công việc", "nạp lại năng lượng", "dành nhiều thời gian ở môi trường đông đúc",
    "mang lại một nền giáo dục tốt", "học hỏi từ những giáo viên giàu kinh nghiệm", "sử dụng tài liệu học tập tốt hơn", "cải thiện kiến thức và kỹ năng",
    "có cơ sở vật chất và nguồn tài liệu học tập tốt hơn", "sử dụng thư viện, phòng thí nghiệm hiện đại và tài liệu học tập", "học tập hiệu quả hơn",
    "cung cấp nền giáo dục chất lượng cao", "học hỏi từ những giảng viên giàu kinh nghiệm", "tiếp cận các nguồn tài liệu học tập tốt hơn", "phát triển kiến thức và kỹ năng hiệu quả hơn",
    "có lợi cho sự nghiệp tương lai của em ấy", "thích sinh viên từ các trường đại học danh tiếng", "tìm được một công việc tốt dễ dàng hơn sau khi tốt nghiệp",
    "mức lương", "đáp ứng nhu cầu tài chính", "có chất lượng cuộc sống tốt hơn",
    "vị trí công việc", "tiết kiệm thời gian và chi phí đi lại", "có một thói quen hàng ngày thoải mái hơn",
    "môi trường làm việc", "cảm thấy có động lực và làm việc hiệu quả", "cải thiện sự hài lòng trong công việc của họ",
    "trang trải chi phí sinh hoạt", "cải thiện chất lượng cuộc sống", "cảm thấy có động lực làm việc hơn",
    "làm việc gần nhà", "tiết kiệm thời gian", "giảm chi phí đi lại", "duy trì sự cân bằng công việc - cuộc sống tốt hơn",
    "một nơi làm việc tích cực", "cảm thấy thoải mái và được hỗ trợ", "tận hưởng công việc của mình",
    "kỹ năng giao tiếp", "kỹ năng làm việc nhóm", "làm việc nhóm", "kỹ năng giải quyết vấn đề",
    "có khả năng thích nghi", "sẵn sàng học hỏi những điều mới", "làm việc tốt trong môi trường chuyên nghiệp",
    "công nghệ thông tin", "y học", "tài chính", "đòi hỏi kiến thức và kỹ năng chuyên môn sâu",
    "chăm sóc sức khỏe", "quản lý kinh doanh", "đưa ra mức lương hấp dẫn", "đòi hỏi bằng cấp tốt và chuyên môn sâu rộng",
    "hoàn thành các nhiệm vụ nhanh chóng và hiệu quả hơn", "giúp giao tiếp trong công việc dễ dàng hơn",
    "đã cải thiện đáng kể hiệu quả nơi làm việc", "hoàn thành các nhiệm vụ nhanh hơn", "giao tiếp hiệu quả hơn", "đạt được hiệu suất công việc tốt hơn"
]

red_keywords = [
    "gợi ý một yếu tố cho em gái tôi khi chọn trường đại học",
    "khuyên cân nhắc xếp hạng của trường đại học",
    "xếp hạng của trường đại học",
    "yếu tố",
    "cân nhắc khi nộp đơn xin việc"
]

green_keywords = [
    "chọn một trường đại học dựa trên khoảng cách từ nhà",
    "chất lượng giáo dục quan trọng hơn",
    "chọn một trường đại học chủ yếu dựa trên khoảng cách từ nhà",
    "một trường đại học gần đó có thể không cung cấp môi trường học tập tốt nhất"
]

purple_keywords = [
    "học phí",
    "một trường đại học rẻ hơn có thể không luôn mang lại nền giáo dục tốt nhất",
    "sinh viên thường có thể tìm thấy học bổng hoặc hỗ trợ tài chính"
]

blue_keywords.sort(key=len, reverse=True)
red_keywords.sort(key=len, reverse=True)
green_keywords.sort(key=len, reverse=True)
purple_keywords.sort(key=len, reverse=True)

level_contents = soup.find_all('div', class_='level-content')

for lc in level_contents:
    text_div = lc.find('div', class_='translation-text')
    if text_div:
        # 1. Strip all strong tags to reset
        plain_text = text_div.get_text()
        
        # We need to preserve newlines! get_text() might strip or keep them depending.
        # But we previously used string replacement.
        # Let's get the inner HTML, strip tags, and apply replace.
        raw_html = "".join([str(c) for c in text_div.contents])
        raw_html = re.sub(r'<strong[^>]*>', '', raw_html)
        raw_html = raw_html.replace('</strong>', '')
        
        # Now apply the tags from longest to shortest
        # We must protect already replaced parts.
        all_kws = [(kw, '#ee0000') for kw in red_keywords] + \
                  [(kw, '#70ad47') for kw in green_keywords] + \
                  [(kw, '#7030a0') for kw in purple_keywords] + \
                  [(kw, '#00b0f0') for kw in blue_keywords]
                  
        all_kws.sort(key=lambda x: len(x[0]), reverse=True)
        
        # To avoid nested tags, we can use a temporary placeholder
        placeholders = {}
        counter = 0
        
        for kw, color in all_kws:
            if kw in raw_html:
                placeholder = f"__TAG_{counter}__"
                placeholders[placeholder] = f'<strong style="color: {color};">{kw}</strong>'
                raw_html = raw_html.replace(kw, placeholder)
                counter += 1
                
        # Restore placeholders
        for placeholder, tag in placeholders.items():
            raw_html = raw_html.replace(placeholder, tag)
            
        text_div.clear()
        text_div['style'] = "display: none; white-space: pre-line;"
        text_div.append(BeautifulSoup(raw_html, 'html.parser'))

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(str(soup))
