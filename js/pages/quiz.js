// pages/quiz.js — Free quiz center

let freeQuizState = { words: [], currentIdx: 0, questions: [], qIdx: 0, results: [] };

async function renderQuiz(container) {
  const words = await WordStore.getByStatus('active');
  const mastered = await WordStore.getByStatus('mastered');
  const allAvailable = [...words, ...mastered];

  container.innerHTML = `
    <div class="page-header"><h2>📝 自由测试</h2><p class="date">选择单词进行任意题型的自由练习</p></div>
    <div class="card">
      <h3>选择测试范围</h3>
      <div style="margin-top:12px;">
        <button class="btn btn-primary" onclick="startFreeQuiz('active')">学习中单词 (${words.length})</button>
        <button class="btn btn-outline" onclick="startFreeQuiz('mastered')">已掌握单词 (${mastered.length})</button>
        <button class="btn btn-outline" onclick="startFreeQuiz('all')">全部单词 (${allAvailable.length})</button>
        <button class="btn btn-outline" onclick="startFreeQuiz('random')">随机 10 个</button>
      </div>
    </div>
    <div class="card">
      <h3>题型选择</h3>
      <div style="margin-top:12px;">
        <button class="btn btn-outline" onclick="startFreeQuiz('active', 'en_to_ch')">🔤 英译中</button>
        <button class="btn btn-outline" onclick="startFreeQuiz('active', 'ch_to_en')">✏️ 中译英</button>
        <button class="btn btn-outline" onclick="startFreeQuiz('active', 'dictation')">🎧 听写</button>
        <button class="btn btn-outline" onclick="startFreeQuiz('active', 'fill_blank')">📝 例句填空</button>
        <button class="btn btn-primary" onclick="startFreeQuiz('active', 'all')">🎯 全题型混合</button>
      </div>
    </div>
    <div id="free-quiz-area"></div>
  `;
}

async function startFreeQuiz(scope, quizType = 'all') {
  let pool = [];
  if (scope === 'active') pool = await WordStore.getByStatus('active');
  else if (scope === 'mastered') pool = await WordStore.getByStatus('mastered');
  else if (scope === 'all') pool = await WordStore.getAll();
  else if (scope === 'random') { const all = await WordStore.getAll(); pool = all.sort(() => Math.random() - 0.5).slice(0, 10); }

  if (pool.length === 0) {
    document.getElementById('free-quiz-area').innerHTML = '<div class="card"><p>没有可测试的单词</p></div>';
    return;
  }

  freeQuizState.words = pool;
  freeQuizState.questions = [];
  for (const w of pool) {
    if (quizType === 'all') {
      const qs = await QuizEngine.generateAllForWord(w);
      freeQuizState.questions.push(...qs);
    } else if (quizType === 'en_to_ch') {
      freeQuizState.questions.push(await QuizEngine.generateEnToCh(w));
    } else if (quizType === 'ch_to_en') {
      freeQuizState.questions.push(QuizEngine.generateChToEn(w));
    } else if (quizType === 'dictation') {
      freeQuizState.questions.push(QuizEngine.generateDictation(w));
    } else if (quizType === 'fill_blank') {
      const q = await QuizEngine.generateFillBlank(w);
      if (q) freeQuizState.questions.push(q);
    }
  }
  freeQuizState.currentIdx = 0;
  freeQuizState.results = [];

  renderFreeQuizQuestion();
}

