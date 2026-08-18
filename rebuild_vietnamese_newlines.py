import os
import sys
import json
import re

# Add scratch path to import apply_solution_updates
sys.path.append("/Users/nguyetpham/.gemini/antigravity/brain/1ea5bf29-5d28-4bea-9f3e-0f4ec95e8392/scratch")
from apply_solution_updates import translation_db

workspace_dir = "/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS"

# Define lists of key phrases to bold for Test 6, 9, 10
test_6_bolds = [
    "trip to Da Nang", "family vacation", "famous attractions", "beautiful beaches",
    "local culture", "unforgettable trip", "relax", "spend quality time",
    "trying local food", "local way of life", "traditional dishes", "more interesting and memorable",
    "visiting tourist attractions", "taking photos", "buying souvenirs", "exploring tourist attractions",
    "trying local cuisine", "taking photographs", "broaden my horizons", "plastic bottles",
    "paper products", "aluminum cans", "reduce environmental pollution", "sustainable lifestyle",
    "separate recyclable waste", "keep the environment cleaner", "sort their waste properly",
    "public awareness campaigns", "environmental education programs", "recycling bins",
    "library", "quiet bedroom", "focus better", "study more effectively", "living room",
    "crowded and noisy", "family members may interrupt", "feel sleepy", "get distracted",
    "concentrate more easily", "productive", "resources", "motivating learning atmosphere",
    "responsibility", "achieve better results", "complete tasks successfully", "earn trust",
    "build stronger relationships", "improve teamwork skills", "become more independent",
    "handle challenges more confidently", "work carefully and consistently", "respected",
    "fulfill their obligations", "contribute actively", "self-reliance", "personal growth",
    "future success", "young people", "respect their parents", "help with household chores",
    "mature", "time effectively", "responsible decisions", "education and information",
    "access to education", "social issues", "simple tasks", "independently", "accept responsibility",
    "age-appropriate tasks", "accept the consequences"
]

test_9_bolds = [
    "fail a test", "argue with my friends", "sad movie", "personal failures",
    "conflicts with close friends", "suffer in difficult situations", "listen to soft music",
    "talk to my best friend", "feel better", "listen to music", "clear my mind",
    "confide in someone I trust", "new perspective", "natural feeling", "understand our feelings",
    "happy moments", "negative emotion", "natural response", "process difficult experiences",
    "emotional resilience", "AI tools", "chatbots", "translate text", "correct my English writing",
    "language practice", "content generation", "brainstorming ideas", "check my grammar",
    "practice speaking", "available all the time", "language acquisition", "instant feedback",
    "personalized learning", "replace human teachers", "understand students' emotions",
    "support learning", "students' needs and emotions", "efficiency and convenience",
    "empathy, emotional intelligence", "provide information and grade papers", "human touch",
    "workshop", "healthy living", "nutritionist", "guest speaker", "learn about healthy eating",
    "useful advice", "improve our eating habits", "expert advice", "practical tips",
    "healthy lifestyle", "gym trainer", "physical exercise", "yoga instructor", "mental relaxation",
    "drawbacks of internships", "unpaid or low-paid", "financial problems", "heavy workload and pressure",
    "feel stressed", "limited guidance", "practical work experience", "apply what they learned",
    "prepare for future careers", "academic theory and practical work", "required before graduation",
    "develop useful skills", "gain work experience", "more attractive to employers",
    "employability", "professional network", "universities", "cooperate with companies",
    "career center", "high-quality internship", "preparatory workshops", "resume writing", "interview skills"
]

