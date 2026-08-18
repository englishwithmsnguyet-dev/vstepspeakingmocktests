import re
import os
import shutil
from bs4 import BeautifulSoup

root_dir = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS'
test_dir = os.path.join(root_dir, 'test 12')
html_path = os.path.join(test_dir, 'test12-index.html')

shutil.copy(os.path.join(root_dir, 'test 1', 'app.js'), os.path.join(test_dir, 'app.js'))
shutil.copy(os.path.join(root_dir, 'test 1', 'styles.css'), os.path.join(test_dir, 'styles.css'))

with open('test12_format.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

answers = []
current_level = None
current_html_paragraphs = []

def finish_answer():
    global current_level, current_html_paragraphs
    if current_level and current_html_paragraphs:
        html_text = "<br><br>".join(current_html_paragraphs)
        answers.append({'html': html_text})
        current_html_paragraphs = []
    current_level = None

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    if line.endswith('LEVEL'):
        finish_answer()
        current_level = line
    elif (line.startswith('[_|') or line.startswith('[B|')) and current_level and 'LEVEL' not in line:
        runs = line.split(' | ')
        html_parts = []
        for r in runs:
            m = re.match(r'\[([B_])\|([0-9A-F]+|None)\] (.*)', r)
            if m:
                is_bold = m.group(1) == 'B'
                color = m.group(2)
                text = m.group(3)
                if is_bold and color != 'None':
                    html_parts.append(f'<strong style="color: #{color.lower()};">{text}</strong>')
                elif is_bold:
                    html_parts.append(f'<strong>{text}</strong>')
                else:
                    html_parts.append(text)
            else:
                html_parts.append(r)
        
        p_text = "".join(html_parts)
        p_text = p_text.replace(" .", ".").replace(" ,", ",").replace(" ’ s", "’s").replace(" ' s", "'s")
        p_text = p_text.replace(" ?", "?").replace(" !", "!")
        
        clean_text = re.sub(r'<[^>]+>', '', p_text).strip()
        if clean_text and clean_text[0].isdigit() and ". " in clean_text[:5]:
            finish_answer()
        elif clean_text.startswith("PART ") or clean_text.startswith("Let's talk about") or clean_text.startswith("SITUATION") or clean_text.startswith("TOPIC"):
            finish_answer()
        elif clean_text == "FOLLOW-UP QUESTIONS":
            finish_answer()
        else:
            current_html_paragraphs.append(p_text)

finish_answer()

# Provide automatic bolding/coloring for English text
def auto_format_english(html):
    reds = [
        "choose a topic for my presentation", "go for environmental programs",
        "technology increases efficiency", "technology supports communication",
        "technology offers flexible working styles", "technology helps people access information instantly",
        "positive effects of technology on people's working habits",
        "technology has influenced people's working habits in many positive ways",
        "technology has several positive effects on people's working habits"
    ]
    blues = [
        "an educational topic", "learn more about environmental problems and possible solutions",
        "raise awareness of environmental protection", "gain useful knowledge",
        "a meaningful topic", "encourages people to protect the environment",
        "inspire them to take part in environmental activities", "make positive changes in their daily lives",
        "helps people understand environmental issues and their impact on society",
        "learn practical ways to protect the environment", "become more aware of environmental problems",
        "encourages people to take action and contribute to the community",
        "small actions can make a positive difference", "inspire positive changes",
        "completed more quickly with the help of computers and software", "be more productive",
        "easily communicate through emails, messaging applications, and online meetings",
        "teamwork becomes more effective", "work remotely and access their tasks from different locations",
        "maintain a better work-life balance", "quickly find the information they need to complete their tasks",
        "decision-making and problem-solving become easier", "work remotely and access information from different locations",
        "balance their work and personal lives more effectively",
        "easily connect with colleagues through emails, messaging apps, and online meetings",
        "collaborate more efficiently", "completed faster with the help of digital tools and software",
        "improve their productivity at work",
        "complete tasks more quickly and communicate more easily", "access information instantly",
        "complete tasks more quickly and access information instantly", "work more efficiently than before",
        "basic computer skills and problem-solving skills", "willing to learn new technologies",
        "basic computer and digital skills", "know how to use online communication and collaboration tools",
        "problem-solving skills can help them adapt to new technologies", "make work faster and more convenient",
        "create new opportunities for employees", "automate routine tasks and save time",
        "focus on more important and creative work",
        
        # Missing from Part 1
        "beautiful beaches", "delicious food", "friendly people",
        "stunning beaches", "excellent cuisine", "relaxing atmosphere",
        "meeting my teacher and classmates", "nervous but also excited",
        "arriving with my parents", "feeling both nervous and excited", "important milestone in my childhood",
        "remember important moments in our lives", "remind us of happy experiences",
        "shape who we are", "help us learn from past experiences", "provide comfort and motivation during difficult times",
        "take photos and keep them on my phone", "write about special events in a notebook",
        "taking photographs and storing them digitally", "write short notes about meaningful experiences"
    ]
    greens = [
        "local music", "it may not be useful for everyone",
        "it mainly provides entertainment rather than useful information"
    ]
    purples = [
        "famous architecture", "some audience members may find it less relevant to their lives",
        "it may not be relevant to everyone in the audience"
    ]
    
    for w in reds:
        if f'>{w}<' not in html and f'="{w}"' not in html:
            html = html.replace(w, f'<strong style="color: #ee0000;">{w}</strong>')
    for w in blues:
        if f'>{w}<' not in html and f'="{w}"' not in html:
            html = html.replace(w, f'<strong style="color: #00b0f0;">{w}</strong>')
    for w in greens:
        if f'>{w}<' not in html and f'="{w}"' not in html:
            html = html.replace(w, f'<strong style="color: #70ad47;">{w}</strong>')
    for w in purples:
        if f'>{w}<' not in html and f'="{w}"' not in html:
            html = html.replace(w, f'<strong style="color: #7030a0;">{w}</strong>')
            
    # Environmental programs missed above?
    html = html.replace(' environmental programs ', ' <strong style="color: #ee0000;">environmental programs</strong> ')
    html = html.replace(' environmental programs.', ' <strong style="color: #ee0000;">environmental programs</strong>.')
    return html

for i in range(len(answers)):
    answers[i]['html'] = auto_format_english(answers[i]['html'])

translations = [
    "Tôi thường thích thăm những địa điểm mới và dành thời gian bên gia đình. Nó giúp tôi thư giãn và nạp lại năng lượng sau một khoảng thời gian bận rộn.",
    "Tôi thường thích đi du lịch, khám phá những địa điểm mới và thử các hoạt động khác nhau khi đi nghỉ. Những trải nghiệm này giúp tôi thư giãn, mở rộng tầm nhìn và tạo ra những trải nghiệm đáng nhớ cùng gia đình hoặc bạn bè.",
    "Vâng, tôi có. Tôi thích thử các món ăn địa phương vì chúng ngon và khác biệt so với thức ăn ở quê tôi. Nó cũng giúp tôi tìm hiểu thêm về văn hóa địa phương.",
    "Vâng, tôi luôn thử đồ ăn địa phương khi đi du lịch. Tôi tin rằng ẩm thực là một phần quan trọng của văn hóa một khu vực, vì vậy nó cho phép tôi có được sự hiểu biết sâu sắc hơn về các truyền thống địa phương. Ngoài ra, nó làm cho chuyến đi thêm phần thú vị và đáng nhớ.",
    "Tôi muốn trở lại thăm Đà Nẵng một lần nữa. Nơi đây có những bãi biển đẹp, đồ ăn ngon và những con người thân thiện.",
    "Tôi rất muốn trở lại thăm Đà Nẵng trong tương lai. Đó là một thành phố xinh đẹp với những bãi biển tuyệt đẹp, ẩm thực xuất sắc và bầu không khí thư giãn. Chuyến đi trước của tôi rất thú vị, vì vậy tôi muốn được trải nghiệm lại.",
    "Kỷ niệm đầu tiên của tôi về việc đi học là được gặp giáo viên và bạn cùng lớp. Tôi cảm thấy hồi hộp nhưng cũng rất hào hứng trong ngày đầu tiên của mình.",
    "Kỷ niệm đầu tiên của tôi về việc đi học là đến trường cùng bố mẹ trong ngày đầu tiên vào lớp. Tôi nhớ mình cảm thấy vừa hồi hộp vừa háo hức vì mọi thứ đều mới mẻ đối với tôi. Đó là một cột mốc quan trọng trong thời thơ ấu của tôi.",
    "Vâng, tôi có. Kỷ niệm giúp chúng ta nhớ lại những khoảnh khắc quan trọng trong cuộc sống. Chúng cũng gợi nhắc chúng ta về những trải nghiệm vui vẻ.",
    "Vâng, tôi tin rằng kỷ niệm là rất quan trọng vì chúng định hình con người chúng ta và giúp chúng ta học hỏi từ những trải nghiệm trong quá khứ. Ngoài ra, những kỷ niệm tích cực có thể mang lại sự an ủi và động lực trong những lúc khó khăn.",
    "Tôi thường chụp ảnh và lưu chúng trên điện thoại. Đôi khi, tôi cũng viết về các sự kiện đặc biệt trong một cuốn sổ tay.",
    "Tôi thường lưu giữ kỷ niệm của mình bằng cách chụp ảnh và lưu trữ chúng dưới dạng kỹ thuật số. Bên cạnh đó, thỉnh thoảng tôi viết những ghi chú ngắn về những trải nghiệm có ý nghĩa để tôi có thể nhìn lại chúng trong tương lai.",
    "À, nếu tôi phải chọn một chủ đề cho bài thuyết trình của mình, tôi sẽ chọn các chương trình môi trường.\n\nĐầu tiên, đây là một chủ đề mang tính giáo dục vì mọi người có thể tìm hiểu thêm về các vấn đề môi trường và các giải pháp khả thi. Điều này giúp nâng cao nhận thức về bảo vệ môi trường. Vì vậy, khán giả có thể thu được những kiến thức hữu ích.\n\nThứ hai, đây là một chủ đề có ý nghĩa vì nó khuyến khích mọi người bảo vệ môi trường. Nó có thể truyền cảm hứng để họ tham gia vào các hoạt động vì môi trường. Vì vậy, họ có thể tạo ra những thay đổi tích cực trong cuộc sống hàng ngày.\n\nTôi sẽ không chọn âm nhạc địa phương vì nó có thể không hữu ích cho tất cả mọi người. Về phần kiến trúc nổi tiếng, một số khán giả có thể thấy nó ít liên quan đến cuộc sống của họ.\n\nTóm lại, tôi tin rằng các chương trình môi trường là lựa chọn tốt nhất cho tình huống này.",
    "À, nếu tôi phải chọn một chủ đề cho bài thuyết trình của mình, tôi sẽ chọn các chương trình môi trường.\n\nĐầu tiên, đây là một chủ đề mang tính giáo dục vì nó giúp mọi người hiểu các vấn đề môi trường và tác động của chúng đối với xã hội. Bên cạnh đó, khán giả có thể học các cách thiết thực để bảo vệ môi trường. Bằng cách này, họ có thể trở nên nhận thức hơn về các vấn đề môi trường.\n\nThứ hai, đây là một chủ đề có ý nghĩa vì nó khuyến khích mọi người hành động và đóng góp cho cộng đồng. Hơn nữa, những hành động nhỏ có thể tạo ra một sự khác biệt tích cực. Kết quả là, bài thuyết trình có thể truyền cảm hứng cho những thay đổi tích cực.\n\nTôi sẽ không chọn âm nhạc địa phương vì nó chủ yếu cung cấp sự giải trí thay vì thông tin hữu ích. Về phần kiến trúc nổi tiếng, nó ít phù hợp hơn vì nó có thể không liên quan đến tất cả mọi người trong khán giả.\n\nTóm lại, tôi tin rằng các chương trình môi trường là lựa chọn tốt nhất cho bài thuyết trình này.",
    "Công nghệ đã ảnh hưởng đến thói quen làm việc của mọi người theo nhiều cách.\n\nMột tác động lớn là công nghệ làm tăng hiệu suất. Nhiều nhiệm vụ giờ đây có thể được hoàn thành nhanh chóng hơn với sự hỗ trợ của máy tính và phần mềm. Kết quả là, nhân viên có thể làm việc năng suất hơn.\n\nMột tác động tích cực khác là công nghệ hỗ trợ giao tiếp. Mọi người có thể dễ dàng giao tiếp thông qua email, ứng dụng nhắn tin và các cuộc họp trực tuyến. Do đó, làm việc nhóm trở nên hiệu quả hơn.\n\nMột lợi ích nữa là công nghệ mang lại phong cách làm việc linh hoạt. Nhân viên có thể làm việc từ xa và truy cập công việc của họ từ các địa điểm khác nhau. Điều này giúp họ duy trì sự cân bằng tốt hơn giữa công việc và cuộc sống.\n\nMột tác động nữa là công nghệ giúp mọi người tiếp cận thông tin ngay lập tức. Người lao động có thể nhanh chóng tìm thấy thông tin họ cần để hoàn thành nhiệm vụ. Kết quả là, việc ra quyết định và giải quyết vấn đề trở nên dễ dàng hơn.\n\nTóm lại, công nghệ đã ảnh hưởng đến thói quen làm việc của con người theo nhiều cách tích cực, như đã đề cập ở trên.",
    "Có một số tác động tích cực của công nghệ đối với thói quen làm việc của mọi người.\n\nMột tác động tích cực lớn là công nghệ mang lại phong cách làm việc linh hoạt. Nhân viên có thể làm việc từ xa và truy cập thông tin từ các địa điểm khác nhau. Kết quả là, họ có thể cân bằng giữa công việc và cuộc sống cá nhân hiệu quả hơn.\n\nMột tác động có lợi khác là công nghệ hỗ trợ giao tiếp. Mọi người có thể dễ dàng kết nối với đồng nghiệp thông qua email, ứng dụng nhắn tin và các cuộc họp trực tuyến. Điều này giúp các nhóm hợp tác hiệu quả hơn.\n\nMột tác động tích cực nữa là công nghệ làm tăng hiệu suất. Nhiều nhiệm vụ có thể được hoàn thành nhanh hơn với sự trợ giúp của các công cụ và phần mềm kỹ thuật số. Do đó, nhân viên có thể cải thiện năng suất của họ tại nơi làm việc.\n\nTóm lại, công nghệ có một số tác động tích cực đến thói quen làm việc của con người, như đã đề cập ở trên.",
    "Công nghệ giúp mọi người hoàn thành công việc nhanh hơn và giao tiếp dễ dàng hơn. Nó cũng cho phép họ truy cập thông tin ngay lập tức.",
    "Công nghệ đã làm cho công việc trở nên dễ dàng hơn theo nhiều cách. Nó giúp mọi người hoàn thành các nhiệm vụ nhanh chóng hơn và truy cập thông tin ngay lập tức. Kết quả là, nhân viên có thể làm việc hiệu quả hơn so với trước đây.",
    "Người lao động cần các kỹ năng máy tính cơ bản và kỹ năng giải quyết vấn đề. Họ cũng nên sẵn sàng học hỏi các công nghệ mới.",
    "Người lao động cần các kỹ năng máy tính và kỹ thuật số cơ bản. Họ cũng nên biết cách sử dụng các công cụ giao tiếp và cộng tác trực tuyến. Ngoài ra, kỹ năng giải quyết vấn đề có thể giúp họ thích ứng với các công nghệ mới.",
    "Vâng, tôi nghĩ vậy. Công nghệ sẽ tiếp tục làm cho công việc nhanh chóng và thuận tiện hơn. Nó cũng có thể tạo ra các cơ hội mới cho nhân viên.",
    "Vâng, tôi tin rằng công nghệ sẽ tiếp tục cải thiện thói quen làm việc. Các công nghệ mới có thể giúp tự động hóa các nhiệm vụ thường nhật và tiết kiệm thời gian. Kết quả là, nhân viên có thể có khả năng tập trung vào các công việc sáng tạo và quan trọng hơn."
]

def format_vietnamese(text):
    reds = [
        "chọn một chủ đề cho bài thuyết trình của mình", "chọn các chương trình môi trường",
        "công nghệ làm tăng hiệu suất", "công nghệ hỗ trợ giao tiếp",
        "công nghệ mang lại phong cách làm việc linh hoạt", "công nghệ giúp mọi người tiếp cận thông tin ngay lập tức",
        "tác động tích cực của công nghệ đối với thói quen làm việc",
        "công nghệ đã ảnh hưởng đến thói quen làm việc của con người theo nhiều cách tích cực",
        "công nghệ có một số tác động tích cực đến thói quen làm việc"
    ]
    blues = [
        "chủ đề mang tính giáo dục", "tìm hiểu thêm về các vấn đề môi trường và các giải pháp khả thi",
        "nâng cao nhận thức về bảo vệ môi trường", "thu được những kiến thức hữu ích",
        "chủ đề có ý nghĩa", "khuyến khích mọi người bảo vệ môi trường",
        "truyền cảm hứng để họ tham gia vào các hoạt động vì môi trường", "tạo ra những thay đổi tích cực trong cuộc sống hàng ngày",
        "hiểu các vấn đề môi trường và tác động của chúng đối với xã hội",
        "học các cách thiết thực để bảo vệ môi trường", "trở nên nhận thức hơn về các vấn đề môi trường",
        "khuyến khích mọi người hành động và đóng góp cho cộng đồng",
        "những hành động nhỏ có thể tạo ra một sự khác biệt tích cực", "truyền cảm hứng cho những thay đổi tích cực",
        "hoàn thành nhanh chóng hơn với sự hỗ trợ của máy tính và phần mềm", "làm việc năng suất hơn",
        "dễ dàng giao tiếp thông qua email, ứng dụng nhắn tin và các cuộc họp trực tuyến",
        "làm việc nhóm trở nên hiệu quả hơn", "làm việc từ xa và truy cập công việc của họ từ các địa điểm khác nhau",
        "duy trì sự cân bằng tốt hơn giữa công việc và cuộc sống", "nhanh chóng tìm thấy thông tin họ cần để hoàn thành nhiệm vụ",
        "việc ra quyết định và giải quyết vấn đề trở nên dễ dàng hơn", "làm việc từ xa và truy cập thông tin từ các địa điểm khác nhau",
        "cân bằng giữa công việc và cuộc sống cá nhân hiệu quả hơn",
        "dễ dàng kết nối với đồng nghiệp thông qua email, ứng dụng nhắn tin và các cuộc họp trực tuyến",
        "hợp tác hiệu quả hơn", "hoàn thành nhanh hơn với sự trợ giúp của các công cụ và phần mềm kỹ thuật số",
        "cải thiện năng suất của họ tại nơi làm việc",
        "hoàn thành công việc nhanh hơn và giao tiếp dễ dàng hơn", "truy cập thông tin ngay lập tức",
        "hoàn thành các nhiệm vụ nhanh chóng hơn và truy cập thông tin ngay lập tức", "làm việc hiệu quả hơn so với trước đây",
        "kỹ năng máy tính cơ bản và kỹ năng giải quyết vấn đề", "sẵn sàng học hỏi các công nghệ mới",
        "kỹ năng máy tính và kỹ thuật số cơ bản", "biết cách sử dụng các công cụ giao tiếp và cộng tác trực tuyến",
        "kỹ năng giải quyết vấn đề có thể giúp họ thích ứng với các công nghệ mới", "làm cho công việc nhanh chóng và thuận tiện hơn",
        "tạo ra các cơ hội mới cho nhân viên", "tự động hóa các nhiệm vụ thường nhật và tiết kiệm thời gian",
        "tập trung vào các công việc sáng tạo và quan trọng hơn",
        
        # Missing from Part 1
        "thăm những địa điểm mới", "dành thời gian bên gia đình",
        "thư giãn", "nạp lại năng lượng sau một khoảng thời gian bận rộn",
        "khám phá những địa điểm mới", "thử các hoạt động khác nhau",
        "mở rộng tầm nhìn", "tạo ra những trải nghiệm đáng nhớ cùng gia đình hoặc bạn bè",
        "thử các món ăn địa phương", "ngon và khác biệt so với thức ăn ở quê tôi",
        "tìm hiểu thêm về văn hóa địa phương", "phần quan trọng của văn hóa một khu vực",
        "hiểu biết sâu sắc hơn về các truyền thống địa phương", "thêm phần thú vị và đáng nhớ",
        "bãi biển đẹp", "đồ ăn ngon", "con người thân thiện",
        "bãi biển tuyệt đẹp", "ẩm thực xuất sắc", "bầu không khí thư giãn",
        "gặp giáo viên và bạn cùng lớp", "hồi hộp nhưng cũng rất hào hứng",
        "đến trường cùng bố mẹ", "vừa hồi hộp vừa háo hức", "cột mốc quan trọng trong thời thơ ấu của tôi",
        "nhớ lại những khoảnh khắc quan trọng trong cuộc sống", "gợi nhắc chúng ta về những trải nghiệm vui vẻ",
        "định hình con người chúng ta", "học hỏi từ những trải nghiệm trong quá khứ",
        "mang lại sự an ủi và động lực trong những lúc khó khăn",
        "chụp ảnh và lưu chúng trên điện thoại", "viết về các sự kiện đặc biệt trong một cuốn sổ tay",
        "chụp ảnh và lưu trữ chúng dưới dạng kỹ thuật số", "viết những ghi chú ngắn về những trải nghiệm có ý nghĩa"
    ]
    greens = [
        "âm nhạc địa phương", "không hữu ích cho tất cả mọi người",
        "chủ yếu cung cấp sự giải trí thay vì thông tin hữu ích"
    ]
    purples = [
        "kiến trúc nổi tiếng", "ít liên quan đến cuộc sống của họ",
        "không liên quan đến tất cả mọi người trong khán giả"
    ]
    
    for w in reds:
        text = text.replace(w, f'<strong style="color: #ee0000;">{w}</strong>')
    for w in greens:
        text = text.replace(w, f'<strong style="color: #70ad47;">{w}</strong>')
    for w in purples:
        text = text.replace(w, f'<strong style="color: #7030a0;">{w}</strong>')
    for w in blues:
        if f'>{w}<' not in text and f'="{w}"' not in text:
            text = text.replace(w, f'<strong style="color: #00b0f0;">{w}</strong>')
            
    text = text.replace(' các chương trình môi trường ', ' <strong style="color: #ee0000;">các chương trình môi trường</strong> ')
    text = text.replace(' các chương trình môi trường.', ' <strong style="color: #ee0000;">các chương trình môi trường</strong>.')
    
    return f'<div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div><div class="translation-text" style="display: none; white-space: pre-line;">{text}</div>'

with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

level_contents = soup.find_all('div', class_='level-content')

for i, lc in enumerate(level_contents):
    if i >= len(answers):
        break
    eng_html = answers[i]['html']
    viet_html = format_vietnamese(translations[i])
    
    # insert TTS button if missing from original text
    lc.clear()
    
    eng_soup = BeautifulSoup(eng_html, 'html.parser')
    lc.append(eng_soup)
    
    viet_soup = BeautifulSoup(viet_html, 'html.parser')
    lc.append(viet_soup)

# Add TTS buttons using regex replace on HTML output
html_output = str(soup)

html_output = re.sub(
    r'(<span class="level-badge b1">B1 LEVEL</span>)',
    r'\1\n                                        <button class="tts-play-btn" onclick="playTTS(this)"><i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu</button>',
    html_output
)

html_output = re.sub(
    r'(<span class="level-badge b2">B2 LEVEL</span>)',
    r'\1\n                                        <button class="tts-play-btn" onclick="playTTS(this)"><i class="fa-solid fa-volume-high"></i> Nghe đọc mẫu</button>',
    html_output
)

html_output = html_output.replace('\\"', '"')

html_output = re.sub(
    r'<strong[^>]*>it</strong>\s*<strong[^>]*>[’\']</strong>\s*<strong[^>]*>s\s*',
    r'<strong style="color: #00b0f0;">it’s ',
    html_output
)
html_output = re.sub(
    r'<strong>do</strong>\s*<strong[^>]*>n[’\']</strong>\s*<strong[^>]*>t\s*',
    r'<strong>don’t ',
    html_output
)
html_output = re.sub(
    r'<strong[^>]*>don</strong>\s*<strong[^>]*>[’\']</strong>\s*<strong[^>]*>t\s*',
    r'<strong style="color: #00b0f0;">don’t ',
    html_output
)

def merge_strong_space(match):
    style1 = match.group(1) or ""
    text1 = match.group(2)
    space = match.group(3)
    style2 = match.group(4) or ""
    text2 = match.group(5)
    if style1 == style2:
        if style1:
            return f'<strong {style1}>{text1}{space}{text2}</strong>'
        else:
            return f'<strong>{text1}{space}{text2}</strong>'
    return match.group(0)

def merge_strong_nospace(match):
    style1 = match.group(1) or ""
    text1 = match.group(2)
    style2 = match.group(3) or ""
    text2 = match.group(4)
    if style1 == style2:
        if style1:
            return f'<strong {style1}>{text1}{text2}</strong>'
        else:
            return f'<strong>{text1}{text2}</strong>'
    return match.group(0)

pattern_space = re.compile(r'<strong(?: (style="[^"]+"))?>([^<]*)</strong>(\s+)<strong(?: (style="[^"]+"))?>([^<]*)</strong>')
pattern_nospace = re.compile(r'<strong(?: (style="[^"]+"))?>([^<]*)</strong><strong(?: (style="[^"]+"))?>([^<]*)</strong>')

prev_html = ""
while html_output != prev_html:
    prev_html = html_output
    html_output = pattern_space.sub(merge_strong_space, html_output)
    
prev_html = ""
while html_output != prev_html:
    prev_html = html_output
    html_output = pattern_nospace.sub(merge_strong_nospace, html_output)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_output)

print("Successfully updated test12-index.html")
