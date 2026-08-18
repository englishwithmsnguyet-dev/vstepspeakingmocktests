import re
import json
import sys

# Load test1_format.txt
with open('test1_format.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

answers = []
current_level = None
current_answer_runs = []

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    if line.endswith('LEVEL'):
        current_level = line
        current_answer_runs = []
    elif line.startswith('[') and current_level:
        # Parse runs
        # Format: [_|None] text | [B|00B0F0] text
        runs = line.split(' | ')
        html_parts = []
        bold_texts = []
        for r in runs:
            m = re.match(r'\[([B_])\|([0-9A-F]+|None)\] (.*)', r)
            if m:
                is_bold = m.group(1) == 'B'
                color = m.group(2)
                text = m.group(3)
                
                if is_bold and color != 'None':
                    html_parts.append(f'<strong style="color: #{color.lower()};">{text}</strong>')
                    bold_texts.append(text)
                elif is_bold:
                    html_parts.append(f'<strong>{text}</strong>')
                    bold_texts.append(text)
                else:
                    html_parts.append(text)
            else:
                html_parts.append(r)
        
        # some cleanup of punctuation spaces
        html_text = "".join(html_parts)
        html_text = html_text.replace(" .", ".").replace(" ,", ",").replace(" ’ s", "’s")
        
        answers.append({
            'level': current_level,
            'html': html_text,
            'bolds': bold_texts
        })
        current_level = None

# Print the extracted html answers
for i, ans in enumerate(answers):
    print(f"Ans {i} ({ans['level']}): {ans['html']}")
    print(f"Bolds: {ans['bolds']}")
    print("-" * 40)
