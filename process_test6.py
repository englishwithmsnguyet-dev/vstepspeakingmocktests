import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 6/test06-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Colorize the English strong tags.
# In Part 1, 2, 3 followups, they should all be 00b0f0. 
# So we can just blindly convert all <strong> to <strong style="color: #00b0f0;">, then fix the specific red, green, purple ones in Part 3.
html = html.replace('<strong>', '<strong style="color: #00b0f0;">')

# Let's fix Part 3 Situation colors
# Situation is about recommending a place to study: a library (suggested), a living room, a quiet bedroom.
html = html.replace('<strong style="color: #00b0f0;">a library</strong>', '<strong style="color: #ee0000;">a library</strong>')
html = html.replace('<strong style="color: #00b0f0;">a living room</strong>', '<strong style="color: #70ad47;">a living room</strong>')
html = html.replace('<strong style="color: #00b0f0;">a quiet bedroom</strong>', '<strong style="color: #7030a0;">a quiet bedroom</strong>')
html = html.replace('<strong style="color: #00b0f0;">family members may interrupt</strong>', '<strong style="color: #70ad47;">family members may interrupt</strong>')
html = html.replace('<strong style="color: #00b0f0;">crowded and noisy</strong>', '<strong style="color: #70ad47;">crowded and noisy</strong>')
html = html.replace('<strong style="color: #00b0f0;">feel sleepy</strong>', '<strong style="color: #7030a0;">feel sleepy</strong>')
html = html.replace('<strong style="color: #00b0f0;">get distracted</strong>', '<strong style="color: #7030a0;">get distracted</strong>')

# Part 3 Topic is about "responsibility". The topic word is "responsibility"
html = html.replace('<strong style="color: #00b0f0;">responsibility</strong>', '<strong style="color: #ee0000;">responsibility</strong>')

# Also fix the "LƯU Ý:" tag at the top that might have been affected
html = html.replace('<strong style="color: #00b0f0;">LƯU Ý:</strong>', '<strong>LƯU Ý:</strong>')
html = html.replace('<strong style="color: #00b0f0;">traveling</strong>', '<strong>traveling</strong>')
html = html.replace('<strong style="color: #00b0f0;">recycling</strong>', '<strong>recycling</strong>')

