import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 7/test07-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Colorize the English strong tags.
html = html.replace('<strong>', '<strong style="color: #00b0f0;">')

# Part 3 Situation
html = html.replace('<strong style="color: #00b0f0;">a comedy film</strong>', '<strong style="color: #ee0000;">a comedy film</strong>')
html = html.replace('<strong style="color: #00b0f0;">a romantic film</strong>', '<strong style="color: #70ad47;">a romantic film</strong>')
html = html.replace('<strong style="color: #00b0f0;">an action film</strong>', '<strong style="color: #7030a0;">an action film</strong>')
html = html.replace('<strong style="color: #00b0f0;">not be interesting to everyone</strong>', '<strong style="color: #70ad47;">not be interesting to everyone</strong>')
html = html.replace('<strong style="color: #00b0f0;">not find it very interesting</strong>', '<strong style="color: #70ad47;">not find it very interesting</strong>')
html = html.replace('<strong style="color: #00b0f0;">too intense or noisy</strong>', '<strong style="color: #7030a0;">too intense or noisy</strong>')

# Part 3 Topic
html = html.replace('<strong style="color: #00b0f0;">negative effects of online communication</strong>', '<strong style="color: #ee0000;">negative effects of online communication</strong>')
html = html.replace('<strong style="color: #00b0f0;">negative impacts of online communication</strong>', '<strong style="color: #ee0000;">negative impacts of online communication</strong>')
# wait, there is no "negative effects" bold tag in the text, it says "There are several negative effects of online communication." but not bolded. Let's check my grep output.
# Actually, wait, let me leave Part 3 topic as 00b0f0 unless there is a specific keyword. Let's look at the dump. No "negative effects" bolded.

# LƯU Ý
html = html.replace('<strong style="color: #00b0f0;">LƯU Ý:</strong>', '<strong>LƯU Ý:</strong>')
html = html.replace('<strong style="color: #00b0f0;">phone calls</strong>', '<strong>phone calls</strong>')
html = html.replace('<strong style="color: #00b0f0;">clothes</strong>', '<strong>clothes</strong>')

