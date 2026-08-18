import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 2/test02-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

replacements = {
    # Part 03 B2 Topic Translation
    "cung cấp một môi trường yên bình": "<strong>cung cấp một môi trường yên bình</strong>",
    "tập trung vào việc học": "<strong>tập trung vào việc học</strong>",
    "mang lại cho sinh viên sự tự do lớn hơn": "<strong>mang lại cho sinh viên sự tự do lớn hơn</strong>",
    "tự đưa ra quyết định, tổ chức lịch trình": "<strong>tự đưa ra quyết định, tổ chức lịch trình</strong>",
    "xây dựng tính độc lập và trách nhiệm": "<strong>xây dựng tính độc lập và trách nhiệm</strong>",
    "tự mình xử lý các công việc hàng ngày": "<strong>tự mình xử lý các công việc hàng ngày</strong>",
    "quản lý thời gian một cách khôn ngoan": "<strong>quản lý thời gian một cách khôn ngoan</strong>",
    "tổ chức lịch trình của mình một cách cẩn thận": "<strong>tổ chức lịch trình của mình một cách cẩn thận</strong>",
    "mang lại một số lợi thế quan trọng": "<strong>mang lại một số lợi thế quan trọng</strong>",

    # B2 Part 03 Question 1
    "sự riêng tư và độc lập lớn hơn": "<strong>sự riêng tư và độc lập lớn hơn</strong>",
    # B2 Part 03 Question 2
    "tự mình gánh vác mọi trách nhiệm": "<strong>tự mình gánh vác mọi trách nhiệm</strong>",
    # B2 Part 03 Question 3
    "chuyển đi xa nhà": "<strong>chuyển đi xa nhà</strong>"
}

for k, v in replacements.items():
    html = html.replace(k, v)

# Fix double strong tags if any
html = html.replace("<strong><strong>", "<strong>").replace("</strong></strong>", "</strong>")

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Patched more Vietnamese bolds")