# 2. Add highlights to Vietnamese translations
viet_replacements = {
    # Part 1: Traveling
    "chuyến đi đến Đà Nẵng": '<strong style="color: #00b0f0;">chuyến đi đến Đà Nẵng</strong>',
    "kỳ nghỉ cùng gia đình": '<strong style="color: #00b0f0;">kỳ nghỉ cùng gia đình</strong>',
    "điểm du lịch nổi tiếng": '<strong style="color: #00b0f0;">điểm du lịch nổi tiếng</strong>',
    "bãi biển tuyệt đẹp": '<strong style="color: #00b0f0;">bãi biển tuyệt đẹp</strong>',
    "văn hóa địa phương": '<strong style="color: #00b0f0;">văn hóa địa phương</strong>',
    "chuyến đi khó quên": '<strong style="color: #00b0f0;">chuyến đi khó quên</strong>',
    "thư giãn": '<strong style="color: #00b0f0;">thư giãn</strong>',
    "dành thời gian chất lượng": '<strong style="color: #00b0f0;">dành thời gian chất lượng</strong>',
    
    "thử đồ ăn địa phương": '<strong style="color: #00b0f0;">thử đồ ăn địa phương</strong>',
    "các món ăn truyền thống": '<strong style="color: #00b0f0;">các món ăn truyền thống</strong>',
    "lối sống của người dân địa phương": '<strong style="color: #00b0f0;">lối sống của người dân địa phương</strong>',
    "thú vị và đáng nhớ hơn": '<strong style="color: #00b0f0;">thú vị và đáng nhớ hơn</strong>',
    
    "tham quan các điểm du lịch": '<strong style="color: #00b0f0;">tham quan các điểm du lịch</strong>',
    "chụp ảnh": '<strong style="color: #00b0f0;">chụp ảnh</strong>',
    "mua quà lưu niệm": '<strong style="color: #00b0f0;">mua quà lưu niệm</strong>',
    "khám phá các điểm du lịch": '<strong style="color: #00b0f0;">khám phá các điểm du lịch</strong>',
    "thử ẩm thực địa phương": '<strong style="color: #00b0f0;">thử ẩm thực địa phương</strong>',
    "mở rộng tầm mắt": '<strong style="color: #00b0f0;">mở rộng tầm mắt</strong>',
    
    # Part 2: Recycling
    "chai nhựa": '<strong style="color: #00b0f0;">chai nhựa</strong>',
    "giấy": '<strong style="color: #00b0f0;">giấy</strong>',
    "lon": '<strong style="color: #00b0f0;">lon</strong>',
    "các sản phẩm từ giấy": '<strong style="color: #00b0f0;">các sản phẩm từ giấy</strong>',
    "lon nhôm": '<strong style="color: #00b0f0;">lon nhôm</strong>',
    "giảm ô nhiễm môi trường": '<strong style="color: #00b0f0;">giảm ô nhiễm môi trường</strong>',
    "lối sống bền vững": '<strong style="color: #00b0f0;">lối sống bền vững</strong>',
    
    "phân loại rác thải tái chế": '<strong style="color: #00b0f0;">phân loại rác thải tái chế</strong>',
    "giữ cho môi trường sạch sẽ hơn": '<strong style="color: #00b0f0;">giữ cho môi trường sạch sẽ hơn</strong>',
    "phân loại rác đúng cách": '<strong style="color: #00b0f0;">phân loại rác đúng cách</strong>',
    
    "thùng rác tái chế": '<strong style="color: #00b0f0;">thùng rác tái chế</strong>',
    "chiến dịch nâng cao nhận thức cộng đồng": '<strong style="color: #00b0f0;">chiến dịch nâng cao nhận thức cộng đồng</strong>',
    "chương trình giáo dục môi trường": '<strong style="color: #00b0f0;">chương trình giáo dục môi trường</strong>',
    
    # Part 3: Situation
    "thư viện": '<strong style="color: #ee0000;">thư viện</strong>',
    "tập trung tốt hơn": '<strong style="color: #00b0f0;">tập trung tốt hơn</strong>',
    "học tập hiệu quả hơn": '<strong style="color: #00b0f0;">học tập hiệu quả hơn</strong>',
    "tập trung dễ dàng hơn": '<strong style="color: #00b0f0;">tập trung dễ dàng hơn</strong>',
    "năng suất": '<strong style="color: #00b0f0;">năng suất</strong>',
    "tài nguyên": '<strong style="color: #00b0f0;">tài nguyên</strong>',
    "môi trường học tập đầy động lực": '<strong style="color: #00b0f0;">môi trường học tập đầy động lực</strong>',
    
    "phòng khách": '<strong style="color: #70ad47;">phòng khách</strong>',
    "đông đúc và ồn ào": '<strong style="color: #70ad47;">đông đúc và ồn ào</strong>',
    "các thành viên trong gia đình có thể làm gián đoạn": '<strong style="color: #70ad47;">các thành viên trong gia đình có thể làm gián đoạn</strong>',
    
    "phòng ngủ yên tĩnh": '<strong style="color: #7030a0;">phòng ngủ yên tĩnh</strong>',
    "cảm thấy buồn ngủ": '<strong style="color: #7030a0;">cảm thấy buồn ngủ</strong>',
    "bị phân tâm": '<strong style="color: #7030a0;">bị phân tâm</strong>',
    
    # Part 3 Topic
    "tinh thần trách nhiệm": '<strong style="color: #ee0000;">tinh thần trách nhiệm</strong>',
    "trách nhiệm": '<strong style="color: #ee0000;">trách nhiệm</strong>',
    "đạt được kết quả tốt hơn": '<strong style="color: #00b0f0;">đạt được kết quả tốt hơn</strong>',
    "hoàn thành nhiệm vụ thành công": '<strong style="color: #00b0f0;">hoàn thành nhiệm vụ thành công</strong>',
    "chiếm được lòng tin": '<strong style="color: #00b0f0;">chiếm được lòng tin</strong>',
    "xây dựng các mối quan hệ bền chặt hơn": '<strong style="color: #00b0f0;">xây dựng các mối quan hệ bền chặt hơn</strong>',
    "trở nên độc lập hơn": '<strong style="color: #00b0f0;">trở nên độc lập hơn</strong>',
    "đối mặt với thử thách một cách tự tin hơn": '<strong style="color: #00b0f0;">đối mặt với thử thách một cách tự tin hơn</strong>',
    
    # Part 3 Followups
    "Người trẻ tuổi": '<strong style="color: #00b0f0;">Người trẻ tuổi</strong>',
    "tôn trọng cha mẹ": '<strong style="color: #00b0f0;">tôn trọng cha mẹ</strong>',
    "giúp đỡ làm việc nhà": '<strong style="color: #00b0f0;">giúp đỡ làm việc nhà</strong>',
    "trưởng thành": '<strong style="color: #00b0f0;">trưởng thành</strong>',
    "thời gian hiệu quả": '<strong style="color: #00b0f0;">thời gian hiệu quả</strong>',
    "quyết định có trách nhiệm": '<strong style="color: #00b0f0;">quyết định có trách nhiệm</strong>',
    "giáo dục và thông tin": '<strong style="color: #00b0f0;">giáo dục và thông tin</strong>',
    "tiếp cận giáo dục": '<strong style="color: #00b0f0;">tiếp cận giáo dục</strong>',
    "các vấn đề xã hội": '<strong style="color: #00b0f0;">các vấn đề xã hội</strong>',
    "nhiệm vụ đơn giản": '<strong style="color: #00b0f0;">nhiệm vụ đơn giản</strong>',
    "độc lập": '<strong style="color: #00b0f0;">độc lập</strong>',
    "nhận trách nhiệm": '<strong style="color: #00b0f0;">nhận trách nhiệm</strong>',
    "nhiệm vụ phù hợp với lứa tuổi": '<strong style="color: #00b0f0;">nhiệm vụ phù hợp với lứa tuổi</strong>',
    "chấp nhận hậu quả": '<strong style="color: #00b0f0;">chấp nhận hậu quả</strong>'
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

print("Test 6 processed successfully.")
