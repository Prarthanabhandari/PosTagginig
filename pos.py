from flask import Flask, render_template, request, jsonify
import stanza
import random
import re
import scipy  # Import SciPy for English numeric or scientific tasks if needed

app = Flask(__name__)

# ---------- Initialize Stanza Pipelines ----------
# Download models if not already done
stanza.download('hi')
stanza.download('mr')
stanza.download('en')

# Create pipelines
stanza_pipelines = {
    'hi': stanza.Pipeline(lang='hi', processors='tokenize,lemma,pos,depparse', use_gpu=False),
    'mr': stanza.Pipeline(lang='mr', processors='tokenize,lemma,pos,depparse', use_gpu=False),
    'en': stanza.Pipeline(lang='en', processors='tokenize,lemma,pos,depparse', use_gpu=False)
}

# ---------- Sample lyrics for quiz ----------
# ---------- Sample lyrics for quiz ----------
quiz_lyrics_list = [
    "I love the sun and the sky,You shine bright and light my day",
    "Dream big and chase your goals,Life grows when you take bold steps",
    "I need someboady who loves me ",
    "Sing loud and feel the beat,Joy comes when friends and music meet",
    "Life is what happens when you're busy making other plans"
]


# ---------- Helper: Detect Language ----------
def detect_language(text):
    if re.search(r'[\u0900-\u097F]', text):
        if re.search(r'माझा|आहे|तुझ्यावर', text):
            return 'mr'
        return 'hi'
    return 'en'

# ---------- ROUTES ----------
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_pos', methods=['POST'])
def get_pos():
    lyric = request.json.get('lyric')
    lang = detect_language(lyric)
    nlp = stanza_pipelines[lang]
    doc = nlp(lyric)
    
    pos_tags = {}
    for sent in doc.sentences:
        for word in sent.words:
            # Ensure a POS is always returned; fallback to 'X' only if missing
            pos_tags[word.text] = word.upos if word.upos else 'X'

    return jsonify(pos_tags)

@app.route('/get_tree', methods=['POST'])
def get_tree():
    lyric = request.json.get('lyric')
    lang = detect_language(lyric)
    nlp = stanza_pipelines[lang]
    doc = nlp(lyric)
    
    tree = []
    for sent in doc.sentences:
        for word in sent.words:
            head_word = sent.words[word.head - 1].text if word.head > 0 else word.text
            tree.append({
                "text": word.text,
                "pos": word.upos if word.upos else 'X',
                "head": head_word
            })

    return jsonify(tree)

@app.route('/get_quiz', methods=['GET'])
def get_quiz():
    lyric = random.choice(quiz_lyrics_list)
    lang = detect_language(lyric)
    nlp = stanza_pipelines[lang]
    doc = nlp(lyric)

    words = []
    pos_tags = []
    for sent in doc.sentences:
        for word in sent.words:
            words.append(word.text)
            pos_tags.append(word.upos if word.upos else 'X')

    shuffled_pos = pos_tags.copy()
    random.shuffle(shuffled_pos)

    return jsonify({
        "lyric": lyric,
        "words": words,
        "pos": shuffled_pos,
        "answer": pos_tags
    })

# ---------- RUN APP ----------
if __name__ == "__main__":
    app.run(debug=True)
