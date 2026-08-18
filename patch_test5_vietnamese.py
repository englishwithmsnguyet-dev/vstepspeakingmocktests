import re
from bs4 import BeautifulSoup

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 5/test05-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

translations = [
    "Vâng, tôi có. Tôi thường uống trà xanh vài lần một tuần. Tôi thích nó vì hương vị thanh mát và giúp tôi cảm thấy thư giãn.",
    "Vâng, tôi có. Trà xanh thực sự là một trong những đồ uống yêu thích của tôi. Tôi thường uống nó khá thường xuyên vì nó giúp tôi cảm thấy sảng khoái và tập trung suốt cả ngày. Ngoài ra, tôi tin rằng nó là một sự thay thế lành mạnh hơn cho nhiều loại đồ uống có đường.",
    "Tôi thường uống trà xanh vào buổi sáng hoặc sau bữa trưa. Nó giúp tôi cảm thấy sảng khoái và tập trung suốt cả ngày.",
    "Tôi thường uống trà xanh vào buổi sáng hoặc trong những giờ nghỉ giải lao ngắn khi làm việc. Nó giúp tôi tỉnh táo và duy trì sự tập trung. Kết quả là, tôi có thể làm việc hiệu quả hơn và cảm thấy năng suất hơn.",
    "Vâng, đúng vậy. Trà xanh là một thức uống phổ biến ở nước tôi. Nhiều người uống nó mỗi ngày, đặc biệt là những người lớn tuổi.",
    "Vâng, trà xanh vô cùng phổ biến ở nước tôi. Nhiều người uống nó hàng ngày vì nó phải chăng, thanh mát và được tin là mang lại nhiều lợi ích cho sức khỏe. Ngoài ra, nó đã trở thành một phần quan trọng của văn hóa Việt Nam.",
    "Vâng, tôi đã từng. Tôi đã từng đến một trung tâm mua sắm đông đúc trước đây, và đó là một trải nghiệm rất thú vị. Nó giúp tôi tận hưởng thời gian rảnh rỗi và mua nhiều thứ tôi cần.",
    "Vâng, tôi đã từng. Tôi đã ghé thăm nhiều nơi đông đúc như trung tâm thương mại, lễ hội âm nhạc và các sự kiện công cộng. Những nơi này thường tràn đầy năng lượng và thu hút số lượng lớn người tham gia.",
    "Tôi cảm thấy hào hứng vì có nhiều người và rất nhiều hoạt động thú vị. Nó cũng cho tôi cơ hội khám phá các cửa hàng khác nhau.",
    "Ban đầu tôi cảm thấy khá phấn khích vì bầu không khí sôi động và tràn đầy năng lượng. Tuy nhiên, sau khi ở đó một thời gian dài, tôi bắt đầu cảm thấy ngột ngạt vì tiếng ồn và những đám đông lớn. Vì vậy, tôi thường không thích ở những nơi này quá lâu.",
    "Tôi thích những nơi yên tĩnh hơn vì chúng thanh bình và thoải mái hơn. Chúng giúp tôi thư giãn và tập trung tốt hơn vào những gì tôi đang làm.",
    "Tôi chắc chắn thích những nơi yên tĩnh hơn. Chúng mang lại một bầu không khí thanh bình, nơi tôi có thể thư giãn, tập trung vào công việc và nạp lại năng lượng sau một ngày bận rộn. Đó là lý do tại sao tôi hiếm khi dành nhiều thời gian ở môi trường đông đúc.",
    "À, nếu tôi phải gợi ý một yếu tố cho em gái tôi khi chọn trường đại học, tôi sẽ khuyên cân nhắc xếp hạng của trường đại học.\n\nTrước hết, một trường đại học có xếp hạng cao thường mang lại một nền giáo dục tốt. Em ấy có thể học hỏi từ những giáo viên giàu kinh nghiệm và sử dụng tài liệu học tập tốt hơn. Kết quả là, em ấy có thể cải thiện kiến thức và kỹ năng của mình.\n\nThứ hai, một trường đại học có xếp hạng cao thường có cơ sở vật chất và nguồn tài liệu học tập tốt hơn. Ví dụ, em ấy có thể sử dụng thư viện, phòng thí nghiệm hiện đại và tài liệu học tập. Vì vậy, em ấy có thể học tập hiệu quả hơn.\n\nTôi không khuyên chọn một trường đại học dựa trên khoảng cách từ nhà vì chất lượng giáo dục quan trọng hơn. Đối với học phí, phương án này kém phù hợp hơn vì một trường đại học rẻ hơn có thể không luôn mang lại nền giáo dục tốt nhất.\n\nTóm lại, tôi tin rằng xếp hạng của trường đại học là lựa chọn tốt nhất cho tình huống này.",
    "À, nếu tôi phải gợi ý một yếu tố cho em gái tôi khi chọn trường đại học, tôi sẽ khuyên cân nhắc xếp hạng của trường đại học.\n\nTrước hết, một trường đại học có thứ hạng cao thường cung cấp nền giáo dục chất lượng cao. Điều này có nghĩa là sinh viên có thể học hỏi từ những giảng viên giàu kinh nghiệm và tiếp cận các nguồn tài liệu học tập tốt hơn. Kết quả là, họ có thể phát triển kiến thức và kỹ năng hiệu quả hơn.\n\nThứ hai, học tập tại một trường đại học có thứ hạng cao có thể có lợi cho sự nghiệp tương lai của em ấy. Điều này là do nhiều công ty thích sinh viên từ các trường đại học danh tiếng. Kết quả là, em ấy có thể tìm được một công việc tốt dễ dàng hơn sau khi tốt nghiệp.\n\nTôi không khuyên chọn một trường đại học chủ yếu dựa trên khoảng cách từ nhà vì một trường đại học gần đó có thể không cung cấp môi trường học tập tốt nhất. Đối với học phí, chúng ít quan trọng hơn vì sinh viên thường có thể tìm thấy học bổng hoặc hỗ trợ tài chính.\n\nTóm lại, tôi tin rằng xếp hạng của trường đại học là lựa chọn tốt nhất cho tình huống này.",
    "Có một số yếu tố cần cân nhắc khi nộp đơn xin việc.\n\nMột yếu tố chính là mức lương. Một mức lương tốt có thể giúp họ đáp ứng nhu cầu tài chính của mình. Kết quả là, họ có thể có chất lượng cuộc sống tốt hơn.\n\nMột lý do đóng góp khác là vị trí công việc. Một vị trí thuận tiện có thể tiết kiệm thời gian và chi phí đi lại. Do đó, họ có thể có một thói quen hàng ngày thoải mái hơn.\n\nMột vấn đề cơ bản nữa là môi trường làm việc. Một nơi làm việc tích cực có thể giúp nhân viên cảm thấy có động lực và làm việc hiệu quả. Điều này có thể cải thiện sự hài lòng trong công việc của họ.\n\nTóm lại, có một số yếu tố cần cân nhắc khi nộp đơn xin việc, như đã đề cập ở trên.",
    "Có một số yếu tố cần cân nhắc khi nộp đơn xin việc.\n\nMột yếu tố chính là mức lương. Điều này là do một mức lương tốt giúp nhân viên trang trải chi phí sinh hoạt của họ và cải thiện chất lượng cuộc sống. Kết quả là, họ có thể cảm thấy có động lực làm việc hơn.\n\nMột lý do đóng góp khác là vị trí công việc. Thực tế, làm việc gần nhà có thể tiết kiệm thời gian và giảm chi phí đi lại. Điều này có thể giúp nhân viên duy trì sự cân bằng công việc - cuộc sống tốt hơn.\n\nMột vấn đề cơ bản nữa là môi trường làm việc. Điều này có nghĩa là một nơi làm việc tích cực cho phép nhân viên cảm thấy thoải mái và được hỗ trợ. Do đó, họ có thể làm việc hiệu quả hơn và tận hưởng công việc của mình.\n\nTóm lại, có một số yếu tố cần cân nhắc khi nộp đơn xin việc, như đã đề cập ở trên.",
    "Tôi nghĩ kỹ năng giao tiếp và kỹ năng làm việc nhóm là rất quan trọng. Ngoài ra, kỹ năng giải quyết vấn đề có thể giúp nhân viên làm việc hiệu quả hơn.",
    "Theo tôi, kỹ năng giao tiếp, làm việc nhóm và kỹ năng giải quyết vấn đề là rất cần thiết khi nộp đơn xin việc. Bên cạnh đó, ứng viên cần có khả năng thích nghi và sẵn sàng học hỏi những điều mới. Những phẩm chất này có thể giúp họ làm việc tốt trong môi trường chuyên nghiệp.",
    "Các công việc trong ngành công nghệ thông tin, y học và tài chính thường được trả lương cao. Những công việc này thường đòi hỏi kiến thức và kỹ năng chuyên môn sâu.",
    "Ở nước tôi, các nghề nghiệp trong lĩnh vực công nghệ thông tin, chăm sóc sức khỏe, tài chính và quản lý kinh doanh có xu hướng đưa ra mức lương hấp dẫn. Những nghề này thường đòi hỏi bằng cấp tốt và chuyên môn sâu rộng.",
    "Công nghệ giúp mọi người hoàn thành các nhiệm vụ nhanh chóng và hiệu quả hơn. Nó cũng giúp giao tiếp trong công việc dễ dàng hơn.",
    "Công nghệ đã cải thiện đáng kể hiệu quả nơi làm việc. Nó giúp nhân viên hoàn thành các nhiệm vụ nhanh hơn và giao tiếp hiệu quả hơn. Kết quả là, nhiều người có thể đạt được hiệu suất công việc tốt hơn."
]

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

