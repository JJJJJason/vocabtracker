// pages/dashboard.js — Dashboard page with progress overview

async function renderDashboard(container) {
  const plan = await Scheduler.getTodayPlan();
  const settings = await DB.getSettings();
  const streak = await WordStore.getStreak();

  const newWords = [];
  const reviewWords = [];
  const stubbornWords = [];
  for (const id of plan.newWords) { const w = await WordStore.get(id); if (w) newWords.push(w); }
  for (const id of plan.reviewWords) { const w = await WordStore.get(id); if (w) reviewWords.push(w); }
  for (const id of plan.stubbornWords) { const w = await WordStore.get(id); if (w) stubbornWords.push(w); }

  const poolCount = await WordStore.countByStatus('pool');
  const masteredCount = await WordStore.countByStatus('mastered');
  const stubbornCount = await WordStore.countStubborn();
  const totalToStudy = newWords.length + reviewWords.length;

  container.innerHTML = `
    <div class="page-header">
      <h2>📊 学习仪表盘</h2>
      <p class="date">${new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card" onclick="App.navigate('study')">
        <div class="number">${totalToStudy}</div>
        <div class="label">今日待学</div>
      </div>
      <div class="stat-card">
        <div class="number">${newWords.length}</div>
        <div class="label">新词</div>
      </div>
      <div class="stat-card">
        <div class="number">${reviewWords.length}</div>
        <div class="label">待复习</div>
      </div>
      <div class="stat-card" onclick="App.navigate('stubborn')" style="${stubbornCount > 0 ? 'border: 2px solid var(--color-stubborn);' : ''}">
        <div class="number danger">${stubbornCount}</div>
        <div class="label">顽固词 🔴</div>
      </div>
      <div class="stat-card">
        <div class="number">${poolCount}</div>
        <div class="label">待背池</div>
      </div>
      <div class="stat-card">
        <div class="number">${masteredCount}</div>
        <div class="label">已掌握</div>
      </div>
      <div class="stat-card">
        <div class="number">${streak}</div>
        <div class="label">🔥 连续打卡</div>
      </div>
    </div>

    <div class="card" style="margin-top: 20px;">
      <h3>📋 今日计划概览</h3>
      ${totalToStudy === 0 && stubbornWords.length === 0 ? `
        <div class="empty-state">
          <div class="icon">🎉</div>
          <p>今天没有需要学习的单词！</p>
          <p style="font-size: 13px;">去「设置」导入新单词，或检查待背池</p>
        </div>
      ` : `
        <div style="margin-top: 12px;">
          ${plan.completed ? '<span class="badge badge-success">✅ 今日已完成</span>' : '<span class="badge badge-pending">⏳ 待完成</span>'}
        </div>
        ${newWords.length > 0 ? `<p style="margin-top: 8px;">🆕 ${newWords.length} 个新词: ${newWords.map(w => w.spelling).join(', ')}</p>` : ''}
        ${reviewWords.length > 0 ? `<p style="margin-top: 4px;">🔄 ${reviewWords.length} 个复习: ${reviewWords.map(w => w.spelling).join(', ')}</p>` : ''}
        ${stubbornWords.length > 0 ? `<p style="margin-top: 4px; color: var(--color-stubborn);">🎯 ${stubbornWords.length} 个顽固词待攻克: ${stubbornWords.map(w => w.spelling).join(', ')}</p>` : ''}
      `}
    </div>

    <div style="margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap;">
      <button class="btn btn-primary" onclick="App.navigate('study')" ${totalToStudy === 0 && stubbornWords.length === 0 ? 'disabled' : ''}>
        📖 开始今日学习
      </button>
      <button class="btn btn-outline" onclick="App.navigate('quiz')">
        📝 自由测试
      </button>
      ${stubbornCount > 0 ? `<button class="btn btn-danger" onclick="App.navigate('stubborn')">🎯 攻克顽固词 (${stubbornCount})</button>` : ''}
      <button class="btn btn-outline" onclick="downloadTodayPDF()">
        🖨️ 打印今日清单
      </button>
    </div>
  `;
}

async function initDashboard(container) {
  // Dashboard is mostly static after render
}

async function downloadTodayPDF() {
  const today = new Date().toISOString().split('T')[0];
  await PDFReport.printStudyList(today);
}
