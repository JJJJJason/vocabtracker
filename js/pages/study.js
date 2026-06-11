// pages/study.js — Today's learning page (new words + review)

/** Escape a string for safe use inside an HTML attribute's JS string (like onclick="func('...')") */
function escapeForOnclick(str) {
  const map = { '\\': '\\\\', "'": "\\'", '"': '&quot;', '<': '&lt;', '>': '&gt;', '&': '&amp;' };
  return str.replace(/[\\'"<>&]/g, c => map[c]);
}

let studyState = {
  words: [],
  currentIndex: 0,
  mode: 'learn',
  phase: 'card',
  currentQuestion: null,
  questionIndex: 0,
  questions: [],
  quizResults: [],
};

async function renderStudy(container) {
  const plan = await Scheduler.getTodayPlan();
  const allWordIds = [...plan.newWords, ...plan.reviewWords];
  const words = [];
  for (const id of allWordIds) {
    const w = await WordStore.get(id);
    if (w) words.push({ ...w, _isNew: plan.newWords.includes(id) });
  }

  if (words.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="icon">🎉</div>
          <p>今天没有需要学习的单词！</p>
          <button class="btn btn-primary" onclick="App.navigate('settings')">去导入新单词</button>
          <button class="btn btn-outline" onclick="App.navigate('quiz')">去自由测试</button>
        </div>
      </div>
    `;
    return;
  }

  studyState.words = words;
  studyState.currentIndex = 0;
  studyState.phase = 'card';

  if (plan.completed) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="icon">✅</div>
          <p>今日学习已完成！</p>
          <p style="font-size: 14px;">已掌握 ${words.length} 个单词</p>
          <button class="btn btn-outline" onclick="App.navigate('quiz')">去自由测试</button>
        </div>
      </div>
    `;
    return;
  }

  renderStudyCard(container);
}

function renderStudyCard(container) {
  const word = studyState.words[studyState.currentIndex];
  if (!word) {
    finishStudy(container);
    return;
  }

  const progress = `${studyState.currentIndex + 1} / ${studyState.words.length}`;
  const label = word._isNew ? '🆕 新词' : '🔄 复习';

  container.innerHTML = `
    <div class="card study-card">
      <div class="study-header">
        <span class="badge">${label}</span>
        <span class="progress-text">${progress}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${(studyState.currentIndex / studyState.words.length) * 100}%"></div>
      </div>

      <div class="word-display">
        <div class="word-spelling">
          ${word.spelling}
          ${word.partOfSpeech ? `<span style="font-size:16px; color:var(--color-primary); margin-left:8px;">${word.partOfSpeech}</span>` : ''}
        </div>
        ${word.phonetic ? `<div class="word-phonetic">${word.phonetic}</div>` : ''}
        <button class="btn btn-outline btn-sm" onclick="speakWord('${escapeForOnclick(word.spelling)}')">🔊 发音</button>
      </div>

      <div class="word-meaning">
        <div class="meaning-text">${word.meaning}</div>
      </div>

      ${word.exampleSentence ? `
        <div class="word-example">
          <div class="example-label">📝 例句</div>
          <div class="example-text">${word.exampleSentence}</div>
        </div>
      ` : ''}

      ${word.source ? `<div class="word-source">📄 ${word.source}</div>` : ''}

      <div class="study-actions">
        <button class="btn btn-primary" onclick="startWordQuiz('${word.id}')">📝 开始测试</button>
        ${studyState.currentIndex < studyState.words.length - 1 ? `
          <button class="btn btn-outline" onclick="skipWord()">跳过 →</button>
        ` : ''}
      </div>
    </div>
  `;
}

async function startWordQuiz(wordId) {
  const word = await WordStore.get(wordId);
  if (!word) return;

  studyState.currentQuestion = word;
  studyState.questions = await QuizEngine.generateAllForWord(word);
  studyState.questionIndex = 0;
  studyState.quizResults = [];
  studyState.phase = 'quiz';

  renderQuizQuestion(document.getElementById('content').firstElementChild);
}

function renderQuizQuestion(container) {
  const q = studyState.questions[studyState.questionIndex];
  if (!q) {
    finishWordQuiz(container);
    return;
  }

  const progress = `题型 ${studyState.questionIndex + 1} / ${studyState.questions.length}`;
  const typeLabels = { en_to_ch: '英译中', ch_to_en: '中译英', dictation: '听写', fill_blank: '填空' };

  let questionHTML = '';
  switch (q.type) {
    case 'en_to_ch':
      questionHTML = `
        <div class="quiz-question">
          <div class="quiz-type">🔤 ${typeLabels[q.type]}</div>
          <div class="quiz-prompt">"${q.prompt}" 的意思是？</div>
          ${q.phonetic ? `<div class="quiz-phonetic">${q.phonetic}</div>` : ''}
          <div class="quiz-options">
            ${q.options.map((opt, i) => `
              <button class="quiz-option-btn" onclick="checkEnToChAnswer(${i}, ${q.correctIndex})" data-idx="${i}">
                ${String.fromCharCode(65 + i)}. ${opt}
              </button>
            `).join('')}
          </div>
        </div>
      `;
      break;

    case 'ch_to_en':
      questionHTML = `
        <div class="quiz-question">
          <div class="quiz-type">✏️ ${typeLabels[q.type]}</div>
          <div class="quiz-prompt">请拼写: "${q.prompt}"</div>
          ${q.phonetic ? `<div class="quiz-phonetic">音标: ${q.phonetic}</div>` : ''}
          <input type="text" class="quiz-input word-spelling-input" id="spelling-input" placeholder="输入英文拼写..." autocomplete="off" autocapitalize="off">
          <button class="btn btn-primary" onclick="checkChToEnAnswer()">确认</button>
          <div id="quiz-feedback"></div>
        </div>
      `;
      break;

    case 'dictation':
      questionHTML = `
        <div class="quiz-question">
          <div class="quiz-type">🎧 ${typeLabels[q.type]}</div>
          <div class="quiz-prompt">听发音，写出单词 (释义: ${q.meaning})</div>
          <button class="btn btn-outline" onclick="playDictation()">🔊 播放发音</button>
          <input type="text" class="quiz-input word-spelling-input" id="spelling-input" placeholder="输入英文拼写..." autocomplete="off" autocapitalize="off">
          <button class="btn btn-primary" onclick="checkDictationAnswer()">确认</button>
          <div id="quiz-feedback"></div>
        </div>
      `;
      break;

    case 'fill_blank':
      questionHTML = `
        <div class="quiz-question">
          <div class="quiz-type">📝 ${typeLabels[q.type]}</div>
          <div class="quiz-prompt">选择正确的单词填空:</div>
          <div class="fill-blank-sentence">${q.prompt}</div>
          <div class="quiz-options">
            ${q.options.map((opt, i) => `
              <button class="quiz-option-btn" onclick="checkFillBlankAnswer(${i}, ${q.correctIndex})" data-idx="${i}">
                ${opt}
              </button>
            `).join('')}
          </div>
        </div>
      `;
      break;
  }

  container.innerHTML = `
    <div class="card">
      <div class="study-header">
        <span class="progress-text">${progress}</span>
        <span class="badge">${typeLabels[q.type] || q.type}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${(studyState.questionIndex / studyState.questions.length) * 100}%"></div>
      </div>
      ${questionHTML}
    </div>
  `;
}

async function checkEnToChAnswer(selectedIdx, correctIdx) {
  const correct = selectedIdx === correctIdx;
  studyState.quizResults.push({ type: 'en_to_ch', correct });
  showQuizFeedback(correct);
  advanceQuestion();
}

async function checkChToEnAnswer() {
  const input = document.getElementById('spelling-input').value;
  const q = studyState.questions[studyState.questionIndex];
  const result = q.checkAnswer(input);
  studyState.quizResults.push({ type: 'ch_to_en', correct: result.correct });
  showQuizFeedback(result.correct, result.hint);
  advanceQuestion();
}

async function checkDictationAnswer() {
  const input = document.getElementById('spelling-input').value;
  const q = studyState.questions[studyState.questionIndex];
  const result = q.checkAnswer(input);
  studyState.quizResults.push({ type: 'dictation', correct: result.correct });
  showQuizFeedback(result.correct, result.hint);
  advanceQuestion();
}

async function checkFillBlankAnswer(selectedIdx, correctIdx) {
  const correct = selectedIdx === correctIdx;
  studyState.quizResults.push({ type: 'fill_blank', correct });
  showQuizFeedback(correct);
  advanceQuestion();
}

function showQuizFeedback(correct, hint) {
  const fb = document.getElementById('quiz-feedback');
  if (fb) {
    fb.innerHTML = correct
      ? '<span style="color: var(--color-success);">✅ 正确！</span>'
      : `<span style="color: var(--color-danger);">❌ ${hint || '再试一次'}</span>`;
  }
}

async function playDictation() {
  const q = studyState.questions[studyState.questionIndex];
  try { await q.speak(); } catch (e) { console.error('TTS error:', e); }
}

function advanceQuestion() {
  setTimeout(() => {
    studyState.questionIndex++;
    const container = document.getElementById('content').firstElementChild;
    if (studyState.questionIndex < studyState.questions.length) {
      renderQuizQuestion(container);
    } else {
      finishWordQuiz(container);
    }
  }, 1200);
}

async function finishWordQuiz(container) {
  const word = studyState.currentQuestion;
  const allCorrect = studyState.quizResults.every(r => r.correct);
  const updates = Scheduler.processReview(word, allCorrect);

  await WordStore.update(word.id, updates);

  container.innerHTML = `
    <div class="card">
      <div class="quiz-result">
        <div class="result-icon">${allCorrect ? '✅' : '❌'}</div>
        <div class="result-text">${allCorrect ? '通过！' : '未通过'}</div>
        <div class="result-detail">
          ${studyState.quizResults.map((r, i) => `
            <span>${r.correct ? '✅' : '❌'} 题型${i + 1}</span>
          `).join('  ')}
        </div>
        ${word.failStreak >= 2 && !allCorrect ? '<p style="color: var(--color-danger); margin-top: 8px;">⚠️ 请注意：再失败一次将进入顽固词专项攻克！</p>' : ''}
        ${updates.isStubborn ? '<p style="color: var(--color-danger); margin-top: 8px;">🔴 该词已标记为顽固词，请去「专项攻克」加强训练</p>' : ''}
        <button class="btn btn-primary" onclick="nextStudyWord()">下一个单词 →</button>
      </div>
    </div>
  `;
}

function nextStudyWord() {
  studyState.currentIndex++;
  studyState.phase = 'card';
  const container = document.getElementById('content').firstElementChild;
  renderStudyCard(container);
}

function skipWord() {
  studyState.currentIndex++;
  studyState.phase = 'card';
  const container = document.getElementById('content').firstElementChild;
  renderStudyCard(container);
}

async function finishStudy(container) {
  await Scheduler.completeTodayPlan();
  container.innerHTML = `
    <div class="card">
      <div class="empty-state">
        <div class="icon">🎉</div>
        <p>今日学习全部完成！</p>
        <p style="font-size: 14px;">共学习了 ${studyState.words.length} 个单词</p>
        <button class="btn btn-primary" onclick="App.navigate('dashboard')">返回仪表盘</button>
        <button class="btn btn-outline" onclick="App.navigate('quiz')">自由测试</button>
      </div>
    </div>
  `;
}

function speakWord(word) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

async function initStudy(container) { /* render does all the work */ }