# Sort keywords by length descending to match longest phrases first
blue_keywords.sort(key=len, reverse=True)
red_keywords.sort(key=len, reverse=True)
green_keywords.sort(key=len, reverse=True)
purple_keywords.sort(key=len, reverse=True)

level_contents = soup.find_all('div', class_='level-content')

for i, lc in enumerate(level_contents):
    if i >= len(translations):
        break
        
    text_div = lc.find('div', class_='translation-text')
    if text_div:
        trans_content = translations[i]
        
        # Apply keywords
        for kw in red_keywords:
            if f'>{kw}<' not in trans_content and f'="{kw}"' not in trans_content:
                trans_content = trans_content.replace(kw, f'<strong style="color: #ee0000;">{kw}</strong>')
        
        for kw in green_keywords:
            if f'>{kw}<' not in trans_content and f'="{kw}"' not in trans_content:
                trans_content = trans_content.replace(kw, f'<strong style="color: #70ad47;">{kw}</strong>')
            
        for kw in purple_keywords:
            if f'>{kw}<' not in trans_content and f'="{kw}"' not in trans_content:
                trans_content = trans_content.replace(kw, f'<strong style="color: #7030a0;">{kw}</strong>')
            
        for kw in blue_keywords:
            if f'>{kw}<' not in trans_content and f'="{kw}"' not in trans_content:
                trans_content = trans_content.replace(kw, f'<strong style="color: #00b0f0;">{kw}</strong>')
                
        # Fix double strongs
        trans_content = re.sub(r'<strong[^>]*><strong[^>]*>(.*?)</strong></strong>', r'<strong style="color: #00b0f0;">\1</strong>', trans_content)
        
        # Update text_div content
        # It's important to use string replacement since BeautifulSoup might escape tags if assigned to string
        text_div.clear()
        
        # We also need to add 'white-space: pre-line;' style to display linebreaks correctly
        text_div['style'] = "display: none; white-space: pre-line;"
        
        # We parse the trans_content as HTML to append to text_div
        parsed_trans = BeautifulSoup(trans_content, 'html.parser')
        text_div.append(parsed_trans)

html_output = str(soup)
html_output = html_output.replace('\\"', '"')
html_output = html_output.replace('<strong><strong', '<strong').replace('</strong></strong>', '</strong>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_output)

print("Successfully patched test05-index.html Vietnamese translations!")
