import re

html = '<div class="translation-text" style="white-space: normal;" style="display: none;">Có một số giải pháp để giảm béo phì. Một giải pháp chính là hạn chế tiêu thụ thức ăn nhanh.</div>'

def strip_strong_in_trans(m):
    content = m.group(2)
    content = re.sub(r'<strong[^>]*>', '', content)
    content = content.replace('</strong>', '')
    return f'<div class="translation-text"{m.group(1)}>{content}</div>'

working_block = re.sub(r'<div class="translation-text"([^>]*)>(.*?)</div>', strip_strong_in_trans, html, flags=re.DOTALL)
print("After strip:", working_block)

def simple_format(m):
    content = m.group(2)
    print("FOUND TRANSLATION BLOCK! Length:", len(content))
    return f'<div class="translation-text"{m.group(1)}>{content}</div>'
    
working_block = re.sub(r'<div class="translation-text"([^>]*)>(.*?)</div>', simple_format, working_block, flags=re.DOTALL)
print("After format:", working_block)
