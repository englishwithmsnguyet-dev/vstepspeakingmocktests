import re
import os

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 4/test04-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

replacements_blue = [
    "Sơn Tùng M-TP",
    "một trong những ca sĩ nổi tiếng nhất Việt Nam",
    "nổi tiếng với phong cách âm nhạc độc đáo và những màn trình diễn ấn tượng",
    "giọng hát độc đáo",
    "các bài hát của anh ấy bắt tai và ý nghĩa",
    "cải thiện tâm trạng",
    "các bài hát của anh ấy sáng tạo và truyền cảm hứng",
    "thoát khỏi căng thẳng hàng ngày",
    "sự cống hiến và làm việc chăm chỉ của anh ấy",
    "tài năng", "chăm chỉ", "tự tin",
    "phong cách thời trang độc đáo",
    "ảnh hưởng tích cực đến nhiều người trẻ",
    "đầy tham vọng", "sáng tạo",
    "phong cách âm nhạc đặc trưng",
    "thử nghiệm những ý tưởng mới trong tác phẩm của mình",
    "đạt được thành công lớn",
    "Trấn Thành",
    "diễn xuất rất tự nhiên",
    "chuyên nghiệp",
    "đa tài",
    "hóa thân thành công vào nhiều vai diễn khác nhau",
    "làm việc rất chăm chỉ để cải thiện các kỹ năng của mình",
    "làm việc chăm chỉ",
    "giao tiếp tốt với người hâm mộ của họ",
    "sự cống hiến", "thái độ làm việc chuyên nghiệp",
    "mạng xã hội", "hình ảnh trước công chúng",
    "phim Việt Nam chất lượng cao",
    "tạo ra nhiều cơ hội hơn cho diễn viên và nhà làm phim",
    "đầu tư nhiều hơn vào công nghệ", "cách kể chuyện", "chất lượng diễn xuất",
    "phim Việt Nam", "cạnh tranh hơn",
    "món quà ý nghĩa", "giữ lại những kỷ niệm đẹp với gia đình",
    "nhìn lại những bức ảnh trong tương lai", "nhớ về dịp đặc biệt này",
    "trở nên giá trị hơn theo thời gian",
    "tạo ra trải nghiệm đặc biệt", "cho cả gia đình",
    "dành thời gian bên nhau", "tận hưởng buổi chụp ảnh",
    "làm cho lễ kỷ niệm đáng nhớ hơn",
    "thể hiện tình yêu và sự trân trọng của anh ấy dành cho cha mẹ",
    "không nằm ở giá cả", "mà ở những kỷ niệm nó tạo ra",
    "nhắc họ nhớ về dịp đặc biệt này trong nhiều năm",
    "món quà độc đáo", "chụp ảnh cùng nhau", "tạo ra những kỷ niệm khó quên",
    "làm cho món quà trở nên cá nhân và đặc biệt hơn những món quà thông thường",
    "để lại ấn tượng mạnh mẽ hơn",
    "tiện lợi",
    "dễ dàng đến lớp học, thư viện và các cơ sở vật chất khác",
    "tiết kiệm rất nhiều thời gian",
    "cung cấp cơ hội giao lưu",
    "mang lại cơ hội mở rộng mạng lưới quan hệ",
    "gặp gỡ những người bạn mới", "tương tác với nhiều người",
    "xây dựng những mối quan hệ quý giá",
    "chi phí hợp lý",
    "chi tiêu ít tiền hơn cho việc đi lại",
    "giảm chi phí sinh hoạt",
    "dễ dàng tiếp cận các lớp học, thư viện và các cơ sở vật chất khác của trường",
    "tiết kiệm thời gian", "tập trung hơn vào việc học",
    "kết bạn mới", "xây dựng mối quan hệ với bạn cùng lớp",
    "mở rộng mạng lưới xã hội của mình", "học hỏi từ người khác",
    "thấp hơn so với thuê một căn hộ tư nhân",
    "ít sự riêng tư hơn", "ký túc xá có thể ồn ào", "ảnh hưởng đến sự tập trung của sinh viên",
    "thiếu sự riêng tư", "chung phòng với những người khác",
    "đôi khi có thể đông đúc và ồn ào", "khiến việc học trở nên khó khăn hơn",
    "mang lại cho sinh viên nhiều tự do và riêng tư hơn",
    "đắt hơn và kém thuận tiện hơn",
    "sự độc lập và riêng tư lớn hơn",
    "chi nhiều tiền hơn cho chỗ ở và đi lại",
    "cảm thấy ít kết nối hơn với cuộc sống trong trường",
    "thích sống trong khuôn viên trường hơn",
    "tiện lợi và giá cả phải chăng", "kết bạn nhiều hơn",
    "giúp dễ dàng tiếp cận các cơ sở vật chất của trường đại học",
    "tạo ra nhiều cơ hội giao lưu hơn",
    "tiết kiệm chi phí hơn",
    
    "món quà có ý nghĩa",
    "ngưỡng mộ anh ấy",
    "những trải nghiệm đặc biệt",
    "không nằm ở giá trị vật chất",
    "phim Việt Nam chất lượng cao",
    "thu hút lượng lớn khán giả",
    "cơ hội giao lưu"
]

red_keywords = [
    "đề xuất một món quà",
    "đề xuất tặng một món quà",
    "đề xuất tặng",
    "kỷ niệm 30 năm ngày cưới",
    "chụp ảnh gia đình",
    "đề xuất chụp ảnh gia đình",
    "gợi ý chụp ảnh gia đình",
    "đề xuất một buổi chụp ảnh gia đình",
    "một buổi chụp ảnh gia đình",
    "lợi ích",
    "sống trong khuôn viên trường",
    "sống ở ký túc xá",
    "sống trong khuôn viên trường đại học"
]

green_keywords = [
    "một chuyến du lịch nước ngoài",
    "quá đắt đỏ và mất nhiều thời gian để chuẩn bị",
    "quá đắt"
]

purple_keywords = [
    "đồng hồ đôi",
    "món quà phổ biến và không có gì đặc biệt",
    "cha mẹ anh ấy có thể đã có đồng hồ ở nhà"
]

def color_vietnamese(match):
    trans_content = match.group(1)
    
    for kw in red_keywords:
        trans_content = trans_content.replace(kw, f'<strong style="color: #ee0000;">{kw}</strong>')
    
    for kw in green_keywords:
        trans_content = trans_content.replace(kw, f'<strong style="color: #70ad47;">{kw}</strong>')
        
    for kw in purple_keywords:
        trans_content = trans_content.replace(kw, f'<strong style="color: #7030a0;">{kw}</strong>')
        
    for kw in replacements_blue:
        # don't replace if it's already inside a tag
        if f'>{kw}<' not in trans_content and f'="{kw}"' not in trans_content:
            trans_content = trans_content.replace(kw, f'<strong style="color: #00b0f0;">{kw}</strong>')
            
    # Fix double tags
    trans_content = re.sub(r'<strong[^>]*><strong[^>]*>(.*?)</strong></strong>', r'<strong style="color: #00b0f0;">\1</strong>', trans_content)
    
    return f'<div class="translation-text" style="display: none; white-space: pre-line;">{trans_content}</div>'

html = re.sub(r'<div class="translation-text" style="display: none; white-space: pre-line;">(.*?)</div>', color_vietnamese, html, flags=re.DOTALL)

# Let's fix the double tags that might happen
html = html.replace('<strong><strong', '<strong')
html = html.replace('</strong></strong>', '</strong>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Vietnamese coloring patched!")
