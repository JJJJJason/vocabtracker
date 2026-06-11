// pages/stubborn.js — Stubborn word intensive training page

let stubbornState = { words: [], currentIdx: 0, questions: [], qIdx: 0, results: [], currentWord: null };

async function renderStubborn(container) {
  stubbornState.words = await WordStore.getStubborn();
  stubbornState.currentIdx = 0;

  if (stubbornState.words.length === 0) {
    container.innerHTML = `
      <div class="card"><div class="empty-state">
        <div class="icon">🎉</div><p>没有顽固词，继续保持！</p>
        <p style="font-size:13px;">单词连续失败 3 次后会自动进入这里</p>
      </div></div>`;
    return;
  }

  const settings = await DB.getSettings();
  const todayWords = stubbornState.words.slice(0, settings.stubbornDailyLimit);

  container.innerHTML = `
    <div class="page-header">
      <h2>🎯 专项攻克</h2>
      <p class="date">顽固词需要连续 2 次全题型通过才能"毕业"</p>
    </div>
    <div class="card">
      <p>🔴 顽固词总数: <strong>${stubbornState.words.length}</strong> | 今日攻克: <strong>${todayWords.length}</strong> 个</p>
    </div>
    <div class="stubborn-list">
      ${todayWords.map((w, i) => `
        <div class="card stubborn-word-card">
          <div class="word-row">
            <strong>${w.spelling}</strong>
            <span>${w.phonetic || ''}</span>
            <span class="fail-badge">失败 ${w.failStreak} 次</span>
            <span>已通过 ${w.stubbornPassCount}/2 次</span>
          </div>
          <div>${w.meaning}</div>
          <button class="btn btn-danger btn-sm" onclick="startStubbornTraining('${w.id}')">开始攻克</button>
        </div>
      `).join('')}
    </div>
  `;
}

async function startStubbornTraining(wordId) {
  const word = await WordStore.get(wordId);
  if (!word) return;
  stubbornState.currentWord = word;
  stubbornState.questions = await QuizEngine.generateAllForWord(word);
  stubbornState.qIdx = 0;
  stubbornState.results = [];

  const container = document.getElementById('content').firstElementChild;
  renderStubbornQuestion(container);
}

function renderStubbornQuestion(container) {
  const q = stubbornState.questions[stubbornState.qIdx];
  if (!q) { finishStubbornTraining(container); return; }

  const typeLabels = { en_to_ch: '英译中', ch_to_en: '中译英', dictation: '听写', fill_blank: '填空' };

  let html = `<div class="card"><div class="study-header">
    <span>题型 ${stubbornState.qIdx + 1}/${stubbornState.questions.length}</span>
    <span class="badge">${typeLabels[q.type]}</span>
  </div>`;

  if (q.type === 'en_to_ch') {
    html += `<div class="quiz-question"><div class="quiz-prompt">"${q.prompt}" 的意思是？</div>
      <div class="quiz-options">${q.options.map((opt, i) =>
        `<button class="quiz-option-btn" onclick="checkStubbornEnToCh(${i},${q.correctIndex})">${String.fromCharCode(65+i)}. ${opt}</button>`
      ).join('')}</div></div>`;
  } else if (q.type === 'ch_to_en') {
    html += `<div class="quiz-question"><div class="quiz-prompt">请拼写: "${q.prompt}"</div>
      <input class="quiz-input" id="s-input" placeholder="输入英文拼写..." autocomplete="off">
      <button class="btn btn-primary" onclick="checkStubbornChToEn()">确认</button>
      <div id="s-feedback"></div></div>`;
  } else if (q.type === 'dictation') {
    html += `<div class="quiz-question"><div class="quiz-prompt">听发音，写出单词 (${q.meaning})</div>
      <button class="btn btn-outline" onclick="playStubbornDictation()">🔊 播放</button>
      <input class="quiz-input" id="s-input" placeholder="输入英文拼写..." autocomplete="off">
      <button class="btn btn-primary" onclick="checkStubbornDictation()">确认</button>
      <div id="s-feedback"></div></div>`;
  } else if (q.type === 'fill_blank') {
    html += `<div class="quiz-question"><div class="quiz-prompt">选择正确的单词填空:</div>
      <div class="fill-blank-sentence">${q.prompt}</div>
      <div class="quiz-options">${q.options.map((opt, i) =>
        `<button class="quiz-option-btn" onclick="checkStubbornFill(${i},${q.correctIndex})">${opt}</button>`
      ).join('')}</div></div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

async function checkStubbornEnToCh(sel, corr) { stubbornState.results.push(sel === corr); advanceStubbornQ(); }
async function checkStubbornChToEn() {
  const input = document.getElementById('s-input').value;
  const q = stubbornState.questions[stubbornState.qIdx];
  const r = q.checkAnswer(input);
  stubbornState.results.push(r.correct);
  const fb = document.getElementById('s-feedback');
  if (fb) fb.innerHTML = r.correct ? '✅ 正确' : `❌ ${r.hint}`;
  setTimeout(advanceStubbornQ, 1000);
}
async function checkStubbornDictation() {
  const input = document.getElementById('s-input').value;
  const q = stubbornState.questions[stubbornState.qIdx];
  const r = q.checkAnswer(input);
  stubbornState.results.push(r.correct);
  const fb = document.getElementById('s-feedback');
  if (fb) fb.innerHTML = r.correct ? '✅ 正确' : `❌ ${r.hint}`;
  setTimeout(advanceStubbornQ, 1000);
}
async function playStubbornDictation() { const q = stubbornState.questions[stubbornState.qIdx]; try { await q.speak(); } catch(e) {} }
async function checkStubbornFill(sel, corr) { stubbornState.results.push(sel === corr); advanceStubbornQ(); }

function advanceStubbornQ() {
  stubbornState.qIdx++;
  const container = document.getElementById('content').firstElementChild;
  if (stubbornState.qIdx < stubbornState.questions.length) {
    renderStubbornQuestion(container);
  } else {
    finishStubbornTraining(container);
  }
}

async function finishStubbornTraining(container) {
  const word = stubbornState.currentWord;
  const allCorrect = stubbornState.results.every(r => r);
  const updates = Scheduler.processStubbornReview(word, allCorrect);
  await WordStore.update(word.id, updates);

  container.innerHTML = `
    <div class="card"><div class="quiz-result">
      <div class="result-icon">${allCorrect ? '✅' : '❌'}</div>
      <div class="result-text">${allCorrect ? '攻克通过！' : '未通过'}</div>
      <div class="result-detail">${stubbornState.results.map((r,i) => r?'✅':`❌题型${i+1}`).join(' ')}</div>
      ${updates.isStubborn ? `<p style="color:var(--color-danger);">还需连续2次通过才能退出顽固状态 (当前: ${updates.stubbornPassCount}/2)</p>`
        : '<p style="color:var(--color-success);">🎉 已退出顽固状态，回归正常复习！</p>'}
      <button class="btn btn-primary" onclick="App.navigate('stubborn')">返回攻克列表</button>
    </div></div>`;
}

async function initStubborn(container) {}
