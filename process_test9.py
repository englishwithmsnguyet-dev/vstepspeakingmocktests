import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 9/test09-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Colorize the English strong tags.
html = html.replace('<strong>', '<strong style="color: #00b0f0;">')

# Part 3 Situation
html = html.replace('<strong style="color: #00b0f0;">guest speaker</strong>', '<strong style="color: #00b0f0;">guest speaker</strong>') # just keep blue
html = html.replace('<strong style="color: #00b0f0;">workshop</strong>', '<strong style="color: #00b0f0;">workshop</strong>')
html = html.replace('<strong style="color: #00b0f0;">healthy living</strong>', '<strong style="color: #00b0f0;">healthy living</strong>') # Except in the question? The question is not bolded, it just has strong tags around the choices.

html = html.replace('<strong style="color: #00b0f0;">a nutritionist</strong>', '<strong style="color: #ee0000;">a nutritionist</strong>')
html = html.replace('<strong style="color: #00b0f0;">a gym trainer</strong>', '<strong style="color: #70ad47;">a gym trainer</strong>')
html = html.replace('<strong style="color: #00b0f0;">a yoga instructor</strong>', '<strong style="color: #7030a0;">a yoga instructor</strong>')
html = html.replace('<strong style="color: #00b0f0;">physical exercise</strong>', '<strong style="color: #70ad47;">physical exercise</strong>')

# Part 3 Topic
html = html.replace('<strong style="color: #00b0f0;">drawbacks of internships</strong>', '<strong style="color: #ee0000;">drawbacks of internships</strong>')

# LƯU Ý
html = html.replace('<strong style="color: #00b0f0;">LƯU Ý:</strong>', '<strong>LƯU Ý:</strong>')
html = html.replace('<strong style="color: #00b0f0;">feeling sad</strong>', '<strong>feeling sad</strong>')
html = html.replace('<strong style="color: #00b0f0;">using AI tools</strong>', '<strong>using AI tools</strong>')

