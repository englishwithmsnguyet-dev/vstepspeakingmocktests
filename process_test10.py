import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 10/test10-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Colorize the English strong tags.
html = html.replace('<strong>', '<strong style="color: #00b0f0;">')

# Part 3 Situation
html = html.replace('<strong style="color: #00b0f0;">a picture of him with colleagues</strong>', '<strong style="color: #ee0000;">a picture of him with colleagues</strong>')
html = html.replace('<strong style="color: #00b0f0;">a handwritten card</strong>', '<strong style="color: #70ad47;">a handwritten card</strong>')
html = html.replace('<strong style="color: #00b0f0;">a meal at the best restaurant in your city</strong>', '<strong style="color: #7030a0;">a meal at the best restaurant in your city</strong>')
html = html.replace('<strong style="color: #00b0f0;">a meal at the best restaurant</strong>', '<strong style="color: #7030a0;">a meal at the best restaurant</strong>')
html = html.replace('<strong style="color: #00b0f0;">temporary</strong>', '<strong style="color: #7030a0;">temporary</strong>')

# Part 3 Topic
html = html.replace('<strong style="color: #00b0f0;">solutions to reduce obesity</strong>', '<strong style="color: #ee0000;">solutions to reduce obesity</strong>')

# LƯU Ý
html = html.replace('<strong style="color: #00b0f0;">LƯU Ý:</strong>', '<strong>LƯU Ý:</strong>')
html = html.replace('<strong style="color: #00b0f0;">online blogs</strong>', '<strong>online blogs</strong>')
html = html.replace('<strong style="color: #00b0f0;">online learning</strong>', '<strong>online learning</strong>')