test_10_bolds = [
    "online blogs", "convenient way", "learn new information", "free time", "useful information",
    "wide range of topics", "other people's experiences", "education, travel, and health",
    "personal development", "broaden my horizons", "gain practical knowledge", "useful tips",
    "solve everyday problems", "variety of useful things", "study strategies", "travel experiences",
    "self-improvement techniques", "expand my knowledge", "wider perspective", "online course",
    "online English course", "improve my English skills", "language learning", "professional development",
    "learn at my own pace", "access materials", "convenient and flexible", "flexibility",
    "organize my study schedule", "high-quality resources", "saves both time and effort",
    "get distracted easily", "lack of face-to-face interaction", "stay focused", "distractions at home",
    "communication and collaboration", "challenging", "retiring co-worker", "picture of him with colleagues",
    "meaningful gift", "reminds him of the time", "happy moments", "unique gift", "preserves valuable memories",
    "long-lasting emotional value", "captures the relationships", "lasting keepsake", "appreciation and respect",
    "handwritten card", "meal at the best restaurant", "temporary", "solutions to reduce obesity",
    "limit fast food consumption", "fat, sugar, and calories", "maintain a healthy weight",
    "cook at home", "Home-cooked meals", "fresh ingredients", "control portion sizes",
    "healthier eating habits", "balanced diet", "vegetables, fruits, and protein", "prevent weight gain",
    "lean protein", "excessive calorie intake", "exercise regularly", "Physical activities", "burn calories",
    "improve fitness", "maintain a healthy lifestyle", "running, cycling, or playing sports",
    "physically active", "boost emotional well-being", "fast food", "Hamburgers, fried chicken, pizza, and bubble tea",
    "young people", "convenience foods", "convenient, affordable, and widely available", "saves time",
    "quick, convenient", "busy society", "health campaigns", "exercise regularly", "healthy eating habits",
    "public awareness campaigns", "nutrition education programs", "investments in sports facilities",
    "nutritious foods", "community health initiatives"
]

def clean_text(text):
    s = re.sub(r'<[^>]+>', '', text)
    s = s.lower()
    s = re.sub(r"[’'\-\(\)\.,;\?\!]", " ", s)
    s = re.sub(r'[^a-z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', '', s)
    return " ".join(s.split())

# Create normalized translation database
norm_db = {}
for key, val in translation_db.items():
    norm_key = clean_text(key)
    norm_db[norm_key] = val

# Add manual mapping for the "for example" difference
for_example_raw = "there are several benefits of having lunch at the school canteen one major advantage is that it is convenient this is because students do not need to leave the school to look for food as a result they can have lunch more easily and comfortably another positive aspect is that it is time saving since the canteen is located inside the school students can buy their meals quickly therefore they have more time to rest or prepare for their next classes one more beneficial effect is that meals at the canteen are usually cheap this means that students can enjoy lunch at reasonable prices this helps them save money one additional benefit is that students can spend more time with their friends for example they can have lunch together and chat about their studies or daily lives as a result they can build stronger relationships in short having lunch at the school canteen has several clear benefits as mentioned above"
for_example_v1 = clean_text(for_example_raw)
for_example_v2 = for_example_v1.replace("time saving", "timesaving")
for_example_val = translation_db.get("there are several benefits of having lunch at the school canteen one major advantage is that it is convenient this is because students do not need to leave the school to look for food as a result they can have lunch more easily and comfortably another positive aspect is that it is time saving since the canteen is located inside the school students can buy their meals quickly therefore they have more time to rest or prepare for their next classes one more beneficial effect is that meals at the canteen are usually cheap students can enjoy lunch at reasonable prices this helps them save money one additional benefit is that students can spend more time with their friends they can have lunch together and chat about their studies or daily lives as a result they can build stronger relationships in short having lunch at the school canteen has several clear benefits as mentioned above")
norm_db[for_example_v1] = for_example_val
norm_db[for_example_v2] = for_example_val

def apply_bolding(text, bold_terms):
    sorted_terms = sorted(bold_terms, key=len, reverse=True)
    tokens = {}
    temp_text = text
    
    for idx, term in enumerate(sorted_terms):
        pattern = re.compile(r'\b' + re.escape(term) + r'\b', re.IGNORECASE)
        matches = pattern.findall(temp_text)
        if not matches:
            pattern = re.compile(re.escape(term), re.IGNORECASE)
            matches = pattern.findall(temp_text)
            
        if matches:
            token = f"__B_T_{idx}__"
            def repl(m):
                tokens[token] = m.group(0)
                return token
            temp_text = pattern.sub(repl, temp_text)
            
    for token, original_term in tokens.items():
        temp_text = temp_text.replace(token, f"<strong>{original_term}</strong>")
        
    return temp_text

# Depth-based block finder for divs
def find_closing_div(html_text, start_pos):
    pos = start_pos
    depth = 0
    while pos < len(html_text):
        if html_text[pos:pos+4] == "<div":
            depth += 1
            pos += 4
        elif html_text[pos:pos+6] == "</div>":
            depth -= 1
            if depth == 0:
                return pos + 6
            pos += 6
        else:
            pos += 1
    return -1

def split_sentences(text):
    # Split by sentence-ending marks followed by space or end of string
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]

