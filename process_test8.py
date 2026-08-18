import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 8/test08-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Colorize the English strong tags.
html = html.replace('<strong>', '<strong style="color: #00b0f0;">')

# Part 3 Situation
html = html.replace('<strong style="color: #00b0f0;">a handbag</strong>', '<strong style="color: #ee0000;">a handbag</strong>')
html = html.replace('<strong style="color: #00b0f0;">a pair of shoes</strong>', '<strong style="color: #70ad47;">a pair of shoes</strong>')
html = html.replace('<strong style="color: #00b0f0;">a pair of glasses</strong>', '<strong style="color: #7030a0;">a pair of glasses</strong>')
html = html.replace('<strong style="color: #00b0f0;">difficult to know the correct size</strong>', '<strong style="color: #70ad47;">difficult to know the correct size</strong>')
html = html.replace('<strong style="color: #00b0f0;">quite challenging</strong>', '<strong style="color: #70ad47;">quite challenging</strong>')
html = html.replace('<strong style="color: #00b0f0;">personal preferences and eyesight requirements</strong>', '<strong style="color: #7030a0;">personal preferences and eyesight requirements</strong>')
html = html.replace('<strong style="color: #00b0f0;">highly personal</strong>', '<strong style="color: #7030a0;">highly personal</strong>')

# Part 3 Topic
html = html.replace('<strong style="color: #00b0f0;">benefits of living in a dormitory</strong>', '<strong style="color: #ee0000;">benefits of living in a dormitory</strong>')

# LƯU Ý
html = html.replace('<strong style="color: #00b0f0;">LƯU Ý:</strong>', '<strong>LƯU Ý:</strong>')
html = html.replace('<strong style="color: #00b0f0;">your favorite color</strong>', '<strong>your favorite color</strong>')
html = html.replace('<strong style="color: #00b0f0;">library</strong>', '<strong>library</strong>')

