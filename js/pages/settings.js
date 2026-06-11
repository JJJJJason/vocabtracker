// pages/settings.js — Settings and data import/export

async function renderSettings(container) {
  try {
    const settings = await DB.getSettings();

    container.innerHTML = `
      <div class="page-header"><h2>⚙️ 设置</h2></div>

      <div class="card">
        <h3>学习设置</h3>
        <div style="margin-top:12px; display:flex; flex-direction:column; gap:12px;">
          <label>每日新词上限: <input type="number" id="setting-daily-limit" value="${settings.dailyNewWordLimit}" min="1" max="50" style="width:70px; padding:6px; border-radius:6px; border:1px solid var(--color-border);"></label>
          <label>每日顽固词上限: <input type="number" id="setting-stubborn-limit" value="${settings.stubbornDailyLimit}" min="1" max="20" style="width:70px; padding:6px; border-radius:6px; border:1px solid var(--color-border);"></label>
          <button class="btn btn-primary" onclick="saveSettings()">保存设置</button>
        </div>
      </div>

      <div class="card">
        <h3>📥 导入单词</h3>
        <p style="color:var(--color-text-light); font-size:14px; margin:8px 0;">
          JSON 格式: [{"spelling": "word", "phonetic": "/.../", "meaning": "释义", "partOfSpeech": "v./n./adj.", "exampleSentence": "例句", "source": "来源"}]
        </p>
        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
          <input type="file" id="import-file" accept=".json" style="display:none" onchange="handleFileImport(event)">
          <button class="btn btn-primary" onclick="document.getElementById('import-file').click()">📁 选择 JSON 文件导入</button>
          <button class="btn btn-primary" onclick="pasteImport()">📋 从剪贴板导入</button>
        </div>
        <div id="import-result" style="margin-top:12px;"></div>
      </div>

      <div class="card">
        <h3>📤 导出/备份</h3>
        <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">
          <button class="btn btn-outline" onclick="exportWordsJSON()">📄 导出单词 (JSON)</button>
          <button class="btn btn-outline" onclick="exportFullBackup()">💾 完整备份 (含进度)</button>
          <button class="btn btn-outline" onclick="document.getElementById('restore-file').click()">📥 恢复备份</button>
          <input type="file" id="restore-file" accept=".json" style="display:none" onchange="handleRestoreBackup(event)">
        </div>
        <div id="export-result" style="margin-top:12px;"></div>
      </div>

      <div class="card">
        <h3>🗑️ 数据管理</h3>
        <p style="color:var(--color-text-light); font-size:13px; margin-bottom:8px;">清除数据前建议先导出备份</p>
        <button class="btn btn-danger" onclick="clearAllData()">清除所有数据</button>
      </div>
    `;
  } catch (e) {
    console.error('Settings render error:', e);
    container.innerHTML = '<div class="card"><p style="color:var(--color-danger);">设置页面加载失败: ' + e.message + '</p></div>';
  }
}

async function saveSettings() {
  const dailyLimit = parseInt(document.getElementById('setting-daily-limit').value) || 10;
  const stubbornLimit = parseInt(document.getElementById('setting-stubborn-limit').value) || 5;
  await DB.updateSettings({ dailyNewWordLimit: dailyLimit, stubbornDailyLimit: stubbornLimit });
  alert('设置已保存');
}

async function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const parsed = ImportExport.parseImportJSON(text);
  if (!parsed.valid && parsed.errors) {
    document.getElementById('import-result').innerHTML = `<p style="color:var(--color-danger);">❌ 数据验证失败: ${parsed.errors.join(', ')}</p>`;
    return;
  }
  const result = await ImportExport.importWords(parsed.words);
  document.getElementById('import-result').innerHTML = `
    <p style="color:var(--color-success);">✅ 导入成功！</p>
    <p>总计: ${result.total} | 今日学习: ${result.active} | 进入待背池: ${result.pooled}</p>`;
  event.target.value = '';
}

async function pasteImport() {
  try {
    const text = await navigator.clipboard.readText();
    const parsed = ImportExport.parseImportJSON(text);
    if (!parsed.valid) {
      document.getElementById('import-result').innerHTML = `<p style="color:var(--color-danger);">❌ ${parsed.error || parsed.errors.join(', ')}</p>`;
      return;
    }
    const result = await ImportExport.importWords(parsed.words);
    document.getElementById('import-result').innerHTML = `
      <p style="color:var(--color-success);">✅ 导入成功！总计: ${result.total} | 今日学习: ${result.active} | 进入待背池: ${result.pooled}</p>`;
  } catch (e) {
    document.getElementById('import-result').innerHTML = `<p style="color:var(--color-danger);">❌ 无法读取剪贴板: ${e.message}</p>`;
  }
}

async function exportWordsJSON() {
  const json = await ImportExport.exportAllWords();
  ImportExport.downloadAsFile(json, `单词导出-${new Date().toISOString().split('T')[0]}.json`);
  document.getElementById('export-result').innerHTML = '<p style="color:var(--color-success);">✅ 导出成功</p>';
}

async function exportFullBackup() {
  const json = await ImportExport.exportFullBackup();
  ImportExport.downloadAsFile(json, `完整备份-${new Date().toISOString().split('T')[0]}.json`);
  document.getElementById('export-result').innerHTML = '<p style="color:var(--color-success);">✅ 备份成功</p>';
}

async function handleRestoreBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm('恢复备份将覆盖当前所有数据，确定继续吗？')) { event.target.value = ''; return; }
  const text = await file.text();
  const result = await ImportExport.importFullBackup(text);
  if (result.success) {
    document.getElementById('export-result').innerHTML = `<p style="color:var(--color-success);">✅ 恢复成功，共 ${result.wordCount} 个单词</p>`;
    App.navigate('dashboard');
  } else {
    document.getElementById('export-result').innerHTML = `<p style="color:var(--color-danger);">❌ ${result.error}</p>`;
  }
  event.target.value = '';
}

async function clearAllData() {
  if (!confirm('确定清除所有数据吗？此操作不可恢复！\n\n建议先导出完整备份。')) return;
  if (!confirm('再次确认：清除所有单词、计划和设置？')) return;
  await DB.db.clear('words');
  await DB.db.clear('dailyPlans');
  await DB.db.put('settings', DB.defaultSettings());
  App.navigate('dashboard');
}

function initSettings(container) {}