def map_viet_to_paragraphs(eng_paragraphs, viet_text):
    viet_sentences = split_sentences(viet_text)
    
    # Split each English paragraph to get sentence counts
    p_sentence_counts = []
    for p in eng_paragraphs:
        p_sentences = split_sentences(p)
        p_sentence_counts.append(len(p_sentences))
        
    total_eng_sentences = sum(p_sentence_counts)
    
    # Map if counts match
    if total_eng_sentences == len(viet_sentences):
        viet_paragraphs = []
        viet_idx = 0
        for count in p_sentence_counts:
            p_viet = viet_sentences[viet_idx : viet_idx + count]
            viet_idx += count
            viet_paragraphs.append(" ".join(p_viet))
        return "\n\n".join(viet_paragraphs)
    else:
        # Fallback distribution
        num_paragraphs = len(eng_paragraphs)
        if num_paragraphs == 0:
            return viet_text
        viet_paragraphs = []
        avg = len(viet_sentences) / num_paragraphs
        for i in range(num_paragraphs):
            start = int(i * avg)
            end = int((i + 1) * avg) if i < num_paragraphs - 1 else len(viet_sentences)
            viet_paragraphs.append(" ".join(viet_sentences[start:end]))
        return "\n\n".join(viet_paragraphs)

def generate_sol_html(t, headers, questions, p2_sit, p3_topic_box, answers, translations):
    title = f"SPEAKING MOCK TEST {t:02d}"
    
    # Part 1
    p1_html = f"""                            <!-- Topic 1 -->
                            <div class="sol-topic-section">
                                <div class="sol-topic-header">
                                    {headers[0]}
                                </div>
                                
                                <div class="sol-question-item">
                                    <div class="sol-question-text">{questions[0]}</div>
                                    <div class="sol-level-box level-b1">
                                        <span class="level-badge b1">B1 LEVEL</span>
                                        <div class="level-content">
                                            {answers[0]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[0]}</div>
                                        </div>
                                    </div>
                                    <div class="sol-level-box level-b2">
                                        <span class="level-badge b2">B2 LEVEL</span>
                                        <div class="level-content">
                                            {answers[1]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[1]}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="sol-question-item">
                                    <div class="sol-question-text">{questions[1]}</div>
                                    <div class="sol-level-box level-b1">
                                        <span class="level-badge b1">B1 LEVEL</span>
                                        <div class="level-content">
                                            {answers[2]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[2]}</div>
                                        </div>
                                    </div>
                                    <div class="sol-level-box level-b2">
                                        <span class="level-badge b2">B2 LEVEL</span>
                                        <div class="level-content">
                                            {answers[3]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[3]}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="sol-question-item">
                                    <div class="sol-question-text">{questions[2]}</div>
                                    <div class="sol-level-box level-b1">
                                        <span class="level-badge b1">B1 LEVEL</span>
                                        <div class="level-content">
                                            {answers[4]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[4]}</div>
                                        </div>
                                    </div>
                                    <div class="sol-level-box level-b2">
                                        <span class="level-badge b2">B2 LEVEL</span>
                                        <div class="level-content">
                                            {answers[5]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[5]}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Topic 2 -->
                            <div class="sol-topic-section" style="margin-top: 30px;">
                                <div class="sol-topic-header">
                                    {headers[1]}
                                </div>
                                
                                <div class="sol-question-item">
                                    <div class="sol-question-text">{questions[3]}</div>
                                    <div class="sol-level-box level-b1">
                                        <span class="level-badge b1">B1 LEVEL</span>
                                        <div class="level-content">
                                            {answers[6]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[6]}</div>
                                        </div>
                                    </div>
                                    <div class="sol-level-box level-b2">
                                        <span class="level-badge b2">B2 LEVEL</span>
                                        <div class="level-content">
                                            {answers[7]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[7]}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="sol-question-item">
                                    <div class="sol-question-text">{questions[4]}</div>
                                    <div class="sol-level-box level-b1">
                                        <span class="level-badge b1">B1 LEVEL</span>
                                        <div class="level-content">
                                            {answers[8]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[8]}</div>
                                        </div>
                                    </div>
                                    <div class="sol-level-box level-b2">
                                        <span class="level-badge b2">B2 LEVEL</span>
                                        <div class="level-content">
                                            {answers[9]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[9]}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="sol-question-item">
                                    <div class="sol-question-text">{questions[5]}</div>
                                    <div class="sol-level-box level-b1">
                                        <span class="level-badge b1">B1 LEVEL</span>
                                        <div class="level-content">
                                            {answers[10]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[10]}</div>
                                        </div>
                                    </div>
                                    <div class="sol-level-box level-b2">
                                        <span class="level-badge b2">B2 LEVEL</span>
                                        <div class="level-content">
                                            {answers[11]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[11]}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>"""
                            
    # Part 2
    p2_html = f"""                            <div class="sol-topic-section">
                                <div class="sol-topic-header">
                                    {headers[2]}
                                </div>
                                <div class="sol-situation-box">
                                    {p2_sit}
                                </div>
                                
                                <div class="sol-topic-header" style="margin-top: 20px;">
                                    {headers[3]}
                                </div>
                                
                                <div class="sol-level-box level-b1">
                                    <span class="level-badge b1">B1 LEVEL</span>
                                    <div class="level-content" style="white-space: pre-line;">
                                        {answers[12]}
                                        <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                        <div class="translation-text" style="display: none; white-space: pre-line;">{translations[12]}</div>
                                    </div>
                                </div>
                                
                                <div class="sol-level-box level-b2" style="margin-top: 20px;">
                                    <span class="level-badge b2">B2 LEVEL</span>
                                    <div class="level-content" style="white-space: pre-line;">
                                        {answers[13]}
                                        <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                        <div class="translation-text" style="display: none; white-space: pre-line;">{translations[13]}</div>
                                    </div>
                                </div>
                            </div>"""
                            
    # Part 3
    p3_html = f"""                            <div class="sol-topic-section">
                                <div class="sol-topic-header">
                                    {headers[4]}
                                </div>
                                <div class="sol-situation-box">
                                    {p3_topic_box}
                                </div>
                                
                                <div class="sol-topic-header" style="margin-top: 20px;">
                                    {headers[5]}
                                </div>
                                
                                <div class="sol-level-box level-b1">
                                    <span class="level-badge b1">B1 LEVEL</span>
                                    <div class="level-content" style="white-space: pre-line;">
                                        {answers[14]}
                                        <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                        <div class="translation-text" style="display: none; white-space: pre-line;">{translations[14]}</div>
                                    </div>
                                </div>
                                
                                <div class="sol-level-box level-b2" style="margin-top: 20px;">
                                    <span class="level-badge b2">B2 LEVEL</span>
                                    <div class="level-content" style="white-space: pre-line;">
                                        {answers[15]}
                                        <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                        <div class="translation-text" style="display: none; white-space: pre-line;">{translations[15]}</div>
                                    </div>
                                </div>
                                
                                <div class="sol-topic-header" style="margin-top: 30px;">
                                    {headers[6]}
                                </div>
                                
                                <div class="sol-question-item">
                                    <div class="sol-question-text">{questions[6]}</div>
                                    <div class="sol-level-box level-b1">
                                        <span class="level-badge b1">B1 LEVEL</span>
                                        <div class="level-content">
                                            {answers[16]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[16]}</div>
                                        </div>
                                    </div>
                                    <div class="sol-level-box level-b2">
                                        <span class="level-badge b2">B2 LEVEL</span>
                                        <div class="level-content">
                                            {answers[17]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[17]}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="sol-question-item">
                                    <div class="sol-question-text">{questions[7]}</div>
                                    <div class="sol-level-box level-b1">
                                        <span class="level-badge b1">B1 LEVEL</span>
                                        <div class="level-content">
                                            {answers[18]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[18]}</div>
                                        </div>
                                    </div>
                                    <div class="sol-level-box level-b2">
                                        <span class="level-badge b2">B2 LEVEL</span>
                                        <div class="level-content">
                                            {answers[19]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[19]}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="sol-question-item">
                                    <div class="sol-question-text">{questions[8]}</div>
                                    <div class="sol-level-box level-b1">
                                        <span class="level-badge b1">B1 LEVEL</span>
                                        <div class="level-content">
                                            {answers[20]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[20]}</div>
                                        </div>
                                    </div>
                                    <div class="sol-level-box level-b2">
                                        <span class="level-badge b2">B2 LEVEL</span>
                                        <div class="level-content">
                                            {answers[21]}
                                            <div class="translation-toggle" onclick="toggleTranslation(this)"><strong>Vietnamese meaning</strong> <i class="fa-solid fa-chevron-down"></i></div>
                                            <div class="translation-text" style="display: none; white-space: pre-line;">{translations[21]}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>"""
    
    full_html = f"""<section class="screen-view" id="view-solution">
                <div class="glass-card instruction-card" style="max-width: 900px; margin: 20px auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                        <h2 style="color: var(--color-red); margin-bottom: 0;"><i class="fa-solid fa-book-open"></i> BÀI GIẢI CHI TIẾT</h2>
                        <span class="part-badge" style="background: rgba(239, 68, 68, 0.1); color: var(--color-red); font-size: 12px; padding: 6px 12px; border-radius: 6px; font-weight: 800;">{title}</span>
                    </div>
                    
                    <div class="solution-tab-container">
                        <div class="solution-tab-buttons">
                            <button class="sol-tab-btn active" onclick="switchSolTab(1)">PART 01: SOCIAL INTERACTION</button>
                            <button class="sol-tab-btn" onclick="switchSolTab(2)">PART 02: SOLUTION DISCUSSION</button>
                            <button class="sol-tab-btn" onclick="switchSolTab(3)">PART 03: TOPIC DEVELOPMENT</button>
                        </div>
                        
                        <!-- Panel Part 1 -->
                        <div class="sol-tab-content active" id="sol-panel-1">
{p1_html}
                        </div>
                        
                        <!-- Panel Part 2 -->
                        <div class="sol-tab-content" id="sol-panel-2">
{p2_html}
                        </div>
                        
                        <!-- Panel Part 3 -->
                        <div class="sol-tab-content" id="sol-panel-3">
{p3_html}
                        </div>
                    </div>
                </div>
            </section>"""
    return full_html

