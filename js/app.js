// app.js — Application entry point, hash router, and page dispatcher

const App = {
  currentPage: null,

  pages: {
    dashboard: { render: renderDashboard, init: initDashboard },
    study: { render: renderStudy, init: initStudy },
    stubborn: { render: renderStubborn, init: initStubborn },
    quiz: { render: renderQuiz, init: initQuiz },
    wordbank: { render: renderWordBank, init: initWordBank },
    settings: { render: renderSettings, init: initSettings },
  },

  async init() {
    await DB.init();

    // Auto-pull from GitHub on every page load (no token needed for reading)
    try {
      console.log('Auto-pulling from GitHub...');
      const result = await GithubSync.pull();
      if (result.success) {
        console.log(`Sync: +${result.added} new / ~${result.updated} updated / -${result.skipped} skipped`);
      }
    } catch (_) { /* offline — that's fine */ }

    window.addEventListener('hashchange', () => this.route());
    this.route();
  },

  async route() {
    const hash = location.hash.replace('#/', '') || 'dashboard';
    const page = this.pages[hash];
    if (!page) { location.hash = '#/dashboard'; return; }

    // Update top nav
    document.querySelectorAll('#main-nav a').forEach(a => {
      const isActive = a.dataset.page === hash;
      a.classList.toggle('active', isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    // Update bottom nav (mobile)
    document.querySelectorAll('#bottom-nav a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === hash);
    });

    // Check for stubborn words indicator
    await this.updateStubbornIndicator();

    // Render page
    const content = document.getElementById('content');
    content.innerHTML = '';
    const container = document.createElement('div');
    container.id = `page-${hash}`;
    try {
      await page.render(container);
    } catch (e) {
      console.error(`Error rendering page "${hash}":`, e);
      container.innerHTML = `<div class="card"><p style="color:var(--color-danger);">页面加载失败: ${e.message}</p></div>`;
    }
    content.appendChild(container);
    if (page.init) await page.init(container);

    this.currentPage = hash;
  },

  async updateStubbornIndicator() {
    const count = await WordStore.countStubborn();
    const link = document.querySelector('a[data-page="stubborn"]');
    if (link) {
      link.classList.toggle('stubborn-link', true);
      link.classList.toggle('has-stubborn', count > 0);
      if (count > 0) link.setAttribute('title', `${count} 个顽固词待攻克`);
    }
  },

  navigate(page) {
    location.hash = `#/${page}`;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
