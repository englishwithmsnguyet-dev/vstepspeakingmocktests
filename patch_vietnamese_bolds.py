import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

def robust_replace(html_str, old, new):
    # To avoid double bolding, we check if it's already bolded
    # But replacing it directly is easier, we just remove existing bolds around it first or just be careful.
    # We will just do a simple string replace for now.
    if new not in html_str:
        return html_str.replace(old, new)
    return html_str

# Part 02 - B1 (Ans 12)
# English bolds: suggest what my brother should do after graduation, recommend, going to work
html = robust_replace(html, 'gợi ý những gì em trai tôi nên làm sau khi tốt nghiệp', '<strong>gợi ý những gì em trai tôi nên làm sau khi tốt nghiệp</strong>')
html = robust_replace(html, 'tôi sẽ khuyên anh ấy đi làm', 'tôi sẽ <strong>khuyên anh ấy đi làm</strong>')
# English: gain practical experience, learn, professional skills, understand the real working environment, prepare better for his future career
html = robust_replace(html, 'tích lũy được những kinh nghiệm thực tế quý báu', '<strong>tích lũy được những kinh nghiệm thực tế quý báu</strong>')
html = robust_replace(html, 'phát triển các kỹ năng quan trọng', '<strong>phát triển các kỹ năng quan trọng</strong>')
html = robust_replace(html, 'học cách vận hành của doanh nghiệp', '<strong>học cách vận hành của doanh nghiệp</strong>') # Wait this is B2. Let's do B1:
html = robust_replace(html, 'phát triển các kỹ năng chuyên môn', '<strong>phát triển các kỹ năng chuyên môn</strong>') # check actual text
html = robust_replace(html, 'hiểu rõ hơn về môi trường làm việc thực tế', '<strong>hiểu rõ hơn về môi trường làm việc thực tế</strong>')
html = robust_replace(html, 'chuẩn bị tốt hơn cho sự nghiệp tương lai', '<strong>chuẩn bị tốt hơn cho sự nghiệp tương lai</strong>')

# Second paragraph: earn money, become more independent, support himself, reduce the financial burden on our family
html = robust_replace(html, 'kiếm tiền', '<strong>kiếm tiền</strong>')
html = robust_replace(html, 'trở nên độc lập hơn', '<strong>trở nên độc lập hơn</strong>')
html = robust_replace(html, 'tự nuôi sống bản thân', '<strong>tự nuôi sống bản thân</strong>')
html = robust_replace(html, 'giảm bớt gánh nặng tài chính cho gia đình', '<strong>giảm bớt gánh nặng tài chính cho gia đình</strong>')

# studying for a master’s degree, it can be expensive, taking a gap year, he may lose motivation and waste valuable time
html = robust_replace(html, 'học thạc sĩ', '<strong>học thạc sĩ</strong>')
html = robust_replace(html, 'nó có thể rất tốn kém', '<strong>nó có thể rất tốn kém</strong>')
html = robust_replace(html, 'nghỉ một năm (gap year)', '<strong>nghỉ một năm (gap year)</strong>')
html = robust_replace(html, 'anh ấy có thể mất động lực và lãng phí thời gian quý báu', '<strong>anh ấy có thể mất động lực và lãng phí thời gian quý báu</strong>')

# going to work
html = robust_replace(html, 'đi làm là lựa chọn tốt nhất', '<strong>đi làm</strong> là lựa chọn tốt nhất')


# Part 03 - B1 (Ans 14)
# it's convenient, don't need to leave the school to look for food, have lunch more easily and comfortably
html = robust_replace(html, 'nó rất tiện lợi', '<strong>nó rất tiện lợi</strong>')
html = robust_replace(html, 'học sinh không cần phải rời trường để tìm kiếm thức ăn', 'học sinh <strong>không cần phải rời trường để tìm kiếm thức ăn</strong>')
html = robust_replace(html, 'ăn trưa dễ dàng và thoải mái hơn', '<strong>ăn trưa dễ dàng và thoải mái hơn</strong>')

# it's time-saving, is located inside the school, buy their meals quickly, have more time to rest, prepare for their next classes
html = robust_replace(html, 'tiết kiệm thời gian', '<strong>tiết kiệm thời gian</strong>')
html = robust_replace(html, 'nằm trong khuôn viên trường', '<strong>nằm trong khuôn viên trường</strong>')
html = robust_replace(html, 'mua bữa ăn nhanh chóng', '<strong>mua bữa ăn nhanh chóng</strong>')
html = robust_replace(html, 'có nhiều thời gian hơn để nghỉ ngơi', '<strong>có nhiều thời gian hơn để nghỉ ngơi</strong>')
html = robust_replace(html, 'chuẩn bị cho các tiết học tiếp theo', '<strong>chuẩn bị cho các tiết học tiếp theo</strong>')

