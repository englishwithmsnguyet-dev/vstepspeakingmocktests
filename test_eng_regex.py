import re

text = 'Well, if I had to suggest a place for my friend to study, I would recommend a <strong style="color: #00b0f0;">library</strong>.'

def color_eng_opening(m):
    situation = m.group(1)
    choice = m.group(2)
    situation = re.sub(r'<[^>]+>', '', situation)
    choice = re.sub(r'<[^>]+>', '', choice)
    return f'Well, if I had to <strong style="color: #ee0000;">{situation}</strong>, I would <strong style="color: #ee0000;">{choice}</strong>.'

res = re.sub(r'Well, if I had to (.*?), I would (.*?)\.', color_eng_opening, text)
print(res)