# Load docx JSON database
with open(os.path.join(workspace_dir, "docx_solutions_bold.json"), 'r', encoding='utf-8') as f:
    docx_data = json.load(f)

# Main rebuild loop
for t in range(1, 11):
    html_path = os.path.join(workspace_dir, f"test {t}", f"test{t:02d}-index.html")
    if not os.path.exists(html_path):
        print(f"Skipping Test {t} (HTML not found)")
        continue
        
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
        
    # Find solutions section using depth-based parser
    sol_sec_match = re.search(r'<section class="screen-view" id="view-solution">', html)
    if not sol_sec_match:
        print(f"ERROR: Could not find solution screen in Test {t}")
        continue
        
    start_pos = sol_sec_match.start()
    pos = start_pos
    depth = 0
    section_end = -1
    while pos < len(html):
        if html[pos:pos+8] == "<section":
            depth += 1
            pos += 8
        elif html[pos:pos+10] == "</section>":
            depth -= 1
            if depth == 0:
                section_end = pos + 10
                break
            pos += 10
        else:
            pos += 1
            
    if section_end == -1:
        print(f"ERROR: Could not find matching closing section tag in Test {t}")
        continue
        
    sol_section = html[start_pos:section_end]
    
    # Extract headers
    headers = re.findall(r'<div class="sol-topic-header"[^>]*>(.*?)</div>', sol_section, re.DOTALL)
    # Extract questions
    questions = re.findall(r'<div class="sol-question-text"[^>]*>(.*?)</div>', sol_section, re.DOTALL)
    
    # Extract P2 situation box
    p2_sit = ""
    p2_sit_match = re.search(r'<div class="sol-situation-box">(.*?)</div>', sol_section, re.DOTALL)
    if p2_sit_match:
        p2_sit = p2_sit_match.group(1).strip()
        
    # Extract P3 topic box
    p3_topic_box = ""
    p3_match = re.search(r'<div class="sol-situation-box"\s+style="font-weight:\s*600;?"[^>]*>(.*?)</div>', sol_section, re.DOTALL)
    if not p3_match:
        p3_match = re.search(r'<div class="sol-situation-box"\s+style="[^"]*font-weight:\s*600[^"]*"[^>]*>(.*?)</div>', sol_section, re.DOTALL)
    if p3_match:
        p3_topic_box = p3_match.group(1).strip()
        
    if len(headers) < 7 or len(questions) < 9:
        print(f"ERROR: Headers/Questions extraction failed in Test {t}. Headers: {len(headers)}, Questions: {len(questions)}")
        continue
        
    # Extract B1/B2 English answers
    box_starts = [m.start() for m in re.finditer(r'<div class="sol-level-box level-b', sol_section)]
    extracted_answers = []
    
    for idx, start_p in enumerate(box_starts):
        end_p = find_closing_div(sol_section, start_p)
        block_text = sol_section[start_p:end_p]
        
        lvl_content_start_match = re.search(r'<div class="level-content"([^>]*)>', block_text)
        div_content_start = lvl_content_start_match.end()
        inner_part = block_text[div_content_start:]
        first_tag_match = re.search(r'<(div|/div)', inner_part)
        if first_tag_match:
            english_text = inner_part[:first_tag_match.start()].strip()
        else:
            english_text = inner_part.strip()
        extracted_answers.append(english_text)
        
    # Overwrite test 6, 7, 8, 9, 10 answers with DOCX answers to ensure exact wording + bolding
    tk = f"test_{t:02d}"
    data = docx_data[tk]
    docx_answers = []
    
    # Part 1
    for topic, qs in data.get("part1", {}).items():
        for q, lvls in qs.items():
            docx_answers.append(lvls.get("b1", ""))
            docx_answers.append(lvls.get("b2", ""))
            
    # Part 2
    docx_answers.append("\n\n".join(data.get("part2", {}).get("b1", [])))
    docx_answers.append("\n\n".join(data.get("part2", {}).get("b2", [])))
    
    # Part 3
    docx_answers.append("\n\n".join(data.get("part3", {}).get("b1", [])))
    docx_answers.append("\n\n".join(data.get("part3", {}).get("b2", [])))
    
    # Part 3 Followups
    for q, lvls in data.get("part3", {}).get("followup", {}).items():
        docx_answers.append(lvls.get("b1", ""))
        docx_answers.append(lvls.get("b2", ""))
        
    final_answers = []
    for idx, extracted in enumerate(extracted_answers):
        # We enforce structured bolding for test 6, 7, 8, 9, 10
        # Wait, for test 7 and 8 we can also use structured docx answers as they were blank before
        if t in [6, 7, 8, 9, 10]:
            raw_docx_ans = docx_answers[idx]
            if t == 6:
                bolded_ans = apply_bolding(raw_docx_ans, test_6_bolds)
            elif t == 9:
                bolded_ans = apply_bolding(raw_docx_ans, test_9_bolds)
            elif t == 10:
                bolded_ans = apply_bolding(raw_docx_ans, test_10_bolds)
            else:
                # Test 7 and 8 have their bolding preserved in DOCX answers, so we keep them as is
                bolded_ans = raw_docx_ans
            final_answers.append(bolded_ans)
        else:
            final_answers.append(extracted)
            
    # Resolve translations
    translations = []
    for idx, ans in enumerate(final_answers):
        cleaned = clean_text(ans)
        translation = norm_db.get(cleaned)
        if not translation:
            cleaned_docx = clean_text(docx_answers[idx])
            translation = norm_db.get(cleaned_docx)
        if not translation:
            print(f"Warning: Translation NOT found for Test {t} block {idx} ('{cleaned[:40]}...')")
            translation = "Nội dung dịch đang được cập nhật..."
            
        # If this is Part 2 B1/B2 (idx 12, 13) or Part 3 B1/B2 (idx 14, 15), split into paragraphs
        if idx in [12, 13, 14, 15] and translation != "Nội dung dịch đang được cập nhật...":
            # Get English paragraphs from DOCX JSON data
            if idx == 12:
                eng_paras = data['part2']['b1']
            elif idx == 13:
                eng_paras = data['part2']['b2']
            elif idx == 14:
                eng_paras = data['part3']['b1']
            else:
                eng_paras = data['part3']['b2']
            
            # Map translation to paragraphs
            translation = map_viet_to_paragraphs(eng_paras, translation)
            
        translations.append(translation)
        
    # Generate clean HTML block with white-space: pre-line for all translations
    clean_sol_html = generate_sol_html(t, headers, questions, p2_sit, p3_topic_box, final_answers, translations)
    
    # Rebuild HTML document
    html_before = html[:start_pos]
    html_after = html[section_end:]
    
    new_html = html_before + "\n" + clean_sol_html + "\n" + html_after
    
    # Verification checks
    div_diff = new_html.count("<div") - new_html.count("</div>")
    toggles = clean_sol_html.count("translation-toggle")
    texts = clean_sol_html.count("translation-text")
    
    if div_diff != 0 or toggles != 22 or texts != 22:
        print(f"ERROR: Verification failed on Test {t}. Div diff: {div_diff}, Toggles: {toggles}, Texts: {texts}")
        continue
        
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_html)
        
    print(f"Test {t} successfully rebuilt with Vietnamese paragraph newlines. Tag balance: divs={new_html.count('<div')}, cdivs={new_html.count('</div>')}")
    
print("\nVietnamese paragraph newlines rebuild completed.")