# 2. Add highlights to Vietnamese translations
viet_replacements = {
    # Part 1
    "nghe nhạc": '<strong style="color: #00b0f0;">nghe nhạc</strong>',
    "cảm thấy tốt hơn": '<strong style="color: #00b0f0;">cảm thấy tốt hơn</strong>',
    "giải tỏa đầu óc": '<strong style="color: #00b0f0;">giải tỏa đầu óc</strong>',

    # Part 2
    "công cụ AI": '<strong style="color: #00b0f0;">công cụ AI</strong>',
    "các công cụ AI": '<strong style="color: #00b0f0;">các công cụ AI</strong>',
    "phản hồi tức thì": '<strong style="color: #00b0f0;">phản hồi tức thì</strong>',
    "học tập cá nhân hóa": '<strong style="color: #00b0f0;">học tập cá nhân hóa</strong>',
    "hỗ trợ học tập": '<strong style="color: #00b0f0;">hỗ trợ học tập</strong>',
    "nhu cầu và cảm xúc của học sinh": '<strong style="color: #00b0f0;">nhu cầu và cảm xúc của học sinh</strong>',
    "thay thế hoàn toàn giáo viên con người": '<strong style="color: #00b0f0;">thay thế hoàn toàn giáo viên con người</strong>',

    # Part 3 Followups
    "chuẩn bị cho sự nghiệp tương lai": '<strong style="color: #00b0f0;">chuẩn bị cho sự nghiệp tương lai</strong>',
    "phát triển các kỹ năng hữu ích": '<strong style="color: #00b0f0;">phát triển các kỹ năng hữu ích</strong>',
    "tích lũy kinh nghiệm làm việc": '<strong style="color: #00b0f0;">tích lũy kinh nghiệm làm việc</strong>',
    "hấp dẫn hơn đối với các nhà tuyển dụng": '<strong style="color: #00b0f0;">hấp dẫn hơn đối với các nhà tuyển dụng</strong>',
    "mạng lưới chuyên nghiệp": '<strong style="color: #00b0f0;">mạng lưới chuyên nghiệp</strong>',
    
    "Các trường đại học": '<strong style="color: #00b0f0;">Các trường đại học</strong>',
    "hợp tác với các công ty": '<strong style="color: #00b0f0;">hợp tác với các công ty</strong>',
    "cơ hội thực tập chất lượng cao": '<strong style="color: #00b0f0;">cơ hội thực tập chất lượng cao</strong>',
    "hội thảo chuẩn bị": '<strong style="color: #00b0f0;">hội thảo chuẩn bị</strong>',
    "hội thảo": '<strong style="color: #00b0f0;">hội thảo</strong>',

    # Part 3 Situation
    "diễn giả khách mời": '<strong style="color: #00b0f0;">diễn giả khách mời</strong>',
    "hội thảo": '<strong style="color: #00b0f0;">hội thảo</strong>',
    "lối sống lành mạnh": '<strong style="color: #00b0f0;">lối sống lành mạnh</strong>',
    
    "chuyên gia dinh dưỡng": '<strong style="color: #ee0000;">chuyên gia dinh dưỡng</strong>',
    "huấn luyện viên thể hình": '<strong style="color: #70ad47;">huấn luyện viên thể hình</strong>',
    "giáo viên yoga": '<strong style="color: #7030a0;">giáo viên yoga</strong>',
    "huấn luyện viên yoga": '<strong style="color: #7030a0;">huấn luyện viên yoga</strong>',
    
    "kiến thức hữu ích về thói quen ăn uống lành mạnh": '<strong style="color: #00b0f0;">kiến thức hữu ích về thói quen ăn uống lành mạnh</strong>',
    "chọn thực phẩm bổ dưỡng và duy trì chế độ ăn uống cân bằng": '<strong style="color: #00b0f0;">chọn thực phẩm bổ dưỡng và duy trì chế độ ăn uống cân bằng</strong>',
    "ngăn ngừa các vấn đề sức khỏe thông qua dinh dưỡng hợp lý": '<strong style="color: #00b0f0;">ngăn ngừa các vấn đề sức khỏe thông qua dinh dưỡng hợp lý</strong>',
    "nền tảng quan trọng nhất của một lối sống lành mạnh": '<strong style="color: #00b0f0;">nền tảng quan trọng nhất của một lối sống lành mạnh</strong>',
    "thông tin đáng tin cậy về chế độ ăn uống cân bằng, lựa chọn thực phẩm lành mạnh và thói quen ăn uống hợp lý": '<strong style="color: #00b0f0;">thông tin đáng tin cậy về chế độ ăn uống cân bằng, lựa chọn thực phẩm lành mạnh và thói quen ăn uống hợp lý</strong>',
    "dinh dưỡng ảnh hưởng đến cả sức khỏe thể chất và tinh thần": '<strong style="color: #00b0f0;">dinh dưỡng ảnh hưởng đến cả sức khỏe thể chất và tinh thần</strong>',
    
    "tập thể dục": '<strong style="color: #70ad47;">tập thể dục</strong>',
    "tập thể dục thể thao": '<strong style="color: #70ad47;">tập thể dục thể thao</strong>',
    
    "tập trung chủ yếu vào sự linh hoạt và thư giãn": '<strong style="color: #7030a0;">tập trung chủ yếu vào sự linh hoạt và thư giãn</strong>',
    
    # Part 3 Topic
    "tác động tiêu cực của thực tập": '<strong style="color: #ee0000;">tác động tiêu cực của thực tập</strong>',
    "hạn chế của việc thực tập": '<strong style="color: #ee0000;">hạn chế của việc thực tập</strong>',
    "hạn chế của thực tập": '<strong style="color: #ee0000;">hạn chế của thực tập</strong>',
    
    "thiếu sự hướng dẫn": '<strong style="color: #00b0f0;">thiếu sự hướng dẫn</strong>',
    "hướng dẫn hạn chế": '<strong style="color: #00b0f0;">hướng dẫn hạn chế</strong>',
    "khối lượng công việc và áp lực lớn": '<strong style="color: #00b0f0;">khối lượng công việc và áp lực lớn</strong>',
    "áp lực và khối lượng công việc lớn": '<strong style="color: #00b0f0;">áp lực và khối lượng công việc lớn</strong>',
    "cảm thấy căng thẳng": '<strong style="color: #00b0f0;">cảm thấy căng thẳng</strong>',
    "không được trả lương hoặc trả lương thấp": '<strong style="color: #00b0f0;">không được trả lương hoặc trả lương thấp</strong>'
}


def replace_vietnamese(match):
    prefix = match.group(1)
    text = match.group(2)
    for k, v in viet_replacements.items():
        if k in text and f'>{k}<' not in text and f'"{k}"' not in text:
            text = text.replace(k, v)
    return prefix + text + '</div>'

html = re.sub(r'(<div class="translation-text"[^>]*>)(.*?)(</div>)', replace_vietnamese, html, flags=re.DOTALL)

# Let's fix nested or broken tags if any
html = html.replace('<strong><strong', '<strong')
html = html.replace('</strong></strong>', '</strong>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Test 9 processed successfully.")
