// pages/wordBank.js — Word library with search, filter, and manual edit

async function renderWordBank(container) {
  const allWords = await WordStore.getAll();
  const poolCount = await WordStore.countByStatus('pool');
  const masteredCount = await WordStore.countByStatus('mastered');
  const stubbornCount = await WordStore.countStubborn();

  container.innerHTML = `
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
      <div><h2>📚 单词库</h2><p class="date">共 ${allWords.length} 个单词</p></div>
      <button class="btn btn-primary" onclick="showAddWordForm()">＋ 录入单词</button>
    </div>
    <div class="card">
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
        <input type="text" id="word-search" class="quiz-input" placeholder="搜索单词..." style="max-width:200px; margin:0;" oninput="filterWordBank()">
        <select id="status-filter" onchange="filterWordBank()" style="font-size:var(--font-size-md); padding:8px 12px; border-radius:8px; border:1px solid var(--color-border); background:var(--color-card); color:var(--color-text);">
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
      <div class="form-group" style="margin-top:12px;">
        <label class="form-label">拼写
          <input id="edit-spelling" class="form-input word-spelling-input" value="${escapeHtml(w.spelling)}">
        </label>
        <label class="form-label">音标
          <input id="edit-phonetic" class="form-input" value="${escapeHtml(w.phonetic || '')}">
        </label>
        <label class="form-label">释义
          <input id="edit-meaning" class="form-input" value="${escapeHtml(w.meaning)}">
        </label>
        <label class="form-label">例句
          <input id="edit-sentence" class="form-input" value="${escapeHtml(w.exampleSentence || '')}">
        </label>
        <label class="form-label">来源
          <input id="edit-source" class="form-input" value="${escapeHtml(w.source || '')}">
        </label>
      </div>
      <div class="form-actions">
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

/* ── Add word form ────────────────────── */

function showAddWordForm() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:460px;">
      <h3 style="margin-bottom:12px;">➕ 录入新单词</h3>
      <p style="font-size:13px; color:var(--color-text-muted); margin-bottom:12px;">输入单词拼写，点击「查词」自动填充，或手动填写</p>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; gap:8px;">
          <input id="add-spelling" class="quiz-input word-spelling-input" placeholder="输入英文单词 *" style="flex:1; margin:0; text-align:left;" autocomplete="off" autocapitalize="off" spellcheck="false">
          <button class="btn btn-accent btn-sm" onclick="lookupWord()" style="white-space:nowrap;">🔍 查词</button>
        </div>
        <div id="lookup-status" style="font-size:12px; min-height:4px;"></div>
        <div style="display:flex; gap:8px;">
          <input id="add-pos" class="quiz-input" placeholder="词性" style="flex:1; margin:0; text-align:left;" list="pos-list">
          <input id="add-phonetic" class="quiz-input" placeholder="音标" style="flex:1; margin:0; text-align:left;">
        </div>
        <datalist id="pos-list">
          <option value="v."><option value="n."><option value="adj."><option value="adv.">
          <option value="prep."><option value="conj."><option value="pron."><option value="phr.">
        </datalist>
        <input id="add-meaning" class="quiz-input" placeholder="中文释义" style="margin:0; text-align:left;">
        <input id="add-sentence" class="quiz-input" placeholder="例句" style="margin:0; text-align:left;">
        <input id="add-source" class="quiz-input" placeholder="来源 (如 卷38-金水区)" style="margin:0; text-align:left;">
      </div>
      <div style="margin-top:18px; display:flex; gap:8px; justify-content:flex-end;">
        <button class="btn btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary btn-sm" onclick="submitAddWord()">确认录入</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  setTimeout(() => document.getElementById('add-spelling')?.focus(), 100);
  overlay.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAddWord(); });
  });
}

/* ── Dictionary lookup ────────────────── */

async function lookupWord() {
  const word = document.getElementById('add-spelling')?.value.trim();
  if (!word) { alert('请先输入单词拼写'); return; }

  const statusEl = document.getElementById('lookup-status');
  statusEl.innerHTML = '<span style="color:var(--color-accent);">⏳ 查询中...</span>';

  // Map English POS to Chinese abbreviations
  const posMap = {
    noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.',
    pronoun: 'pron.', preposition: 'prep.', conjunction: 'conj.',
    interjection: 'interj.', article: 'art.', determiner: 'det.',
  };

  let foundInLocal = false;

  try {
    // ── Step 1: Check local dictionary first for Chinese meaning ──
    const local = await DictLoader.lookup(word);
    if (local) {
      foundInLocal = true;
      if (local.phonetic) document.getElementById('add-phonetic').value = local.phonetic;
      if (local.meaning) document.getElementById('add-meaning').value = local.meaning;
      if (local.pos) document.getElementById('add-pos').value = local.pos;
      statusEl.innerHTML = '<span style="color:var(--color-accent);">📖 本地词典匹配，补充在线数据...</span>';
    }

    // ── Step 2: Fetch English data from dictionary API ──
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!resp.ok) {
      if (foundInLocal) {
        statusEl.innerHTML = '<span style="color:var(--color-success);">✅ 已从本地词典填充（该单词未在在线词典中找到）</span>';
        return;
      }
      statusEl.innerHTML = '<span style="color:var(--color-warning);">⚠️ 未找到该单词，请手动填写</span>';
      return;
    }
    const data = await resp.json();
    const entry = data[0];

    // Extract data from API
    const phonetic = entry.phonetic || (entry.phonetics?.find(p => p.text)?.text) || '';
    const meaning = entry.meanings?.[0];
    const pos = meaning?.partOfSpeech || '';
    const definition = meaning?.definitions?.[0]?.definition || '';
    const example = meaning?.definitions?.[0]?.example || '';

    // Fill fields from API (don't overwrite local dict data if already set)
    if (phonetic && !document.getElementById('add-phonetic').value) {
      document.getElementById('add-phonetic').value = phonetic;
    }
    if (pos && !document.getElementById('add-pos').value) {
      document.getElementById('add-pos').value = posMap[pos] || pos + '.';
    }
    if (example && !document.getElementById('add-sentence').value) {
      document.getElementById('add-sentence').value = example;
    }

    // ── Step 3: If not in local dict, translate definition to Chinese ──
    if (!foundInLocal && definition) {
      try {
        const tResp = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(definition)}&langpair=en|zh-CN`
        );
        const tData = await tResp.json();
        const zhMeaning = tData?.responseData?.translatedText;
        if (zhMeaning && zhMeaning !== definition) {
          document.getElementById('add-meaning').value = zhMeaning;
        } else {
          document.getElementById('add-meaning').value = definition;
        }
        statusEl.innerHTML = '<span style="color:var(--color-warning);">⚠️ 本地词典未收录，使用机器翻译（建议核对释义）</span>';
      } catch (_) {
        document.getElementById('add-meaning').value = definition;
        statusEl.innerHTML = '<span style="color:var(--color-warning);">⚠️ 本地词典未收录，显示英文释义</span>';
      }
    } else if (foundInLocal) {
      statusEl.innerHTML = '<span style="color:var(--color-success);">✅ 已自动填充（含本地词典中文释义），请检查后确认</span>';
    }

  } catch (e) {
    // If we already have local data, the API failure is less critical
    if (foundInLocal) {
      statusEl.innerHTML = '<span style="color:var(--color-success);">✅ 已从本地词典填充（在线查询失败）</span>';
    } else {
      statusEl.innerHTML = '<span style="color:var(--color-danger);">❌ 网络错误，请手动填写</span>';
    }
  }
}

async function submitAddWord() {
  const spelling = document.getElementById('add-spelling')?.value.trim();
  if (!spelling) { alert('请输入单词拼写'); return; }

  const wordData = {
    spelling,
    meaning: document.getElementById('add-meaning')?.value.trim() || '',
    phonetic: document.getElementById('add-phonetic')?.value.trim() || '',
    partOfSpeech: document.getElementById('add-pos')?.value.trim() || '',
    exampleSentence: document.getElementById('add-sentence')?.value.trim() || '',
    source: document.getElementById('add-source')?.value.trim() || '',
  };

  await WordStore.add(wordData);
  GithubSync.push().catch(() => {});

  document.querySelector('.modal-overlay')?.remove();
  App.navigate('wordbank');
}

async function initWordBank(container) {}
