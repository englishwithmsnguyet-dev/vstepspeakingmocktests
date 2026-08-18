import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 2/test02-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

replacements = {
    # Part 01
    "vẽ tranh": "<strong>vẽ tranh</strong>",
    "tạo ra nhiều bức tranh khác nhau": "<strong>tạo ra nhiều bức tranh khác nhau</strong>",
    "trí tưởng tượng": "<strong>trí tưởng tượng</strong>",
    "dành thời gian rảnh rỗi": "<strong>dành thời gian rảnh rỗi</strong>",
    "phát triển khả năng sáng tạo": "<strong>phát triển khả năng sáng tạo</strong>",
    
    "mở rộng kiến thức": "<strong>mở rộng kiến thức</strong>",
    "phát triển thói quen học tập tốt hơn": "<strong>phát triển thói quen học tập tốt hơn</strong>",
    "sử dụng thời gian rảnh rỗi một cách hiệu quả": "<strong>sử dụng thời gian rảnh rỗi một cách hiệu quả</strong>",
    
    # Part 02 B1
    "tập một môn thể thao": "<strong>tập một môn thể thao</strong>",
    "vui vẻ": "<strong>vui vẻ</strong>",
    "tận hưởng thời gian rảnh rỗi": "<strong>tận hưởng thời gian rảnh rỗi</strong>",
    "giảm căng thẳng": "<strong>giảm căng thẳng</strong>",
    "cảm thấy thư giãn hơn": "<strong>cảm thấy thư giãn hơn</strong>",
    "giữ cho cơ thể luôn năng động": "<strong>giữ cho cơ thể luôn năng động</strong>",
    "cải thiện sức khỏe cả về thể chất lẫn tinh thần": "<strong>cải thiện sức khỏe cả về thể chất lẫn tinh thần</strong>",
    "duy trì lối sống lành mạnh": "<strong>duy trì lối sống lành mạnh</strong>",
    "đòi hỏi nhiều thời gian và nỗ lực": "<strong>đòi hỏi nhiều thời gian và nỗ lực</strong>",
    "ít phù hợp hơn": "<strong>ít phù hợp hơn</strong>",
    "có thể gây mệt mỏi": "<strong>có thể gây mệt mỏi</strong>",
    "sự lựa chọn tốt nhất": "<strong>sự lựa chọn tốt nhất</strong>",
    
    # Part 02 B2
    "tập thể dục thể thao": "<strong>tập thể dục thể thao</strong>",
    "duy trì sự năng động về thể chất": "<strong>duy trì sự năng động về thể chất</strong>",
    "những cảm xúc tiêu cực": "<strong>những cảm xúc tiêu cực</strong>",
    "hoạt động giải trí": "<strong>hoạt động giải trí</strong>",
    "cải thiện tâm trạng": "<strong>cải thiện tâm trạng</strong>",
    "tăng cường mức năng lượng": "<strong>tăng cường mức năng lượng</strong>",
    "cảm thấy hạnh phúc hơn": "<strong>cảm thấy hạnh phúc hơn</strong>",
    "đòi hỏi sự tập trung": "<strong>đòi hỏi sự tập trung</strong>",
    "cảm thấy mệt mỏi hơn": "<strong>cảm thấy mệt mỏi hơn</strong>",
    "ảnh hưởng đến lịch học": "<strong>ảnh hưởng đến lịch học</strong>",
    
    # Part 03 B1
    "lợi ích của việc sống một mình đối với sinh viên": "<strong>lợi ích của việc sống một mình đối với sinh viên</strong>",
    "sinh viên có thể trở nên độc lập hơn": "<strong>sinh viên có thể trở nên độc lập hơn</strong>",
    "tự chăm sóc bản thân": "<strong>tự chăm sóc bản thân</strong>",
    "tự đưa ra quyết định": "<strong>tự đưa ra quyết định</strong>",
    "phát triển các kỹ năng sống quan trọng": "<strong>phát triển các kỹ năng sống quan trọng</strong>",
    "sinh viên có thể tận hưởng nhiều tự do hơn": "<strong>sinh viên có thể tận hưởng nhiều tự do hơn</strong>",
    "tự mình quản lý thời gian và các hoạt động hàng ngày": "<strong>tự mình quản lý thời gian và các hoạt động hàng ngày</strong>",
    "sống theo cách họ muốn": "<strong>sống theo cách họ muốn</strong>",
    "sống một mình có thể rất yên bình": "<strong>sống một mình có thể rất yên bình</strong>",
    "học tập và thư giãn mà không bị người khác làm phiền": "<strong>học tập và thư giãn mà không bị người khác làm phiền</strong>",
    "tập trung tốt hơn": "<strong>tập trung tốt hơn</strong>",
    "muốn độc lập và tự do hơn": "<strong>muốn độc lập và tự do hơn</strong>",
    "chọn sống một mình": "<strong>chọn sống một mình</strong>",
    "đắt đỏ": "<strong>đắt đỏ</strong>",
    "đôi khi cảm thấy cô đơn": "<strong>đôi khi cảm thấy cô đơn</strong>",
    "có thể không phù hợp với tất cả mọi người": "<strong>có thể không phù hợp với tất cả mọi người</strong>",
    "nhiều sinh viên học xa nhà hơn": "<strong>nhiều sinh viên học xa nhà hơn</strong>",
    "chọn sống một mình gần trường học của họ": "<strong>chọn sống một mình gần trường học của họ</strong>",

    # Part 03 B2
    "giúp sinh viên trở nên độc lập hơn": "<strong>giúp sinh viên trở nên độc lập hơn</strong>",
    "quản lý các hoạt động hàng ngày của họ": "<strong>quản lý các hoạt động hàng ngày của họ</strong>",
    "tự mình đưa ra quyết định": "<strong>tự mình đưa ra quyết định</strong>",
    "mang lại cho sinh viên nhiều tự do hơn": "<strong>mang lại cho sinh viên nhiều tự do hơn</strong>",
    "sắp xếp lịch trình của mình": "<strong>sắp xếp lịch trình của mình</strong>",
    "chọn lối sống riêng của họ": "<strong>chọn lối sống riêng của họ</strong>",
    "dành thời gian theo cách họ muốn": "<strong>dành thời gian theo cách họ muốn</strong>",
    "cung cấp một môi trường yên bình": "<strong>cung cấp một môi trường yên bình</strong>",
    "tập trung hiệu quả hơn vào việc học của họ": "<strong>tập trung hiệu quả hơn vào việc học của họ</strong>",
    
    "ngày càng trở nên phổ biến đối với sinh viên": "<strong>ngày càng trở nên phổ biến đối với sinh viên</strong>",
    "chuyển đến các thành phố khác nhau để học tập": "<strong>chuyển đến các thành phố khác nhau để học tập</strong>",
    "chọn sống độc lập": "<strong>chọn sống độc lập</strong>",
    "cảm thấy cô đơn": "<strong>cảm thấy cô đơn</strong>",
    "tự mình xử lý tất cả các công việc nhà": "<strong>tự mình xử lý tất cả các công việc nhà</strong>",
    "khá đắt đỏ": "<strong>khá đắt đỏ</strong>",
    "ngày càng có nhiều sinh viên sống một mình": "<strong>ngày càng có nhiều sinh viên sống một mình</strong>",
    "nhiều cơ hội giáo dục ở các thành phố khác nhau hơn so với trước đây": "<strong>nhiều cơ hội giáo dục ở các thành phố khác nhau hơn so với trước đây</strong>",
    "chuyển đi xa gia đình để học tập": "<strong>chuyển đi xa gia đình để học tập</strong>"
}

for k, v in replacements.items():
    html = html.replace(k, v)

# Fix double strong tags if any
html = html.replace("<strong><strong>", "<strong>").replace("</strong></strong>", "</strong>")

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Patched Vietnamese bolds for test 2")
