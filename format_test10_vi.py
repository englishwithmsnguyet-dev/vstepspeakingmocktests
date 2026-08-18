import re

file_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 10/test10-index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

replacements = [
    "giải pháp để giảm béo phì",
    "hạn chế tiêu thụ thức ăn nhanh",
    "Thức ăn nhanh",
    "thức ăn nhanh",
    "chất béo, đường và calo",
    "duy trì cân nặng hợp lý",
    "tự nấu ăn tại nhà",
    "Bữa ăn tự nấu",
    "nguyên liệu tươi sạch",
    "kiểm soát khẩu phần ăn",
    "thói quen ăn uống lành mạnh hơn",
    "chế độ ăn uống cân bằng",
    "rau xanh, trái cây và protein",
    "ngăn ngừa tăng cân",
    "tập thể dục thường xuyên",
    "Các hoạt động thể chất",
    "đốt cháy calo",
    "cải thiện thể lực",
    "lối sống lành mạnh",
    
    # For B2
    "giải pháp để giảm tỷ lệ béo phì",
    "calo, chất béo và đường",
    "duy trì cân nặng lành mạnh hơn",
    "nấu ăn tại nhà",
    "chuẩn bị bữa ăn tại nhà",
    "nguyên liệu tốt cho sức khỏe",
    "kiểm soát giá trị dinh dưỡng",
    "thói quen ăn uống tốt hơn",
    "cải thiện sức khỏe tổng thể",
    "thực phẩm giàu dinh dưỡng",
    "rau, trái cây và protein nạc",
    "nhận được các chất dinh dưỡng cần thiết",
    "nạp quá nhiều calo",
    "duy trì hoạt động thể chất",
    "sức khỏe cảm xúc"
]

sorted_reps = sorted(replacements, key=len, reverse=True)

part3_start = html.find('<!-- Panel Part 3 -->')
part4_end = html.find('<!-- Panel Part 4 -->')
if part4_end == -1:
    part4_end = len(html)

if part3_start != -1:
    working_block = html[part3_start:part4_end]
    
    def strip_strong_in_trans(m):
        content = m.group(2)
        content = re.sub(r'<strong[^>]*>', '', content)
        content = content.replace('</strong>', '')
        return f'<div class="translation-text"{m.group(1)}>{content}</div>'
    
    working_block = re.sub(r'<div class="translation-text"([^>]*)>(.*?)</div>', strip_strong_in_trans, working_block, flags=re.DOTALL)
    
    def simple_format(m):
        content = m.group(2)
        for r in sorted_reps:
            content = content.replace(r, f'<strong>{r}</strong>')
        return f'<div class="translation-text"{m.group(1)}>{content}</div>'
        
    working_block = re.sub(r'<div class="translation-text"([^>]*)>(.*?)</div>', simple_format, working_block, flags=re.DOTALL)
    
    # Nested tags cleanup
    working_block = re.sub(r'<strong>(.*?)<strong>(.*?)</strong>(.*?)</strong>', r'<strong>\1\2\3</strong>', working_block)
    working_block = re.sub(r'<strong>(.*?)<strong>(.*?)</strong>(.*?)</strong>', r'<strong>\1\2\3</strong>', working_block)
    
    html = html[:part3_start] + working_block + html[part4_end:]
    
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(html)
    
print("Formatted Test 10 Vietnamese Part 3!")
