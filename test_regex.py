import re
text = 'Có một số lý do tại sao trách nhiệm lại quan trọng.<br><br>Một lý do chính là tinh thần trách nhiệm giúp mọi người đạt được kết quả tốt hơn.'
sentences = re.split(r'(?<=\.)\s+', text)
print(sentences)
