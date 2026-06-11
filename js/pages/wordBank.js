// pages/wordBank.js — Word library with search, filter, and manual edit

async function renderWordBank(container) {
  const allWords = await WordStore.getAll();
  const poolCount = await WordStore.countByStatus('pool');
  const masteredCount = await WordStore.countByStatus('mastered');
  const stubbornCount = await WordStore.countStubborn();

  container.innerHTML = `
    <div class="page-header"><h2>📚 单词库</h2><p class="date">共 ${allWords.length} 个单词</p></div>
    <div class="card">
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
        <input type="text" id="word-search" class="quiz-input" placeholder="搜索单词..." style="max-width:200px; margin:0;" oninput="filterWordBank()">
        <select id="status-filter" onchange="filterWordBank()" style="padding:8px; border-radius:8px; border:1px solid var(--color-border);">
          <option value="all">全部状态</option>
          <option value="active">学习中</option>
          <option value="pool">待背池 (${poolCount})</option>
          <option value="mastered">已掌握 (${masteredCount})</option>
          <option value="stubborn">顽固词 (${stubbornCount})</option>
        </select>
      </div>
    </div>
    <div id="word-list"></div>
  `;

  renderWordList(allWords);
}

async function renderWordList(words) {
  const list = document.getElementById('word-list');
  if (!list) return;

  if (words.length === 0) {
    list.innerHTML = '<div class="card"><div class="empty-state"><p>没有匹配的单词</p></div></div>';
    return;
  }

  list.innerHTML = words.map(w => `
    <div class="card word-item">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="font-size:18px;">${w.spelling}</strong>
          ${w.partOfSpeech ? `<span style="color:var(--color-primary); margin-left:6px; font-size:14px;">${w.partOfSpeech}</span>` : ''}
          <span style="color:var(--color-text-light); margin-left:8px;">${w.phonetic || ''}</span>
          ${w.isStubborn ? '<span class="badge badge-danger" style="margin-left:8px;">顽固</span>' : ''}
        </div>
        <span class="badge badge-${statusLabel(w.status)}">${statusText(w.status)}</span>
      </div>
      <div style="margin-top:4px; color:var(--color-text-light);">${w.meaning}</div>
      ${w.exampleSentence ? `<div style="font-size:13px; font-style:italic; margin-top:4px;">${w.exampleSentence}</div>` : ''}
      <div style="margin-top:4px; font-size:12px; color:var(--color-text-light);">
        阶段: ${w.stage} | 失败: ${w.failStreak}次 | ${w.source ? '来源: ' + w.source : ''}
      </div>
      <div style="margin-top:8px; display:flex; gap:6px;">
        <button class="btn btn-outline btn-sm" onclick="editWord('${w.id}')">编辑</button>
        ${w.status === 'pool' ? `<button class="btn btn-primary btn-sm" onclick="promoteWord('${w.id}')">加入学习</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="deleteWord('${w.id}')" style="color:var(--color-danger);">删除</button>
      </div>
    </div>
  `).join('');
}

function statusText(s) {
  const labels = { active: '学习中', pool: '待背池', mastered: '已掌握', stubborn: '顽固词' };
  return labels[s] || s;
}

function statusLabel(s) {
  const labels = { active: 'info', pool: 'pending', mastered: 'success', stubborn: 'danger' };
  return labels[s] || 'info';
}

async function filterWordBank() {
  const search = document.getElementById('word-search')?.value.toLowerCase() || '';
  const status = document.getElementById('status-filter')?.value || 'all';

  let words;
  if (status === 'all') words = await WordStore.getAll();
  else if (status === 'stubborn') words = await WordStore.getStubborn();
  else words = await WordStore.getByStatus(status);

  if (search) {
    words = words.filter(w =>
      w.spelling.toLowerCase().includes(search) ||
      w.meaning.includes(search) ||
      (w.phonetic && w.phonetic.includes(search))
    );
  }

  renderWordList(words);
}

async function editWord(id) {
  const w = await WordStore.get(id);
  if (!w) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>编辑单词</h3>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
        <label>拼写: <input id="edit-spelling" class="quiz-input" value="${escapeHtml(w.spelling)}" style="margin:0;"></label>
        <label>音标: <input id="edit-phonetic" class="quiz-input" value="${escapeHtml(w.phonetic || '')}" style="margin:0;"></label>
        <label>词性: <input id="edit-pos" class="quiz-input" value="${escapeHtml(w.partOfSpeech || '')}" placeholder="如: v., n., adj., adv." style="margin:0;"></label>
        <label>释义: <input id="edit-meaning" class="quiz-input" value="${escapeHtml(w.meaning)}" style="margin:0;"></label>
        <label>例句: <input id="edit-sentence" class="quiz-input" value="${escapeHtml(w.exampleSentence || '')}" style="margin:0;"></label>
        <label>来源: <input id="edit-source" class="quiz-input" value="${escapeHtml(w.source || '')}" style="margin:0;"></label>
      </div>
      <div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="saveWordEdit('${id}')">保存</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function saveWordEdit(id) {
  const updates = {
    spelling: document.getElementById('edit-spelling').value,
    phonetic: document.getElementById('edit-phonetic').value,
    partOfSpeech: document.getElementById('edit-pos').value,
    meaning: document.getElementById('edit-meaning').value,
    exampleSentence: document.getElementById('edit-sentence').value,
    source: document.getElementById('edit-source').value,
  };
  await WordStore.update(id, updates);
  document.querySelector('.modal-overlay')?.remove();
  App.navigate('wordbank');
}

async function promoteWord(id) { await WordStore.promoteFromPool(id); App.navigate('wordbank'); }

async function deleteWord(id) {
  if (confirm('确定删除这个单词吗？此操作不可恢复。')) {
    await WordStore.delete(id);
    App.navigate('wordbank');
  }
}

async function initWordBank(container) {}
