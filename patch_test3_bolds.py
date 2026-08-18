import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 3/test03-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

replacements = {
    # Part 03 B2 Topic
    "bất lợi": "<strong>bất lợi</strong>",
    "nuôi giữ động vật trong vườn thú": "<strong>nuôi giữ động vật trong vườn thú</strong>",
    "thiếu không gian": "<strong>thiếu không gian</strong>",
    "nhỏ hơn nhiều": "<strong>nhỏ hơn nhiều</strong>",
    "không thể di chuyển tự do hoặc hành xử tự nhiên": "<strong>không thể di chuyển tự do hoặc hành xử tự nhiên</strong>",
    "mất tự do": "<strong>mất tự do</strong>",
    "không thể tự chọn nơi ở hoặc tìm kiếm thức ăn": "<strong>không thể tự chọn nơi ở hoặc tìm kiếm thức ăn</strong>",
    "ảnh hưởng đến sức khỏe và hành vi tự nhiên": "<strong>ảnh hưởng đến sức khỏe và hành vi tự nhiên</strong>",
    "thiếu các kỹ năng sinh tồn": "<strong>thiếu các kỹ năng sinh tồn</strong>",
    "không cần phải săn bắt hay tự bảo vệ mình": "<strong>không cần phải săn bắt hay tự bảo vệ mình</strong>",
    "khó khăn để sinh tồn nếu được thả về tự nhiên": "<strong>khó khăn để sinh tồn nếu được thả về tự nhiên</strong>",
    
    # Follow ups
    "bảo vệ các loài có nguy cơ tuyệt chủng thông qua các chương trình bảo tồn": "<strong>bảo vệ các loài có nguy cơ tuyệt chủng thông qua các chương trình bảo tồn</strong>",
    "cung cấp các cơ hội giáo dục cho du khách": "<strong>cung cấp các cơ hội giáo dục cho du khách</strong>",
    "hỗ trợ nghiên cứu khoa học": "<strong>hỗ trợ nghiên cứu khoa học</strong>",
    "bảo tồn môi trường sống tự nhiên": "<strong>bảo tồn môi trường sống tự nhiên</strong>",
    "tránh mua các sản phẩm làm từ động vật có nguy cơ tuyệt chủng": "<strong>tránh mua các sản phẩm làm từ động vật có nguy cơ tuyệt chủng</strong>",
    "hỗ trợ các tổ chức bảo tồn": "<strong>hỗ trợ các tổ chức bảo tồn</strong>"
}

for k, v in replacements.items():
    html = html.replace(k, v)

# Fix double strong tags if any
html = html.replace("<strong><strong>", "<strong>").replace("</strong></strong>", "</strong>")

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Patched Vietnamese bolds for test 3")
