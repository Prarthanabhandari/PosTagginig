document.addEventListener('DOMContentLoaded', () => {

    const sendBtn = document.getElementById('send-btn');
    const lyricInput = document.getElementById('lyric-input');
    const chatBox = document.getElementById('chat-box');
    const treeBtn = document.getElementById('tree-btn');
    const quizBtn = document.getElementById('quiz-btn');
    const treeContainer = document.getElementById('tree-container');
    const quizContainer = document.getElementById('quiz-container');

    let lastLyric = ''; // <-- store last entered lyric

    function addMessage(msg, cls) {
        const div = document.createElement('div');
        div.className = `message ${cls}`;
        div.innerHTML = msg;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // ---------- GET POS TAG ----------
    sendBtn.addEventListener('click', () => {
        const lyric = lyricInput.value.trim();
        if (!lyric) return;

        lastLyric = lyric; // <-- store lyric here
        addMessage(lyric, 'user-msg');
        lyricInput.value = '';

        fetch('/get_pos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lyric })
        })
        .then(res => res.json())
        .then(data => {
            let msg = '';
            for (const [word, pos] of Object.entries(data)) {
                msg += `${word}: ${pos}<br>`;
            }
            addMessage(msg, 'bot-msg');
            treeContainer.style.display = 'none';
            quizContainer.style.display = 'none';
        })
        .catch(err => addMessage('Error fetching POS tags.', 'bot-msg'));
    });

    // ---------- TREE BUTTON ----------
    treeBtn.addEventListener('click', () => {
        if (!lastLyric) {
            addMessage('Please enter lyrics and get POS first.', 'bot-msg');
            return;
        }

        fetch('/get_tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lyric: lastLyric })
        })
        .then(res => res.json())
        .then(data => {
            treeContainer.innerHTML = '<strong>Tree Structure:</strong><br>';

            function buildTree(tokens, root) {
                const container = document.createElement('div');
                const children = tokens.filter(t => t.head === root && t.text !== root);
                children.forEach((child, i) => {
                    const div = document.createElement('div');
                    div.className = 'tree-item';
                    let prefix = i === children.length - 1 ? '└─ ' : '├─ ';
                    div.innerHTML = `${prefix}${child.text}: ${child.pos}`;
                    div.appendChild(buildTree(tokens, child.text));
                    container.appendChild(div);
                });
                return container;
            }

            const rootToken = data.find(t => t.head === t.text) || data[0];
            treeContainer.appendChild(buildTree(data, rootToken.text));

            treeContainer.style.display = 'block';
            quizContainer.style.display = 'none';
        })
        .catch(err => addMessage('Error fetching tree structure.', 'bot-msg'));
    });

    // ---------- QUIZ BUTTON ----------
    quizBtn.addEventListener('click', () => {
        fetch('/get_quiz')
        .then(res => res.json())
        .then(data => {
            quizContainer.innerHTML = `<strong>Lyric:</strong> ${data.lyric}<br><br>`;
            const allPos = ["NOUN","VERB","ADJ","ADV","PROPN","PRON","INTJ","DET","ADP","CCONJ","PART","NUM","SYM","X"];

            data.words.forEach((word,i)=>{
                quizContainer.innerHTML += `<div>${word} ➡ 
                    <select>
                        ${allPos.map(p=>`<option value="${p}">${p}</option>`).join('')}
                    </select>
                </div>`;
            });

            quizContainer.innerHTML += `<button id="submit-quiz">Submit</button> <span id="score"></span>`;
            quizContainer.style.display='block';
            treeContainer.style.display='none';

            document.getElementById('submit-quiz').addEventListener('click', ()=>{
                let score = 0;
                data.words.forEach((word,i)=>{
                    const select = quizContainer.querySelectorAll('select')[i];
                    if(select.value === data.answer[i]) score++;
                });
                document.getElementById('score').innerText = `Score: ${score}/${data.words.length}`;
            });
        })
        .catch(err => addMessage('Error fetching quiz.', 'bot-msg'));
    });

});