# 2. Add highlights to Vietnamese translations
viet_replacements = {
    # Part 1
    "các blog trực tuyến": '<strong style="color: #00b0f0;">các blog trực tuyến</strong>',
    "blog trực tuyến": '<strong style="color: #00b0f0;">blog trực tuyến</strong>',
    "phương thức tiện lợi": '<strong style="color: #00b0f0;">phương thức tiện lợi</strong>',
    "tìm hiểu thông tin mới": '<strong style="color: #00b0f0;">tìm hiểu thông tin mới</strong>',
    "thời gian rảnh rỗi": '<strong style="color: #00b0f0;">thời gian rảnh rỗi</strong>',
    "thông tin hữu ích": '<strong style="color: #00b0f0;">thông tin hữu ích</strong>',
    "nhiều chủ đề khác nhau": '<strong style="color: #00b0f0;">nhiều chủ đề khác nhau</strong>',
    "kinh nghiệm": '<strong style="color: #00b0f0;">kinh nghiệm</strong>',
    
    "giáo dục, du lịch và sức khỏe": '<strong style="color: #00b0f0;">giáo dục, du lịch và sức khỏe</strong>',
    "phát triển bản thân": '<strong style="color: #00b0f0;">phát triển bản thân</strong>',
    "mở rộng tầm mắt": '<strong style="color: #00b0f0;">mở rộng tầm mắt</strong>',
    "kiến thức thực tế": '<strong style="color: #00b0f0;">kiến thức thực tế</strong>',
    
    "thông tin mới": '<strong style="color: #00b0f0;">thông tin mới</strong>',
    "mẹo hữu ích": '<strong style="color: #00b0f0;">mẹo hữu ích</strong>',
    "giải quyết các vấn đề hàng ngày": '<strong style="color: #00b0f0;">giải quyết các vấn đề hàng ngày</strong>',
    "nhiều điều bổ ích": '<strong style="color: #00b0f0;">nhiều điều bổ ích</strong>',
    "chiến lược học tập": '<strong style="color: #00b0f0;">chiến lược học tập</strong>',
    "trải nghiệm du lịch": '<strong style="color: #00b0f0;">trải nghiệm du lịch</strong>',
    "kỹ năng hoàn thiện bản thân": '<strong style="color: #00b0f0;">kỹ năng hoàn thiện bản thân</strong>',
    "mở rộng kiến thức": '<strong style="color: #00b0f0;">mở rộng kiến thức</strong>',
    "cái nhìn rộng lớn hơn": '<strong style="color: #00b0f0;">cái nhìn rộng lớn hơn</strong>',

    # Part 2
    "khóa học trực tuyến": '<strong style="color: #00b0f0;">khóa học trực tuyến</strong>',
    "cải thiện kỹ năng tiếng Anh của mình": '<strong style="color: #00b0f0;">cải thiện kỹ năng tiếng Anh của mình</strong>',
    "việc học ngôn ngữ": '<strong style="color: #00b0f0;">việc học ngôn ngữ</strong>',
    "phát triển nghề nghiệp": '<strong style="color: #00b0f0;">phát triển nghề nghiệp</strong>',
    "học theo tốc độ của riêng mình": '<strong style="color: #00b0f0;">học theo tốc độ của riêng mình</strong>',
    "tiếp cận tài liệu": '<strong style="color: #00b0f0;">tiếp cận tài liệu</strong>',
    
    "tiện lợi và linh hoạt": '<strong style="color: #00b0f0;">tiện lợi và linh hoạt</strong>',
    "thời gian rảnh": '<strong style="color: #00b0f0;">thời gian rảnh</strong>',
    "sự linh hoạt": '<strong style="color: #00b0f0;">sự linh hoạt</strong>',
    "tự sắp xếp lịch học": '<strong style="color: #00b0f0;">tự sắp xếp lịch học</strong>',
    "nguồn chất lượng cao": '<strong style="color: #00b0f0;">nguồn chất lượng cao</strong>',
    "tiết kiệm cả thời gian và công sức": '<strong style="color: #00b0f0;">tiết kiệm cả thời gian và công sức</strong>',
    
    "dễ bị phân tâm": '<strong style="color: #00b0f0;">dễ bị phân tâm</strong>',
    "thiếu sự tương tác trực tiếp": '<strong style="color: #00b0f0;">thiếu sự tương tác trực tiếp</strong>',
    "tập trung": '<strong style="color: #00b0f0;">tập trung</strong>',
    "nhiều phiền nhiễu ở nhà": '<strong style="color: #00b0f0;">nhiều phiền nhiễu ở nhà</strong>',
    "giao tiếp và cộng tác": '<strong style="color: #00b0f0;">giao tiếp và cộng tác</strong>',
    "thách thức hơn": '<strong style="color: #00b0f0;">thách thức hơn</strong>',

    # Part 3 Followups
    "Hăm-bơ-gơ, gà rán, pizza và trà sữa": '<strong style="color: #00b0f0;">Hăm-bơ-gơ, gà rán, pizza và trà sữa</strong>',
    "giới trẻ": '<strong style="color: #00b0f0;">giới trẻ</strong>',
    "Thức ăn nhanh": '<strong style="color: #00b0f0;">Thức ăn nhanh</strong>',
    "thức ăn nhanh": '<strong style="color: #00b0f0;">thức ăn nhanh</strong>',
    "thực phẩm tiện lợi": '<strong style="color: #00b0f0;">thực phẩm tiện lợi</strong>',
    "tiện lợi, giá cả phải chăng và có sẵn ở nhiều nơi": '<strong style="color: #00b0f0;">tiện lợi, giá cả phải chăng và có sẵn ở nhiều nơi</strong>',
    
    "tiết kiệm thời gian": '<strong style="color: #00b0f0;">tiết kiệm thời gian</strong>',
    "nhanh chóng, tiện lợi": '<strong style="color: #00b0f0;">nhanh chóng, tiện lợi</strong>',
    "xã hội bận rộn": '<strong style="color: #00b0f0;">xã hội bận rộn</strong>',
    
    "chiến dịch sức khỏe": '<strong style="color: #00b0f0;">chiến dịch sức khỏe</strong>',
    "tập thể dục thường xuyên": '<strong style="color: #00b0f0;">tập thể dục thường xuyên</strong>',
    "thói quen ăn uống lành mạnh": '<strong style="color: #00b0f0;">thói quen ăn uống lành mạnh</strong>',
    "thói quen ăn uống lành mạnh hơn": '<strong style="color: #00b0f0;">thói quen ăn uống lành mạnh hơn</strong>',
    "chiến dịch nâng cao nhận thức cộng đồng": '<strong style="color: #00b0f0;">chiến dịch nâng cao nhận thức cộng đồng</strong>',
    "chương trình giáo dục dinh dưỡng": '<strong style="color: #00b0f0;">chương trình giáo dục dinh dưỡng</strong>',
    "đầu tư vào cơ sở vật chất thể thao": '<strong style="color: #00b0f0;">đầu tư vào cơ sở vật chất thể thao</strong>',
    "thực phẩm bổ dưỡng": '<strong style="color: #00b0f0;">thực phẩm bổ dưỡng</strong>',
    "sáng kiến sức khỏe cộng đồng": '<strong style="color: #00b0f0;">sáng kiến sức khỏe cộng đồng</strong>',

    # Part 3 Situation
    "đồng nghiệp sắp nghỉ hưu": '<strong style="color: #00b0f0;">đồng nghiệp sắp nghỉ hưu</strong>',
    
    "bức ảnh của ông ấy cùng với các đồng nghiệp": '<strong style="color: #ee0000;">bức ảnh của ông ấy cùng với các đồng nghiệp</strong>',
    "bức ảnh của ông ấy cùng các đồng nghiệp": '<strong style="color: #ee0000;">bức ảnh của ông ấy cùng các đồng nghiệp</strong>',
    "bức ảnh chụp ông ấy cùng các đồng nghiệp": '<strong style="color: #ee0000;">bức ảnh chụp ông ấy cùng các đồng nghiệp</strong>',
    "thiệp viết tay": '<strong style="color: #70ad47;">thiệp viết tay</strong>',
    "tấm thiệp viết tay": '<strong style="color: #70ad47;">tấm thiệp viết tay</strong>',
    "bữa ăn tại nhà hàng": '<strong style="color: #7030a0;">bữa ăn tại nhà hàng</strong>',
    "bữa ăn tại nhà hàng tốt nhất": '<strong style="color: #7030a0;">bữa ăn tại nhà hàng tốt nhất</strong>',
    
    "món quà ý nghĩa": '<strong style="color: #00b0f0;">món quà ý nghĩa</strong>',
    "gợi nhớ cho ông ấy về khoảng thời gian": '<strong style="color: #00b0f0;">gợi nhớ cho ông ấy về khoảng thời gian</strong>',
    "những khoảnh khắc vui vẻ": '<strong style="color: #00b0f0;">những khoảnh khắc vui vẻ</strong>',
    "món quà độc đáo": '<strong style="color: #00b0f0;">món quà độc đáo</strong>',
    "lưu giữ những kỷ niệm quý giá": '<strong style="color: #00b0f0;">lưu giữ những kỷ niệm quý giá</strong>',
    "giá trị cảm xúc lâu dài": '<strong style="color: #00b0f0;">giá trị cảm xúc lâu dài</strong>',
    "lưu giữ lại các mối quan hệ": '<strong style="color: #00b0f0;">lưu giữ lại các mối quan hệ</strong>',
    "vật kỷ niệm vô giá": '<strong style="color: #00b0f0;">vật kỷ niệm vô giá</strong>',
    "vật kỷ niệm lâu dài": '<strong style="color: #00b0f0;">vật kỷ niệm lâu dài</strong>',
    "sự trân trọng và kính trọng": '<strong style="color: #00b0f0;">sự trân trọng và kính trọng</strong>',
    
    "mang tính tạm thời": '<strong style="color: #7030a0;">mang tính tạm thời</strong>',
    "tạm thời": '<strong style="color: #7030a0;">tạm thời</strong>',
    
    # Part 3 Topic
    "giải pháp để giảm thiểu bệnh béo phì": '<strong style="color: #ee0000;">giải pháp để giảm thiểu bệnh béo phì</strong>',
    "giải pháp để giảm bệnh béo phì": '<strong style="color: #ee0000;">giải pháp để giảm bệnh béo phì</strong>',
    
    "hạn chế tiêu thụ thức ăn nhanh": '<strong style="color: #00b0f0;">hạn chế tiêu thụ thức ăn nhanh</strong>',
    "hạn chế ăn thức ăn nhanh": '<strong style="color: #00b0f0;">hạn chế ăn thức ăn nhanh</strong>',
    "chất béo, đường và calo": '<strong style="color: #00b0f0;">chất béo, đường và calo</strong>',
    "duy trì cân nặng khỏe mạnh": '<strong style="color: #00b0f0;">duy trì cân nặng khỏe mạnh</strong>',
    
    "nấu ăn ở nhà": '<strong style="color: #00b0f0;">nấu ăn ở nhà</strong>',
    "Bữa ăn nấu ở nhà": '<strong style="color: #00b0f0;">Bữa ăn nấu ở nhà</strong>',
    "Các bữa ăn tự nấu": '<strong style="color: #00b0f0;">Các bữa ăn tự nấu</strong>',
    "nguyên liệu tươi ngon": '<strong style="color: #00b0f0;">nguyên liệu tươi ngon</strong>',
    "nguyên liệu tươi": '<strong style="color: #00b0f0;">nguyên liệu tươi</strong>',
    "kiểm soát khẩu phần ăn": '<strong style="color: #00b0f0;">kiểm soát khẩu phần ăn</strong>',
    
    "chế độ ăn uống cân bằng": '<strong style="color: #00b0f0;">chế độ ăn uống cân bằng</strong>',
    "rau, trái cây và protein": '<strong style="color: #00b0f0;">rau, trái cây và protein</strong>',
    "ngăn ngừa tăng cân": '<strong style="color: #00b0f0;">ngăn ngừa tăng cân</strong>',
    
    "tập thể dục thường xuyên": '<strong style="color: #00b0f0;">tập thể dục thường xuyên</strong>',
    "Các hoạt động thể chất": '<strong style="color: #00b0f0;">Các hoạt động thể chất</strong>',
    "đốt cháy calo": '<strong style="color: #00b0f0;">đốt cháy calo</strong>',
    "cải thiện thể lực": '<strong style="color: #00b0f0;">cải thiện thể lực</strong>',
    "duy trì lối sống khỏe mạnh": '<strong style="color: #00b0f0;">duy trì lối sống khỏe mạnh</strong>',
    "duy trì một lối sống lành mạnh": '<strong style="color: #00b0f0;">duy trì một lối sống lành mạnh</strong>',
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

print("Test 10 processed successfully.")