function renderFreeQuizQuestion() {
  if (freeQuizState.currentIdx >= freeQuizState.questions.length) {
    finishFreeQuiz();
    return;
  }

  const q = freeQuizState.questions[freeQuizState.currentIdx];
  const area = document.getElementById('free-quiz-area');
  const typeLabels = { en_to_ch: '英译中', ch_to_en: '中译英', dictation: '听写', fill_blank: '填空' };

  let html = `<div class="card"><div class="study-header">
    <span>${freeQuizState.currentIdx + 1}/${freeQuizState.questions.length}</span>
    <span class="badge">${typeLabels[q.type]}</span>
  </div>`;

  if (q.type === 'en_to_ch') {
    html += `<div class="quiz-question"><div class="quiz-prompt">"${q.prompt}" 的意思是？</div>
      <div class="quiz-options">${q.options.map((o,i) =>
        `<button class="quiz-option-btn" onclick="freeEnToCh(${i},${q.correctIndex})">${String.fromCharCode(65+i)}. ${o}</button>`
      ).join('')}</div></div>`;
  } else if (q.type === 'ch_to_en') {
    html += `<div class="quiz-question"><div class="quiz-prompt">请拼写: "${q.prompt}"</div>
      <input class="quiz-input word-spelling-input" id="f-input" placeholder="输入英文" autocomplete="off">
      <button class="btn btn-primary" onclick="freeChToEn()">确认</button><div id="f-feedback"></div></div>`;
  } else if (q.type === 'dictation') {
    html += `<div class="quiz-question"><div class="quiz-prompt">听发音写出单词 (${q.meaning})</div>
      <button class="btn btn-outline" onclick="freeDictationPlay()">🔊 播放</button>
      <input class="quiz-input word-spelling-input" id="f-input" placeholder="输入英文" autocomplete="off">
      <button class="btn btn-primary" onclick="freeDictationCheck()">确认</button><div id="f-feedback"></div></div>`;
  } else if (q.type === 'fill_blank') {
    html += `<div class="quiz-question"><div class="fill-blank-sentence">${q.prompt}</div>
      <div class="quiz-options">${q.options.map((o,i) =>
        `<button class="quiz-option-btn" onclick="freeFill(${i},${q.correctIndex})">${o}</button>`
      ).join('')}</div></div>`;
  }

  html += '</div>';
  area.innerHTML = html;
}

async function freeEnToCh(sel, corr) { freeQuizState.results.push(sel === corr); freeQuizState.currentIdx++; renderFreeQuizQuestion(); }
async function freeChToEn() {
  const input = document.getElementById('f-input').value;
  const q = freeQuizState.questions[freeQuizState.currentIdx];
  const r = q.checkAnswer(input);
  freeQuizState.results.push(r.correct);
  document.getElementById('f-feedback').innerHTML = r.correct ? '✅' : `❌ ${r.hint}`;
  setTimeout(() => { freeQuizState.currentIdx++; renderFreeQuizQuestion(); }, 1000);
}
async function freeDictationPlay() { const q = freeQuizState.questions[freeQuizState.currentIdx]; try { await q.speak(); } catch(e) {} }
async function freeDictationCheck() {
  const input = document.getElementById('f-input').value;
  const q = freeQuizState.questions[freeQuizState.currentIdx];
  const r = q.checkAnswer(input);
  freeQuizState.results.push(r.correct);
  document.getElementById('f-feedback').innerHTML = r.correct ? '✅' : `❌ ${r.hint}`;
  setTimeout(() => { freeQuizState.currentIdx++; renderFreeQuizQuestion(); }, 1000);
}
async function freeFill(sel, corr) { freeQuizState.results.push(sel === corr); freeQuizState.currentIdx++; renderFreeQuizQuestion(); }

function finishFreeQuiz() {
  const correct = freeQuizState.results.filter(r => r).length;
  const total = freeQuizState.results.length;
  document.getElementById('free-quiz-area').innerHTML = `
    <div class="card"><div class="quiz-result">
      <div class="result-icon">${correct / total >= 0.8 ? '🎉' : '📚'}</div>
      <div class="result-text">${correct} / ${total} 正确</div>
      <div class="result-detail">正确率: ${Math.round(correct/total*100)}%</div>
      <button class="btn btn-primary" onclick="App.navigate('quiz')">再来一组</button>
    </div></div>`;
}

async function initQuiz(container) {}
