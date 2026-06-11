// pdfReport.js — Printable report generation via browser print (handles Chinese perfectly)

const PDFReport = {
  /**
   * Open a print window for the daily study list (背诵清单).
   */
  async printStudyList(dateStr) {
    const plan = await DB.db.get('dailyPlans', dateStr) || await Scheduler.generateDailyPlan(dateStr);

    const newWords = await _loadWords(plan.newWords);
    const reviewWords = await _loadWords(plan.reviewWords);
    const stubbornWords = await _loadWords(plan.stubbornWords);

    const html = _buildStudyListHTML(dateStr, newWords, reviewWords, stubbornWords);
    _openPrintWindow(html, `背诵清单-${dateStr}`);
  },

  /**
   * Open a print window for the quiz/test sheet (测试卷).
   */
  async printQuizSheet(dateStr) {
    const plan = await DB.db.get('dailyPlans', dateStr) || await Scheduler.generateDailyPlan(dateStr);
    const words = await _loadWords([...plan.newWords, ...plan.reviewWords, ...plan.stubbornWords]);

    // Generate quiz questions for each word
    const quizData = [];
    for (const w of words) {
      const q = await QuizEngine.generateEnToCh(w);
      quizData.push({ word: w, enToChOptions: q.options });
    }

    const html = _buildQuizSheetHTML(dateStr, quizData);
    _openPrintWindow(html, `测试卷-${dateStr}`);
  },
};

/* ── internal helpers ── */

async function _loadWords(ids) {
  const words = [];
  for (const id of ids) {
    const w = await WordStore.get(id);
    if (w) words.push(w);
  }
  return words;
}

function _openPrintWindow(html, title) {
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) { alert('请允许弹出窗口以打印'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  // Delay print to let browser render the content
  setTimeout(() => w.print(), 300);
}

function _escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PRINT_CSS = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif; color: #2c3e50; padding: 20px 28px; line-height: 1.7; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .date { font-size: 13px; color: #7f8c8d; margin-bottom: 18px; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #eee; }
    .section-title.new { color: #4a90d9; border-color: #4a90d9; }
    .section-title.review { color: #27ae60; border-color: #27ae60; }
    .section-title.stubborn { color: #e74c3c; border-color: #e74c3c; }
    .word-row { margin-bottom: 10px; padding: 6px 10px; border-left: 3px solid #e0e0e0; }
    .word-head { font-size: 14px; font-weight: 600; }
    .word-head .pos { color: #4a90d9; font-weight: 400; margin-left: 4px; }
    .word-head .phonetic { color: #95a5a6; font-weight: 400; margin-left: 6px; font-size: 13px; }
    .word-meaning { font-size: 13px; color: #555; margin-top: 2px; }
    .word-example { font-size: 12px; color: #999; font-style: italic; margin-top: 1px; }
    .footer { font-size: 11px; color: #bdc3c7; text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; }

    /* Quiz sheet styles */
    .quiz-part { margin-bottom: 16px; }
    .quiz-part h3 { font-size: 15px; margin-bottom: 8px; }
    .quiz-item { margin-bottom: 10px; }
    .quiz-item .q-title { font-size: 13px; font-weight: 600; }
    .quiz-options { font-size: 12px; padding-left: 16px; }
    .quiz-options div { margin: 2px 0; }
    .write-line { font-size: 13px; margin: 4px 0; }
    .header-info { font-size: 13px; margin-bottom: 6px; }
    .header-info span { margin-right: 24px; }

    @media print {
      body { padding: 15px 20px; }
      @page { margin: 12mm; }
    }
  </style>
`;

function _buildWordRow(w) {
  const pos = w.partOfSpeech ? `<span class="pos">${_escapeHTML(w.partOfSpeech)}</span>` : '';
  const phonetic = w.phonetic ? `<span class="phonetic">${_escapeHTML(w.phonetic)}</span>` : '';
  const example = w.exampleSentence ? `<div class="word-example">${_escapeHTML(w.exampleSentence)}</div>` : '';
  return `
    <div class="word-row">
      <div class="word-head">${_escapeHTML(w.spelling)}${pos}${phonetic}</div>
      <div class="word-meaning">${_escapeHTML(w.meaning)}</div>
      ${example}
    </div>`;
}

function _buildStudyListHTML(dateStr, newWords, reviewWords, stubbornWords) {
  let sections = '';

  if (newWords.length > 0) {
    sections += `<div class="section">
      <div class="section-title new">🆕 新词学习 (${newWords.length}个)</div>
      ${newWords.map(_buildWordRow).join('')}
    </div>`;
  }

  if (reviewWords.length > 0) {
    sections += `<div class="section">
      <div class="section-title review">🔄 复习巩固 (${reviewWords.length}个)</div>
      ${reviewWords.map(_buildWordRow).join('')}
    </div>`;
  }

  if (stubbornWords.length > 0) {
    sections += `<div class="section">
      <div class="section-title stubborn">🎯 专项攻克 (${stubbornWords.length}个)</div>
      ${stubbornWords.map(_buildWordRow).join('')}
    </div>`;
  }

  if (!sections) {
    sections = '<p style="color:#999; text-align:center; margin-top:40px;">今天没有需要背诵的单词</p>';
  }

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>背诵清单 - ${dateStr}</title>${PRINT_CSS}</head><body>
    <h1>📖 今日背诵清单</h1>
    <div class="date">日期: ${dateStr}</div>
    ${sections}
    <div class="footer">VocabTracker · 每天进步一点点</div>
  </body></html>`;
}

function _buildQuizSheetHTML(dateStr, quizData) {
  const letters = ['A', 'B', 'C', 'D'];

  // Part A: 英译中
  let partA = '';
  quizData.forEach((item, i) => {
    partA += `<div class="quiz-item">
      <div class="q-title">${i + 1}. ${_escapeHTML(item.word.spelling)}</div>
      <div class="quiz-options">
        ${item.enToChOptions.map((opt, j) => `<div>${letters[j]}. ${_escapeHTML(opt)}</div>`).join('')}
      </div>
    </div>`;
  });

  // Part B: 中译英
  let partB = '';
  quizData.forEach((item, i) => {
    partB += `<div class="write-line">${quizData.length + i + 1}. ${_escapeHTML(item.word.meaning)} __________________</div>`;
  });

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>测试卷 - ${dateStr}</title>${PRINT_CSS}</head><body>
    <h1>📝 单词测试卷</h1>
    <div class="header-info">
      <span>日期: ${dateStr}</span>
      <span>姓名: ________________</span>
      <span>得分: ________________</span>
    </div>

    <div class="quiz-part">
      <h3 style="color:#4a90d9;">A. 英译中（选择正确的释义）</h3>
      ${partA}
    </div>

    <div class="quiz-part">
      <h3 style="color:#27ae60;">B. 中译英（写出英文单词）</h3>
      ${partB}
    </div>

    <div class="footer">VocabTracker · 每天进步一点点</div>
  </body></html>`;
}