# 2. Add highlights to Vietnamese translations
viet_replacements = {
    # Part 1
    "gọi điện cho gia đình và bạn bè thân thiết": '<strong style="color: #00b0f0;">gọi điện cho gia đình và bạn bè thân thiết</strong>',
    "vài lần một tuần": '<strong style="color: #00b0f0;">vài lần một tuần</strong>',
    "giữ liên lạc": '<strong style="color: #00b0f0;">giữ liên lạc</strong>',
    "gia đình và một vài người bạn thân": '<strong style="color: #00b0f0;">gia đình và một vài người bạn thân</strong>',
    "duy trì mối quan hệ bền chặt": '<strong style="color: #00b0f0;">duy trì mối quan hệ bền chặt</strong>',
    
    "việc học hành, công việc và các hoạt động hàng ngày": '<strong style="color: #00b0f0;">việc học hành, công việc và các hoạt động hàng ngày</strong>',
    "kế hoạch tương lai": '<strong style="color: #00b0f0;">kế hoạch tương lai</strong>',
    "công việc, học tập, chuyện gia đình": '<strong style="color: #00b0f0;">công việc, học tập, chuyện gia đình</strong>',
    "trao đổi lời khuyên hoặc thảo luận về kế hoạch tương lai": '<strong style="color: #00b0f0;">trao đổi lời khuyên hoặc thảo luận về kế hoạch tương lai</strong>',
    "hiểu và hỗ trợ nhau": '<strong style="color: #00b0f0;">hiểu và hỗ trợ nhau</strong>',
    
    "nhanh hơn và mang tính cá nhân hơn": '<strong style="color: #00b0f0;">nhanh hơn và mang tính cá nhân hơn</strong>',
    "bày tỏ cảm xúc của mình rõ ràng hơn": '<strong style="color: #00b0f0;">bày tỏ cảm xúc của mình rõ ràng hơn</strong>',
    "trực tiếp và tương tác tốt hơn": '<strong style="color: #00b0f0;">trực tiếp và tương tác tốt hơn</strong>',
    "tránh hiểu lầm": '<strong style="color: #00b0f0;">tránh hiểu lầm</strong>',
    "cá nhân hơn": '<strong style="color: #00b0f0;">cá nhân hơn</strong>',
    
    # Part 2
    "vài tháng một lần": '<strong style="color: #00b0f0;">vài tháng một lần</strong>',
    "khi thấy cần thiết": '<strong style="color: #00b0f0;">khi thấy cần thiết</strong>',
    "khi giao mùa": '<strong style="color: #00b0f0;">khi giao mùa</strong>',
    "dịp đặc biệt": '<strong style="color: #00b0f0;">dịp đặc biệt</strong>',
    
    "các ngày lễ, sự kiện gia đình": '<strong style="color: #00b0f0;">các ngày lễ, sự kiện gia đình</strong>',
    "sờn rách": '<strong style="color: #00b0f0;">sờn rách</strong>',
    "dịp quan trọng": '<strong style="color: #00b0f0;">dịp quan trọng</strong>',
    "làm mới tủ đồ của mình": '<strong style="color: #00b0f0;">làm mới tủ đồ của mình</strong>',
    
    "quần áo thông thường": '<strong style="color: #00b0f0;">quần áo thông thường</strong>',
    "thoải mái và thiết thực": '<strong style="color: #00b0f0;">thoải mái và thiết thực</strong>',
    "quần áo mặc thường ngày": '<strong style="color: #00b0f0;">quần áo mặc thường ngày</strong>',
    "trang phục trang trọng": '<strong style="color: #00b0f0;">trang phục trang trọng</strong>',

    # Part 3 Followups
    "ứng dụng tin nhắn": '<strong style="color: #00b0f0;">ứng dụng tin nhắn</strong>',
    "tiện lợi": '<strong style="color: #00b0f0;">tiện lợi</strong>',
    "ứng dụng tin nhắn và nền tảng mạng xã hội": '<strong style="color: #00b0f0;">ứng dụng tin nhắn và nền tảng mạng xã hội</strong>',
    "tiện lợi và dễ dàng truy cập": '<strong style="color: #00b0f0;">tiện lợi và dễ dàng truy cập</strong>',
    
    "xây dựng các mối quan hệ bền chặt hơn": '<strong style="color: #00b0f0;">xây dựng các mối quan hệ bền chặt hơn</strong>',
    "tương tác trực tiếp vẫn đóng vai trò quan trọng": '<strong style="color: #00b0f0;">tương tác trực tiếp vẫn đóng vai trò quan trọng</strong>',
    "duy trì các mối quan hệ có ý nghĩa": '<strong style="color: #00b0f0;">duy trì các mối quan hệ có ý nghĩa</strong>',
    
    "giao tiếp rõ ràng": '<strong style="color: #00b0f0;">giao tiếp rõ ràng</strong>',
    "suy nghĩ cẩn thận trước khi gửi tin nhắn": '<strong style="color: #00b0f0;">suy nghĩ cẩn thận trước khi gửi tin nhắn</strong>',
    "giao tiếp trực tuyến một cách rõ ràng và tôn trọng": '<strong style="color: #00b0f0;">giao tiếp trực tuyến một cách rõ ràng và tôn trọng</strong>',
    "xác minh thông tin trước khi chia sẻ": '<strong style="color: #00b0f0;">xác minh thông tin trước khi chia sẻ</strong>',
    "cân bằng lành mạnh": '<strong style="color: #00b0f0;">cân bằng lành mạnh</strong>',

    # Part 3 Situation
    "phim hài": '<strong style="color: #ee0000;">phim hài</strong>',
    "cười và thư giãn": '<strong style="color: #00b0f0;">cười và thư giãn</strong>',
    "giảm bớt căng thẳng": '<strong style="color: #00b0f0;">giảm bớt căng thẳng</strong>',
    "dành thời gian chất lượng bên nhau": '<strong style="color: #00b0f0;">dành thời gian chất lượng bên nhau</strong>',
    "trở nên thân thiết hơn": '<strong style="color: #00b0f0;">trở nên thân thiết hơn</strong>',
    "thư giãn và nạp lại năng lượng": '<strong style="color: #00b0f0;">thư giãn và nạp lại năng lượng</strong>',
    "giảm căng thẳng và cải thiện tâm trạng": '<strong style="color: #00b0f0;">giảm căng thẳng và cải thiện tâm trạng</strong>',
    "tạo nên những kỷ niệm đẹp": '<strong style="color: #00b0f0;">tạo nên những kỷ niệm đẹp</strong>',
    "thắt chặt tình bạn": '<strong style="color: #00b0f0;">thắt chặt tình bạn</strong>',
    "lựa chọn tốt hơn": '<strong style="color: #00b0f0;">lựa chọn tốt hơn</strong>',
    
    "phim lãng mạn": '<strong style="color: #70ad47;">phim lãng mạn</strong>',
    "không thú vị đối với tất cả mọi người": '<strong style="color: #70ad47;">không thú vị đối với tất cả mọi người</strong>',
    "không thấy nó thú vị lắm": '<strong style="color: #70ad47;">không thấy nó thú vị lắm</strong>',
    
    "phim hành động": '<strong style="color: #7030a0;">phim hành động</strong>',
    "quá kịch tính hoặc ồn ào": '<strong style="color: #7030a0;">quá kịch tính hoặc ồn ào</strong>',
    
    # Part 3 Topic
    "dễ bị mất tập trung": '<strong style="color: #00b0f0;">dễ bị mất tập trung</strong>',
    "dễ bị phân tâm": '<strong style="color: #00b0f0;">dễ bị phân tâm</strong>',
    "năng suất làm việc của họ có thể giảm sút": '<strong style="color: #00b0f0;">năng suất làm việc của họ có thể giảm sút</strong>',
    "tập trung vào công việc hoặc học tập": '<strong style="color: #00b0f0;">tập trung vào công việc hoặc học tập</strong>',
    "năng suất và sự tập trung": '<strong style="color: #00b0f0;">năng suất và sự tập trung</strong>',
    
    "dẫn đến xung đột": '<strong style="color: #00b0f0;">dẫn đến xung đột</strong>',
    "những tranh cãi không đáng có": '<strong style="color: #00b0f0;">những tranh cãi không đáng có</strong>',
    "diễn giải sai": '<strong style="color: #00b0f0;">diễn giải sai</strong>',
    "hiểu lầm và bất đồng không đáng có": '<strong style="color: #00b0f0;">hiểu lầm và bất đồng không đáng có</strong>',
    
    "giảm bớt sự tương tác trực tiếp": '<strong style="color: #00b0f0;">giảm bớt sự tương tác trực tiếp</strong>',
    "suy yếu các mối quan hệ cá nhân": '<strong style="color: #00b0f0;">suy yếu các mối quan hệ cá nhân</strong>',
    "giảm tương tác trực tiếp": '<strong style="color: #00b0f0;">giảm tương tác trực tiếp</strong>',
    
    "phụ thuộc vào công nghệ": '<strong style="color: #00b0f0;">phụ thuộc vào công nghệ</strong>',
    "kỹ năng giao tiếp": '<strong style="color: #00b0f0;">kỹ năng giao tiếp</strong>',
    "bị phụ thuộc vào công nghệ": '<strong style="color: #00b0f0;">bị phụ thuộc vào công nghệ</strong>',
    "mất đi sự tự tin trong giao tiếp trực tiếp": '<strong style="color: #00b0f0;">mất đi sự tự tin trong giao tiếp trực tiếp</strong>'
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

print("Test 7 processed successfully.")