# meals at the canteen are usually cheap, enjoy lunch at reasonable prices, save money
html = robust_replace(html, 'các bữa ăn tại căng tin thường rẻ', '<strong>các bữa ăn tại căng tin thường rẻ</strong>')
html = robust_replace(html, 'thưởng thức bữa trưa với giá cả hợp lý', '<strong>thưởng thức bữa trưa với giá cả hợp lý</strong>')
html = robust_replace(html, 'tiết kiệm tiền', '<strong>tiết kiệm tiền</strong>')


# Part 03 - B2 (Ans 15)
# having lunch at the school canteen is convenient, don’t need to leave the school to buy food, spend more time resting or studying
html = robust_replace(html, 'cực kỳ tiện lợi cho học sinh', '<strong>cực kỳ tiện lợi cho học sinh</strong>')
html = robust_replace(html, 'không cần di chuyển ra ngoài để mua đồ ăn', '<strong>không cần di chuyển ra ngoài để mua đồ ăn</strong>')
html = robust_replace(html, 'giúp giờ ăn trưa trở nên thoải mái và ít căng thẳng hơn', '<strong>giúp giờ ăn trưa trở nên thoải mái và ít căng thẳng hơn</strong>')

# having lunch at the school canteen is time-saving, get their meals quickly without travelling far, have more time for other school activities
html = robust_replace(html, 'giúp tiết kiệm một lượng thời gian đáng kể', '<strong>giúp tiết kiệm một lượng thời gian đáng kể</strong>')
html = robust_replace(html, 'nhanh chóng mua bữa ăn của mình', '<strong>nhanh chóng mua bữa ăn của mình</strong>')
html = robust_replace(html, 'có nhiều thời gian hơn để thư giãn hoặc chuẩn bị cho các bài học sắp tới', '<strong>có nhiều thời gian hơn để thư giãn hoặc chuẩn bị cho các bài học sắp tới</strong>')

# meals at the canteen are usually cheap, spend less money than when eating at restaurants or food stalls, save money on daily meals
html = robust_replace(html, 'thường có giá cả phải chăng', '<strong>thường có giá cả phải chăng</strong>')
html = robust_replace(html, 'có giá hợp lý', '<strong>có giá hợp lý</strong>')
html = robust_replace(html, 'quản lý chi tiêu hàng ngày hiệu quả hơn', '<strong>quản lý chi tiêu hàng ngày hiệu quả hơn</strong>')

# B2 Part 02 specific
# gain valuable practical experience, develop important skills, learn how businesses operate, better understand his career interests
html = robust_replace(html, 'tích lũy được những kinh nghiệm thực tế quý báu', '<strong>tích lũy được những kinh nghiệm thực tế quý báu</strong>')
html = robust_replace(html, 'phát triển các kỹ năng quan trọng', '<strong>phát triển các kỹ năng quan trọng</strong>')
html = robust_replace(html, 'học cách vận hành của doanh nghiệp', '<strong>học cách vận hành của doanh nghiệp</strong>')
html = robust_replace(html, 'hiểu rõ hơn về sở thích nghề nghiệp của mình', '<strong>hiểu rõ hơn về sở thích nghề nghiệp của mình</strong>')
html = robust_replace(html, 'rất hữu ích cho sự phát triển lâu dài của anh ấy', '<strong>rất hữu ích cho sự phát triển lâu dài của anh ấy</strong>')

# become financially independent, earn his own income, support himself, reduce the financial burden on our family
html = robust_replace(html, 'trở nên độc lập về tài chính', '<strong>trở nên độc lập về tài chính</strong>')
html = robust_replace(html, 'tự kiếm thu nhập', '<strong>tự kiếm thu nhập</strong>')
html = robust_replace(html, 'tự trang trải cuộc sống', '<strong>tự trang trải cuộc sống</strong>')

# requires a significant investment of time and money, lose motivation and waste valuable time
html = robust_replace(html, 'đòi hỏi sự đầu tư lớn về thời gian và tiền bạc', '<strong>đòi hỏi sự đầu tư lớn về thời gian và tiền bạc</strong>')
html = robust_replace(html, 'mất thói quen học tập và làm việc', '<strong>mất thói quen học tập và làm việc</strong>')

# Fix any double strongs just in case
html = html.replace('<strong><strong>', '<strong>').replace('</strong></strong>', '</strong>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Applied bolding to Vietnamese text.")