# 2. Add highlights to Vietnamese translations
viet_replacements = {
    # Part 1
    "màu trắng": '<strong style="color: #00b0f0;">màu trắng</strong>',
    "sạch sẽ và sáng sủa": '<strong style="color: #00b0f0;">sạch sẽ và sáng sủa</strong>',
    "thoải mái hơn": '<strong style="color: #00b0f0;">thoải mái hơn</strong>',
    "màu trắng hoặc màu be nhạt": '<strong style="color: #00b0f0;">màu trắng hoặc màu be nhạt</strong>',
    "yên bình và chào đón": '<strong style="color: #00b0f0;">yên bình và chào đón</strong>',
    "rộng rãi hơn": '<strong style="color: #00b0f0;">rộng rãi hơn</strong>',
    
    "màu đen và xanh dương": '<strong style="color: #00b0f0;">màu đen và xanh dương</strong>',
    "dễ phối đồ": '<strong style="color: #00b0f0;">dễ phối đồ</strong>',
    "màu trung tính": '<strong style="color: #00b0f0;">màu trung tính</strong>',
    "thanh lịch": '<strong style="color: #00b0f0;">thanh lịch</strong>',
    "dễ dàng phối": '<strong style="color: #00b0f0;">dễ dàng phối</strong>',
    
    "thư giãn": '<strong style="color: #00b0f0;">thư giãn</strong>',
    "tràn đầy năng lượng": '<strong style="color: #00b0f0;">tràn đầy năng lượng</strong>',
    "ảnh hưởng lớn đến cảm xúc của con người": '<strong style="color: #00b0f0;">ảnh hưởng lớn đến cảm xúc của con người</strong>',
    "tông màu dịu thường tạo cảm giác yên bình": '<strong style="color: #00b0f0;">tông màu dịu thường tạo cảm giác yên bình</strong>',
    "màu sáng có thể tăng cường năng lượng và sự hứng khởi": '<strong style="color: #00b0f0;">màu sáng có thể tăng cường năng lượng và sự hứng khởi</strong>',

    # Part 2
    "nơi yên tĩnh để học": '<strong style="color: #00b0f0;">nơi yên tĩnh để học</strong>',
    "tập trung tốt hơn": '<strong style="color: #00b0f0;">tập trung tốt hơn</strong>',
    "môi trường yên tĩnh và làm việc hiệu quả": '<strong style="color: #00b0f0;">môi trường yên tĩnh và làm việc hiệu quả</strong>',
    "tập trung mà không bị phân tâm": '<strong style="color: #00b0f0;">tập trung mà không bị phân tâm</strong>',
    
    "đọc sách và làm bài tập về nhà": '<strong style="color: #00b0f0;">đọc sách và làm bài tập về nhà</strong>',
    "tìm kiếm thông tin": '<strong style="color: #00b0f0;">tìm kiếm thông tin</strong>',
    "làm bài tập": '<strong style="color: #00b0f0;">làm bài tập</strong>',
    "thuận lợi cho việc học tập": '<strong style="color: #00b0f0;">thuận lợi cho việc học tập</strong>',
    
    "thư giãn và thoải mái": '<strong style="color: #00b0f0;">thư giãn và thoải mái</strong>',
    "môi trường yên tĩnh": '<strong style="color: #00b0f0;">môi trường yên tĩnh</strong>',
    "điềm tĩnh và tập trung": '<strong style="color: #00b0f0;">điềm tĩnh và tập trung</strong>',
    "bầu không khí yên bình": '<strong style="color: #00b0f0;">bầu không khí yên bình</strong>',
    "làm việc hiệu quả hơn": '<strong style="color: #00b0f0;">làm việc hiệu quả hơn</strong>',

    # Part 3 Followups
    "thiếu sự riêng tư": '<strong style="color: #00b0f0;">thiếu sự riêng tư</strong>',
    "ồn ào": '<strong style="color: #00b0f0;">ồn ào</strong>',
    "tiếng ồn và sự khác biệt trong lối sống": '<strong style="color: #00b0f0;">tiếng ồn và sự khác biệt trong lối sống</strong>',
    
    "nhu cầu và sở thích khác nhau": '<strong style="color: #00b0f0;">nhu cầu và sở thích khác nhau</strong>',
    "thích sự riêng tư lớn hơn": '<strong style="color: #00b0f0;">thích sự riêng tư lớn hơn</strong>',
    "môi trường sống khác": '<strong style="color: #00b0f0;">môi trường sống khác</strong>',
    
    "giao tiếp cởi mở": '<strong style="color: #00b0f0;">giao tiếp cởi mở</strong>',
    "tôn trọng ý kiến của nhau": '<strong style="color: #00b0f0;">tôn trọng ý kiến của nhau</strong>',
    "giao tiếp trung thực và tôn trọng lẫn nhau": '<strong style="color: #00b0f0;">giao tiếp trung thực và tôn trọng lẫn nhau</strong>',
    "thiết lập các quy tắc rõ ràng và thảo luận sớm các vấn đề": '<strong style="color: #00b0f0;">thiết lập các quy tắc rõ ràng và thảo luận sớm các vấn đề</strong>',

    # Part 3 Situation
    "túi xách": '<strong style="color: #ee0000;">túi xách</strong>',
    "sử dụng hàng ngày": '<strong style="color: #00b0f0;">sử dụng hàng ngày</strong>',
    "rất hữu ích": '<strong style="color: #00b0f0;">rất hữu ích</strong>',
    "thể hiện sự chu đáo và trân trọng": '<strong style="color: #00b0f0;">thể hiện sự chu đáo và trân trọng</strong>',
    "phong cách và dịp khác nhau": '<strong style="color: #00b0f0;">phong cách và dịp khác nhau</strong>',
    "mang theo sách, giáo án và đồ dùng cá nhân": '<strong style="color: #00b0f0;">mang theo sách, giáo án và đồ dùng cá nhân</strong>',
    "hỗ trợ công việc": '<strong style="color: #00b0f0;">hỗ trợ công việc</strong>',
    "ý nghĩa vừa linh hoạt": '<strong style="color: #00b0f0;">ý nghĩa vừa linh hoạt</strong>',
    "sử dụng thường xuyên": '<strong style="color: #00b0f0;">sử dụng thường xuyên</strong>',
    
    "đôi giày": '<strong style="color: #70ad47;">đôi giày</strong>',
    "khó biết được kích cỡ chính xác": '<strong style="color: #70ad47;">khó biết được kích cỡ chính xác</strong>',
    "khá khó khăn": '<strong style="color: #70ad47;">khá khó khăn</strong>',
    
    "chiếc kính": '<strong style="color: #7030a0;">chiếc kính</strong>',
    "cặp kính": '<strong style="color: #7030a0;">cặp kính</strong>',
    "kính mắt": '<strong style="color: #7030a0;">kính mắt</strong>',
    "sở thích cá nhân và yêu cầu về thị lực": '<strong style="color: #7030a0;">sở thích cá nhân và yêu cầu về thị lực</strong>',
    "mang tính cá nhân cao": '<strong style="color: #7030a0;">mang tính cá nhân cao</strong>',
    
    # Part 3 Topic
    "cải thiện các kỹ năng sống": '<strong style="color: #00b0f0;">cải thiện các kỹ năng sống</strong>',
    "độc lập hơn": '<strong style="color: #00b0f0;">độc lập hơn</strong>',
    "gần lớp học": '<strong style="color: #00b0f0;">gần lớp học</strong>',
    "tiết kiệm cả thời gian và năng lượng": '<strong style="color: #00b0f0;">tiết kiệm cả thời gian và năng lượng</strong>',
    "kết bạn mới": '<strong style="color: #00b0f0;">kết bạn mới</strong>',
    "mở rộng mạng lưới xã hội": '<strong style="color: #00b0f0;">mở rộng mạng lưới xã hội</strong>',
    "giá phải chăng hơn so với thuê căn hộ": '<strong style="color: #00b0f0;">giá phải chăng hơn so với thuê căn hộ</strong>',
    "giảm bớt gánh nặng tài chính": '<strong style="color: #00b0f0;">giảm bớt gánh nặng tài chính</strong>',
    
    "cải thiện các kỹ năng sống quan trọng": '<strong style="color: #00b0f0;">cải thiện các kỹ năng sống quan trọng</strong>',
    "độc lập và có trách nhiệm hơn": '<strong style="color: #00b0f0;">độc lập và có trách nhiệm hơn</strong>',
    "chuẩn bị tốt hơn cho cuộc sống trưởng thành": '<strong style="color: #00b0f0;">chuẩn bị tốt hơn cho cuộc sống trưởng thành</strong>',
    "gần lớp học và các cơ sở vật chất của trường": '<strong style="color: #00b0f0;">gần lớp học và các cơ sở vật chất của trường</strong>',
    "tập trung nhiều hơn vào việc học": '<strong style="color: #00b0f0;">tập trung nhiều hơn vào việc học</strong>',
    "giá cả phải chăng hơn thuê chỗ ở tư nhân": '<strong style="color: #00b0f0;">giá cả phải chăng hơn thuê chỗ ở tư nhân</strong>'
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

print("Test 8 processed successfully.")
