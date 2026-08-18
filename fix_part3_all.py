import os
import re

def process_file(test_num):
    file_path = f'/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test {test_num}/test{test_num:02d}-index.html'
    if not os.path.exists(file_path):
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. NEWLINES RESTORATION (Part 3)
    
    replacements = {
        # English missing transition markers
        "One major advantage is that": "<br/><br/>One major advantage is that",
        "Another positive aspect is that": "<br/><br/>Another positive aspect is that",
        "One more beneficial effect is that": "<br/><br/>One more beneficial effect is that",
        "One major disadvantage is that": "<br/><br/>One major disadvantage is that",
        "Another drawback is that": "<br/><br/>Another drawback is that",
        "One more harmful effect is that": "<br/><br/>One more harmful effect is that",
        "One negative effect is that": "<br/><br/>One negative effect is that",
        "Another negative effect is that": "<br/><br/>Another negative effect is that",
        "One major solution is to": "<br/><br/>One major solution is to",
        "Another effective solution is to": "<br/><br/>Another effective solution is to",
        "One more solution is to": "<br/><br/>One more solution is to",
        "One additional solution is to": "<br/><br/>One additional solution is to",
        "One reason is that": "<br/><br/>One reason is that",
        "Another reason is that": "<br/><br/>Another reason is that",

        # Vietnamese missing transition markers
        "Một ưu điểm chính là": "<br/><br/>Một ưu điểm chính là",
        "Một khía cạnh tích cực khác là": "<br/><br/>Một khía cạnh tích cực khác là",
        "Một tác dụng có lợi nữa là": "<br/><br/>Một tác dụng có lợi nữa là",
        "Một lợi ích chính là": "<br/><br/>Một lợi ích chính là",
        "Một điểm tích cực khác là": "<br/><br/>Một điểm tích cực khác là",
        "Một lợi ích nữa là": "<br/><br/>Một lợi ích nữa là",
        "Một bất lợi chính là": "<br/><br/>Một bất lợi chính là",
        "Một nhược điểm khác là": "<br/><br/>Một nhược điểm khác là",
        "Một tác hại nữa là": "<br/><br/>Một tác hại nữa là",
        "Một hạn chế chính là": "<br/><br/>Một hạn chế chính là",
        "Một tác động tiêu cực là": "<br/><br/>Một tác động tiêu cực là",
        "Một tác động tiêu cực khác là": "<br/><br/>Một tác động tiêu cực khác là",
        "Một tác động tiêu cực bổ sung là": "<br/><br/>Một tác động tiêu cực bổ sung là",
        "Một giải pháp chính là": "<br/><br/>Một giải pháp chính là",
        "Một giải pháp hiệu quả khác là": "<br/><br/>Một giải pháp hiệu quả khác là",
        "Một giải pháp nữa là": "<br/><br/>Một giải pháp nữa là",
        "Một giải pháp bổ sung là": "<br/><br/>Một giải pháp bổ sung là",
        "Một lý do chính là": "<br/><br/>Một lý do chính là",
        "Một lý do khác là": "<br/><br/>Một lý do khác là",
        "Một lý do nữa là": "<br/><br/>Một lý do nữa là",
        "Một lý do bổ sung là": "<br/><br/>Một lý do bổ sung là",
        "Tóm lại,": "<br/><br/>Tóm lại,",
        "In short,": "<br/><br/>In short,"
    }

    # Apply only to Part 3 section to avoid touching instructions or other parts
    part3_start = html.find('<!-- Panel Part 3 -->')
    if part3_start != -1:
        part4_end = html.find('<!-- Panel Part 4 -->')
        if part4_end == -1:
            part4_end = len(html)
            
        working_block = html[part3_start:part4_end]
        
        for k, v in replacements.items():
            # Match optional space or <br/> tags before k, and replace with <br/><br/>k
            working_block = re.sub(r'(?:<br\s*/?>|\s)*' + re.escape(k), v, working_block)
            
        html = html[:part3_start] + working_block + html[part4_end:]
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html)
        
    print(f"Processed newlines for Test {test_num}")

for i in range(6, 11):
    process_file(i)

