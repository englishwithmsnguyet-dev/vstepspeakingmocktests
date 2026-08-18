import re

file_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 11/test11-index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the specific Note in Part 3
note_pattern = r'<span style="color: var\(--color-red\); font-weight: normal; display: block; margin-top: 8px;">Note \(Your own idea\) → Spread kindness and help others\. <span class="sol-translation" style="display: block; margin-top: 4px; margin-left: 0;">\(Ý kiến của riêng bạn → Lan tỏa sự tử tế và giúp đỡ người khác\.\)</span></span>'
content = re.sub(note_pattern, '', content)

# Remove all TTS buttons
tts_pattern = r'<button class="tts-play-btn" onclick="playTTS\(this\)"><i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu</button>\n?'
content = re.sub(tts_pattern, '', content)

# Re-inject exactly ONE TTS button after each LEVEL badge
content = re.sub(
    r'(<span class="level-badge b1">B1 LEVEL</span>)',
    r'\1\n                                        <button class="tts-play-btn" onclick="playTTS(this)"><i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu</button>',
    content
)

content = re.sub(
    r'(<span class="level-badge b2">B2 LEVEL</span>)',
    r'\1\n                                        <button class="tts-play-btn" onclick="playTTS(this)"><i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu</button>',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Note and TTS buttons in test11-index.html")
