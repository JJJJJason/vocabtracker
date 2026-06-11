# 背单词工具 (VocabTracker) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-dependency (CDN-only), pure frontend vocabulary learning web app with Ebbinghaus spaced repetition, 4 quiz types, stubborn word tracking, and PDF export.

**Architecture:** Single-page vanilla JS app. IndexedDB for persistence via the `idb` library (CDN). jsPDF (CDN) for PDF generation. Web Speech API for pronunciation. All routing is hash-based SPA. No build step, no framework, no backend.

**Tech Stack:** HTML5, CSS3, Vanilla JS (ES2020+), idb (IndexedDB wrapper), jsPDF, Web Speech API

**Source spec:** /Users/jason/.claude/plans/1-2-mighty-stream.md

---

## File Structure

```
/工具开发/word-tool/
├── index.html              # Entry point — SPA shell, CDN imports, nav
├── css/
│   └── style.css           # All styles (CSS custom properties, mobile-first)
├── js/
│   ├── app.js              # App init, hash router, page dispatcher
│   ├── db.js               # IndexedDB schema + open/upgrade via idb
│   ├── wordStore.js        # Word CRUD: add, get, update, query, delete
│   ├── scheduler.js        # Ebbinghaus logic, daily plan generation
│   ├── quizEngine.js       # Quiz question generation + answer checking
│   ├── importExport.js     # JSON import/export, clipboard paste
│   ├── pdfReport.js        # jsPDF-based report generation
│   └── pages/
│       ├── dashboard.js    # Dashboard page render + logic
│       ├── study.js        # Today's learning (new words + review)
│       ├── stubborn.js     # Stubborn words intensive training
│       ├── quiz.js         # Quiz center — 4 question types
│       ├── wordBank.js     # Word bank — search, filter, edit
│       └── settings.js     # Settings, import/export UI, about
├── data/
│   └── sample.json         # 10 sample words for testing
└── README.md
```

---

### Task 1: Project Scaffolding — HTML Shell + CSS Foundation

**Files:**
- Create: `/工具开发/word-tool/index.html`
- Create: `/工具开发/word-tool/css/style.css`
- Create: `/工具开发/word-tool/js/app.js`

- [ ] **Step 1: Create index.html — SPA shell with navigation**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>背单词 · VocabTracker</title>
  <link rel="stylesheet" href="css/style.css">
  <script src="https://cdn.jsdelivr.net/npm/idb@8/build/umd.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf@2/dist/jspdf.umd.min.js"></script>
</head>
<body>
  <div id="app">
    <header>
      <h1 class="logo">📖 VocabTracker</h1>
      <nav id="main-nav">
        <a href="#/dashboard" data-page="dashboard">仪表盘</a>
        <a href="#/study" data-page="study">今日学习</a>
        <a href="#/stubborn" data-page="stubborn">专项攻克</a>
        <a href="#/quiz" data-page="quiz">测试中心</a>
        <a href="#/wordbank" data-page="wordbank">单词库</a>
        <a href="#/settings" data-page="settings">设置</a>
      </nav>
    </header>
    <main id="content"></main>
    <footer>
      <p>VocabTracker · 每天进步一点点</p>
    </footer>
  </div>

  <!-- JS modules loaded in dependency order -->
  <script src="js/db.js"></script>
  <script src="js/wordStore.js"></script>
  <script src="js/scheduler.js"></script>
  <script src="js/quizEngine.js"></script>
  <script src="js/importExport.js"></script>
  <script src="js/pdfReport.js"></script>
  <script src="js/pages/dashboard.js"></script>
  <script src="js/pages/study.js"></script>
  <script src="js/pages/stubborn.js"></script>
  <script src="js/pages/quiz.js"></script>
  <script src="js/pages/wordBank.js"></script>
  <script src="js/pages/settings.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create style.css — CSS variables and base styles**

```css
:root {
  --color-primary: #4A90D9;
  --color-primary-dark: #357ABD;
  --color-success: #27AE60;
  --color-danger: #E74C3C;
  --color-warning: #F39C12;
  --color-stubborn: #E74C3C;
  --color-bg: #F5F7FA;
  --color-card: #FFFFFF;
  --color-text: #2C3E50;
  --color-text-light: #7F8C8D;
  --color-border: #E1E8ED;
  --radius: 12px;
  --shadow: 0 2px 8px rgba(0,0,0,0.08);
  --font-size-base: 16px;
  --font-size-lg: 20px;
  --font-size-xl: 28px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-base);
  line-height: 1.6;
  min-height: 100vh;
}

#app {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 20px;
}

.logo { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-primary); }

#main-nav {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

#main-nav a {
  text-decoration: none;
  color: var(--color-text-light);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

#main-nav a:hover,
#main-nav a.active {
  background: var(--color-primary);
  color: white;
}

#main-nav a.stubborn-link.active {
  background: var(--color-stubborn);
}
#main-nav a.stubborn-link.has-stubborn:not(.active)::after {
  content: ' ●';
  color: var(--color-stubborn);
}

main#content { flex: 1; }

footer {
  text-align: center;
  padding: 16px 0;
  color: var(--color-text-light);
  font-size: 13px;
  border-top: 1px solid var(--color-border);
  margin-top: 20px;
}

/* Shared component styles */
.card {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
  margin-bottom: 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary { background: var(--color-primary); color: white; }
.btn-primary:hover { background: var(--color-primary-dark); }
.btn-success { background: var(--color-success); color: white; }
.btn-danger { background: var(--color-danger); color: white; }
.btn-outline { background: transparent; border: 2px solid var(--color-primary); color: var(--color-primary); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.stat-card {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
  text-align: center;
}

.stat-card .number {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-card .number.danger { color: var(--color-danger); }
.stat-card .label { font-size: 13px; color: var(--color-text-light); margin-top: 4px; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-light);
}

.empty-state .icon { font-size: 48px; margin-bottom: 12px; }
.empty-state p { margin-bottom: 16px; }

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

@media (max-width: 600px) {
  #app { padding: 8px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .card { padding: 14px; }
}
```

- [ ] **Step 3: Create app.js — router and page dispatcher**

```javascript
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
    window.addEventListener('hashchange', () => this.route());
    this.route();
  },

  async route() {
    const hash = location.hash.replace('#/', '') || 'dashboard';
    const page = this.pages[hash];
    if (!page) { location.hash = '#/dashboard'; return; }

    // Update nav
    document.querySelectorAll('#main-nav a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === hash);
    });

    // Check for stubborn words indicator
    await this.updateStubbornIndicator();

    // Render page
    const content = document.getElementById('content');
    content.innerHTML = '';
    const container = document.createElement('div');
    container.id = `page-${hash}`;
    page.render(container);
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
```

- [ ] **Step 4: Verify scaffolding**

Run: Open `index.html` in browser (or `open index.html`)
Expected: See navigation bar with 6 tabs, dashboard page shows empty content, clicking nav tabs changes hash and shows different empty pages.

- [ ] **Step 5: Commit**

```bash
cd /Users/jason/WorkBuddy/2026-05-30-20-40-13/卷子库/工具开发/word-tool
git init
git add index.html css/style.css js/app.js
git commit -m "feat: project scaffolding — HTML shell, CSS foundation, SPA router"
```

---

### Task 2: Database Layer — IndexedDB Schema via idb

**Files:**
- Create: `/工具开发/word-tool/js/db.js`

- [ ] **Step 1: Create db.js — IndexedDB open/upgrade with full schema**

```javascript
// db.js — IndexedDB initialization and schema management via idb library

const DB = {
  db: null,
  DB_NAME: 'vocabtracker',
  DB_VERSION: 1,

  async init() {
    if (this.db) return this.db;

    this.db = await idb.openDB(this.DB_NAME, this.DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Words store
        if (!db.objectStoreNames.contains('words')) {
          const wordStore = db.createObjectStore('words', { keyPath: 'id' });
          wordStore.createIndex('status', 'status');
          wordStore.createIndex('nextReviewDate', 'nextReviewDate');
          wordStore.createIndex('isStubborn', 'isStubborn');
          wordStore.createIndex('createdAt', 'createdAt');
        }

        // Settings store (single record with key 'main')
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Daily plans store
        if (!db.objectStoreNames.contains('dailyPlans')) {
          const planStore = db.createObjectStore('dailyPlans', { keyPath: 'date' });
          planStore.createIndex('completed', 'completed');
        }
      },
    });

    // Bootstrap default settings if not present
    const existing = await this.db.get('settings', 'main');
    if (!existing) {
      await this.db.put('settings', this.defaultSettings());
    }

    return this.db;
  },

  defaultSettings() {
    return {
      key: 'main',
      dailyNewWordLimit: 10,
      stubbornDailyLimit: 5,
      ebbinghausIntervals: [1, 2, 4, 7, 15],
    };
  },

  async getSettings() {
    return await this.db.get('settings', 'main');
  },

  async updateSettings(partial) {
    const current = await this.getSettings();
    const updated = { ...current, ...partial };
    await this.db.put('settings', updated);
    return updated;
  },
};
```

- [ ] **Step 2: Verify DB opens**

Run: Add this test to app.js temporarily:
```javascript
// In App.init() after DB.init():
const settings = await DB.getSettings();
console.log('DB OK, settings:', settings);
```
Open `index.html` in browser, check console.
Expected: `DB OK, settings: { key: 'main', dailyNewWordLimit: 10, ... }`

- [ ] **Step 3: Commit**

```bash
git add js/db.js js/app.js
git commit -m "feat: IndexedDB layer with words, settings, and dailyPlans stores"
```

---

### Task 3: Word Store — CRUD Operations

**Files:**
- Create: `/工具开发/word-tool/js/wordStore.js`

- [ ] **Step 1: Create wordStore.js**

```javascript
// wordStore.js — Word CRUD and query operations

const WordStore = {
  /** Generate a simple UUID v4 */
  generateId() {
    return 'w_' + crypto.randomUUID();
  },

  /** Create a new word object with defaults */
  createWord({ spelling, phonetic, meaning, exampleSentence, source }) {
    return {
      id: this.generateId(),
      spelling: spelling.trim(),
      phonetic: phonetic || '',
      meaning: meaning.trim(),
      exampleSentence: exampleSentence || '',
      source: source || '',
      stage: 0,
      nextReviewDate: new Date().toISOString().split('T')[0],
      difficulty: 1,
      reviewHistory: [],
      failStreak: 0,
      isStubborn: false,
      stubbornPassCount: 0,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
  },

  /** Add a new word to the store */
  async add(wordData) {
    const word = this.createWord(wordData);
    await DB.db.add('words', word);
    return word;
  },

  /** Add multiple words in a transaction. Those exceeding daily limit get status='pool' */
  async addBatch(wordDataList) {
    const settings = await DB.getSettings();
    const limit = settings.dailyNewWordLimit;

    // Count words already active today (new words for today)
    const today = new Date().toISOString().split('T')[0];
    const allActive = await DB.db.getAllFromIndex('words', 'status', 'active');
    const todayActive = allActive.filter(w =>
      w.stage === 0 && w.createdAt.split('T')[0] === today
    );
    const remaining = Math.max(0, limit - todayActive.length);

    const results = [];
    const tx = DB.db.transaction('words', 'readwrite');

    for (let i = 0; i < wordDataList.length; i++) {
      const word = this.createWord(wordDataList[i]);
      if (remaining > 0 && i < remaining) {
        word.status = 'active';
      } else {
        word.status = 'pool';
      }
      await tx.store.add(word);
      results.push(word);
    }

    await tx.done;
    return results;
  },

  /** Get a single word by id */
  async get(id) {
    return await DB.db.get('words', id);
  },

  /** Update a word */
  async update(id, changes) {
    const word = await this.get(id);
    if (!word) throw new Error(`Word not found: ${id}`);
    const updated = { ...word, ...changes };
    await DB.db.put('words', updated);
    return updated;
  },

  /** Delete a word */
  async delete(id) {
    await DB.db.delete('words', id);
  },

  /** Get all words */
  async getAll() {
    return await DB.db.getAll('words');
  },

  /** Get words due for review on or before a given date */
  async getDueForReview(date) {
    const all = await DB.db.getAll('words');
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return all.filter(w =>
      (w.status === 'active') &&
      w.nextReviewDate <= dateStr &&
      !w.isStubborn
    );
  },

  /** Get all stubborn words (isStubborn = true) */
  async getStubborn() {
    return await DB.db.getAllFromIndex('words', 'isStubborn', true);
  },

  /** Count stubborn words */
  async countStubborn() {
    const stubborn = await this.getStubborn();
    return stubborn.length;
  },

  /** Get pool words (status = 'pool') */
  async getPoolWords() {
    return await DB.db.getAllFromIndex('words', 'status', 'pool');
  },

  /** Move a word from pool to active */
  async promoteFromPool(id) {
    const word = await this.get(id);
    if (word && word.status === 'pool') {
      return await this.update(id, { status: 'active' });
    }
    return word;
  },

  /** Get words by status */
  async getByStatus(status) {
    return await DB.db.getAllFromIndex('words', 'status', status);
  },

  /** Count words by status */
  async countByStatus(status) {
    const words = await this.getByStatus(status);
    return words.length;
  },

  /** Get streak of consecutive days with completed study */
  async getStreak() {
    const plans = await DB.db.getAll('dailyPlans');
    const completed = plans.filter(p => p.completed).map(p => p.date).sort().reverse();
    if (completed.length === 0) return 0;

    let streak = 1;
    const today = new Date();
    for (let i = 1; i < completed.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (completed[i - 1] === expected.toISOString().split('T')[0]) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },
};
```

- [ ] **Step 2: Verify in browser console**

Open `index.html`, in console:
```javascript
await WordStore.add({ spelling: 'abandon', phonetic: '/əˈbændən/', meaning: '放弃', exampleSentence: 'He abandoned the plan.', source: '卷38' });
await WordStore.getAll();
```
Expected: Returns array with one word object with all defaults filled in.

- [ ] **Step 3: Commit**

```bash
git add js/wordStore.js
git commit -m "feat: word store — CRUD, batch import with pool overflow, queries"
```

---

### Task 4: Scheduler — Ebbinghaus Logic + Daily Plan

**Files:**
- Create: `/工具开发/word-tool/js/scheduler.js`

- [ ] **Step 1: Create scheduler.js**

```javascript
// scheduler.js — Ebbinghaus spaced repetition scheduler and daily plan generation

const Scheduler = {
  /**
   * Calculate the next review date based on current stage.
   * Intervals: stage 0→1 (1 day), 1→2 (2 days), 2→3 (4 days), 3→4 (7 days), 4→5 (15 days), 5→6 (mastered)
   */
  getNextReviewDate(stage) {
    const intervals = [1, 2, 4, 7, 15]; // days to wait before next review
    const today = new Date();

    if (stage >= intervals.length) {
      // Mastered — no more reviews needed
      return null;
    }

    const daysToAdd = intervals[stage];
    const next = new Date(today);
    next.setDate(next.getDate() + daysToAdd);
    return next.toISOString().split('T')[0];
  },

  /**
   * Process a word after review. Returns the updated word properties.
   * @param {Object} word - The word being reviewed
   * @param {boolean} passed - Whether the user passed the review
   */
  processReview(word, passed) {
    const updates = {};
    const now = new Date().toISOString().split('T')[0];

    // Record review history
    const history = [...(word.reviewHistory || []), { date: now, result: passed ? 'pass' : 'fail' }];
    updates.reviewHistory = history;

    if (passed) {
      // Pass: advance to next stage, reset fail streak
      updates.stage = word.stage + 1;
      updates.failStreak = 0;
      updates.difficulty = Math.max(1, (word.difficulty || 1) - 1);

      if (word.stage + 1 >= 5) {
        // Mastered
        updates.status = 'mastered';
        updates.nextReviewDate = null;
      } else {
        updates.nextReviewDate = this.getNextReviewDate(word.stage);
      }
    } else {
      // Fail: go back to stage 0, increment fail streak
      updates.stage = 0;
      updates.nextReviewDate = now; // Review again tomorrow
      updates.failStreak = (word.failStreak || 0) + 1;
      updates.difficulty = Math.min(5, (word.difficulty || 1) + 1);

      // Check if word becomes stubborn
      if (updates.failStreak >= 3) {
        updates.isStubborn = true;
        updates.stubbornPassCount = 0;
      }
    }

    return updates;
  },

  /**
   * Process a stubborn word review.
   * Stubborn words need ALL question types correct in one session.
   * 2 consecutive passes → exit stubborn, reset to normal Ebbinghaus.
   */
  processStubbornReview(word, passed) {
    const updates = {};
    const now = new Date().toISOString().split('T')[0];

    // Record review
    const history = [...(word.reviewHistory || []), { date: now, result: passed ? 'pass' : 'fail', type: 'stubborn' }];
    updates.reviewHistory = history;

    if (passed) {
      updates.stubbornPassCount = (word.stubbornPassCount || 0) + 1;

      if (updates.stubbornPassCount >= 2) {
        // Exit stubborn — return to normal Ebbinghaus
        updates.isStubborn = false;
        updates.stubbornPassCount = 0;
        updates.failStreak = 0;
        updates.stage = 0;
        updates.nextReviewDate = this.getNextReviewDate(0);
        updates.status = 'active';
      }
    } else {
      // Failed again — reset stubborn pass counter
      updates.stubbornPassCount = 0;
      updates.failStreak = (word.failStreak || 0) + 1;
    }

    return updates;
  },

  /**
   * Generate today's daily plan.
   * Includes: new words from pool (up to limit), due review words, stubborn words (up to limit)
   */
  async generateDailyPlan(date) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // Check if plan already exists
    let plan = await DB.db.get('dailyPlans', dateStr);
    if (plan) return plan;

    const settings = await DB.getSettings();

    // 1. Get words due for review today
    const dueWords = await WordStore.getDueForReview(dateStr);

    // 2. Get pool words to promote (up to daily limit, minus already-active new words)
    const todayActiveNew = dueWords.filter(w => w.stage === 0);
    const poolWords = await WordStore.getPoolWords();
    const newSlots = Math.max(0, settings.dailyNewWordLimit - todayActiveNew.length);
    const newWordsToAdd = poolWords.slice(0, newSlots);

    // Promote these words from pool to active
    for (const w of newWordsToAdd) {
      await WordStore.promoteFromPool(w.id);
    }

    // 3. Get stubborn words for today (up to stubbornDailyLimit)
    const allStubborn = await WordStore.getStubborn();
    const stubbornForToday = allStubborn.slice(0, settings.stubbornDailyLimit);

    // Create the plan
    plan = {
      date: dateStr,
      newWords: newWordsToAdd.map(w => w.id),
      reviewWords: dueWords.filter(w => w.stage > 0).map(w => w.id),
      stubbornWords: stubbornForToday.map(w => w.id),
      completed: false,
    };

    await DB.db.put('dailyPlans', plan);
    return plan;
  },

  /**
   * Get today's plan (creates one if not exists)
   */
  async getTodayPlan() {
    const today = new Date().toISOString().split('T')[0];
    return await this.generateDailyPlan(today);
  },

  /**
   * Mark today's plan as completed
   */
  async completeTodayPlan() {
    const today = new Date().toISOString().split('T')[0];
    const plan = await DB.db.get('dailyPlans', today);
    if (plan) {
      plan.completed = true;
      await DB.db.put('dailyPlans', plan);
    }
    return plan;
  },
};
```

- [ ] **Step 2: Verify scheduler logic in browser console**

```javascript
// Create a test word
const w = await WordStore.add({ spelling: 'test', phonetic: '/t/', meaning: '测试', exampleSentence: 'This is a test.', source: 'debug' });
console.log('New word stage:', w.stage); // 0

// Simulate pass
const updates = Scheduler.processReview(w, true);
console.log('After pass:', updates.stage, updates.nextReviewDate); // stage 1, tomorrow

// Simulate fail
const w2 = { ...w, failStreak: 2 };
const updates2 = Scheduler.processReview(w2, false);
console.log('After 3rd fail:', updates2.isStubborn, updates2.failStreak); // true, 3
```

- [ ] **Step 3: Commit**

```bash
git add js/scheduler.js
git commit -m "feat: Ebbinghaus scheduler with stubborn word detection and daily plan generation"
```

---

### Task 5: Quiz Engine — Question Generation + Answer Checking

**Files:**
- Create: `/工具开发/word-tool/js/quizEngine.js`

- [ ] **Step 1: Create quizEngine.js**

```javascript
// quizEngine.js — Quiz question generation and answer validation

const QuizEngine = {
  /**
   * Generate a multiple-choice (英译中) question for a word.
   * Shows English spelling, user picks the correct Chinese meaning from 4 options.
   * Distractors come from other words in the database.
   */
  async generateEnToCh(word) {
    const allWords = await WordStore.getAll();
    const others = allWords.filter(w => w.id !== word.id);

    // Pick 3 random distractors
    const shuffled = others.sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, 3).map(w => w.meaning);

    // If not enough distractors, fill with generic ones
    while (distractors.length < 3) {
      distractors.push('(其他释义)');
    }

    const options = [word.meaning, ...distractors].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(word.meaning);

    return {
      type: 'en_to_ch',
      wordId: word.id,
      prompt: word.spelling,
      phonetic: word.phonetic,
      options: options,
      correctIndex: correctIndex,
    };
  },

  /**
   * Generate a spelling (中译英) question.
   * Shows Chinese meaning, user types the English spelling.
   */
  generateChToEn(word) {
    return {
      type: 'ch_to_en',
      wordId: word.id,
      prompt: word.meaning,
      answer: word.spelling,
      phonetic: word.phonetic,
      // Accept answer if edit distance <= 1 (allow minor typos)
      checkAnswer(userInput) {
        const input = userInput.trim().toLowerCase();
        const correct = this.answer.toLowerCase();
        if (input === correct) return { correct: true };

        // Simple Levenshtein distance check for minor typos
        const distance = QuizEngine._levenshtein(input, correct);
        return {
          correct: distance <= 1,
          hint: distance <= 2 ? `很接近了！正确答案是: ${this.answer}` : `正确答案是: ${this.answer}`,
        };
      },
    };
  },

  /**
   * Generate a dictation (听写) question.
   * Uses Web Speech API to read the word, user types spelling.
   */
  generateDictation(word) {
    return {
      type: 'dictation',
      wordId: word.id,
      answer: word.spelling,
      meaning: word.meaning, // Show meaning as hint
      async speak() {
        return new Promise((resolve, reject) => {
          if (!window.speechSynthesis) {
            reject(new Error('Speech synthesis not supported'));
            return;
          }
          const utterance = new SpeechSynthesisUtterance(this.answer);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          utterance.onend = resolve;
          utterance.onerror = reject;
          window.speechSynthesis.speak(utterance);
        });
      },
      checkAnswer(userInput) {
        const input = userInput.trim().toLowerCase();
        const correct = this.answer.toLowerCase();
        if (input === correct) return { correct: true };
        const distance = QuizEngine._levenshtein(input, correct);
        return {
          correct: distance <= 1,
          hint: `正确答案是: ${this.answer}`,
        };
      },
    };
  },

  /**
   * Generate a fill-in-the-blank (例句填空) question.
   * Shows the example sentence with the word blanked out.
   */
  generateFillBlank(word) {
    if (!word.exampleSentence) return null;

    const sentence = word.exampleSentence;
    // Find the word in the sentence (case insensitive)
    const regex = new RegExp(word.spelling.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const blankSentence = sentence.replace(regex, '________');

    // If word not found in sentence, prepend it
    if (blankSentence === sentence) return null;

    // Generate 4 options
    return this._generateFillBlankOptions(word, blankSentence);
  },

  async _generateFillBlankOptions(word, blankSentence) {
    const allWords = await WordStore.getAll();
    const others = allWords.filter(w => w.id !== word.id);
    const shuffled = others.sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, 3).map(w => w.spelling);

    while (distractors.length < 3) {
      distractors.push('______');
    }

    const options = [word.spelling, ...distractors].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(word.spelling);

    return {
      type: 'fill_blank',
      wordId: word.id,
      prompt: blankSentence,
      meaning: word.meaning,
      options: options,
      correctIndex: correctIndex,
    };
  },

  /**
   * Generate all question types for a word.
   * Order: en_to_ch → ch_to_en → dictation → fill_blank
   */
  async generateAllForWord(word) {
    const questions = [];
    questions.push(await this.generateEnToCh(word));
    questions.push(this.generateChToEn(word));
    questions.push(this.generateDictation(word));
    const fb = await this.generateFillBlank(word);
    if (fb) questions.push(fb);
    return questions;
  },

  /** Levenshtein distance for typo tolerance */
  _levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  },
};
```

- [ ] **Step 2: Verify quiz generation in browser console**

```javascript
const w = await WordStore.add({ spelling: 'library', phonetic: '/ˈlaɪbrəri/', meaning: '图书馆', exampleSentence: 'I went to the library to study.', source: 'test' });
const q = await QuizEngine.generateEnToCh(w);
console.log('Quiz:', q);
// Check q.options includes '图书馆' and has 4 items
console.assert(q.options.length === 4);
console.assert(q.options[q.correctIndex] === '图书馆');
```

- [ ] **Step 3: Commit**

```bash
git add js/quizEngine.js
git commit -m "feat: quiz engine — 4 question types with typo-tolerant checking"
```

---

### Task 6: Import/Export — JSON + Clipboard

**Files:**
- Create: `/工具开发/word-tool/js/importExport.js`

- [ ] **Step 1: Create importExport.js**

```javascript
// importExport.js — JSON import/export and clipboard operations

const ImportExport = {
  /** Expected JSON format for import */
  validateWordData(data) {
    if (!data || typeof data !== 'object') return { valid: false, error: '数据格式错误' };
    if (!data.spelling || typeof data.spelling !== 'string') return { valid: false, error: '缺少拼写(spelling)' };
    if (!data.meaning || typeof data.meaning !== 'string') return { valid: false, error: '缺少释义(meaning)' };
    return { valid: true };
  },

  /** Parse and validate a JSON import string */
  parseImportJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) {
        return { valid: false, error: 'JSON 应该是一个单词数组' };
      }

      const results = [];
      const errors = [];
      for (let i = 0; i < data.length; i++) {
        const validation = this.validateWordData(data[i]);
        if (validation.valid) {
          results.push(data[i]);
        } else {
          errors.push(`第 ${i + 1} 个: ${validation.error}`);
        }
      }

      return { valid: errors.length === 0, words: results, errors };
    } catch (e) {
      return { valid: false, error: `JSON 解析失败: ${e.message}` };
    }
  },

  /** Import words from parsed JSON data */
  async importWords(wordDataList) {
    const result = await WordStore.addBatch(wordDataList);
    const active = result.filter(w => w.status === 'active');
    const pooled = result.filter(w => w.status === 'pool');
    return { total: result.length, active: active.length, pooled: pooled.length, words: result };
  },

  /** Export all words as JSON */
  async exportAllWords() {
    const words = await WordStore.getAll();
    // Strip internal fields for export
    const exportData = words.map(w => ({
      spelling: w.spelling,
      phonetic: w.phonetic,
      meaning: w.meaning,
      exampleSentence: w.exampleSentence,
      source: w.source,
    }));
    return JSON.stringify(exportData, null, 2);
  },

  /** Export full data (including review state) for backup */
  async exportFullBackup() {
    const words = await WordStore.getAll();
    const settings = await DB.getSettings();
    const plans = await DB.db.getAll('dailyPlans');
    return JSON.stringify({ words, settings, plans, exportDate: new Date().toISOString() }, null, 2);
  },

  /** Import full backup */
  async importFullBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.words || !Array.isArray(data.words)) {
        return { success: false, error: '备份文件格式不正确' };
      }

      // Clear existing data
      await DB.db.clear('words');
      await DB.db.clear('dailyPlans');

      // Restore words
      const tx = DB.db.transaction('words', 'readwrite');
      for (const w of data.words) {
        await tx.store.add(w);
      }
      await tx.done;

      // Restore plans
      if (data.plans) {
        const tx2 = DB.db.transaction('dailyPlans', 'readwrite');
        for (const p of data.plans) {
          await tx2.store.add(p);
        }
        await tx2.done;
      }

      // Restore settings
      if (data.settings) {
        await DB.db.put('settings', data.settings);
      }

      return { success: true, wordCount: data.words.length };
    } catch (e) {
      return { success: false, error: `恢复失败: ${e.message}` };
    }
  },

  /** Download a string as a file */
  downloadAsFile(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
```

- [ ] **Step 2: Verify import in browser console**

```javascript
const testData = [
  { spelling: 'apple', phonetic: '/ˈæp.əl/', meaning: '苹果', exampleSentence: 'I eat an apple.', source: 'test' },
  { spelling: 'banana', phonetic: '/bəˈnæn.ə/', meaning: '香蕉', exampleSentence: 'The banana is yellow.', source: 'test' },
];
const r = ImportExport.parseImportJSON(JSON.stringify(testData));
console.log('Parse result:', r);
const imported = await ImportExport.importWords(r.words);
console.log('Imported:', imported);
```

- [ ] **Step 3: Commit**

```bash
git add js/importExport.js
git commit -m "feat: JSON import/export with validation, batch import, and full backup"
```

---

### Task 7: PDF Report Generation

**Files:**
- Create: `/工具开发/word-tool/js/pdfReport.js`

- [ ] **Step 1: Create pdfReport.js**

```javascript
// pdfReport.js — PDF report generation using jsPDF

const PDFReport = {
  /**
   * Generate a daily study list PDF (背诵清单).
   * Includes: date, new words table, review words table, stubborn words section
   */
  async generateStudyList(dateStr) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const plan = await DB.db.get('dailyPlans', dateStr) || await Scheduler.generateDailyPlan(dateStr);

    // Title
    doc.setFontSize(18);
    doc.text('📖 今日背诵清单', 14, 20);
    doc.setFontSize(12);
    doc.text(`日期: ${dateStr}`, 14, 30);

    let y = 42;

    // New words section
    if (plan.newWords.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(74, 144, 217);
      doc.text('🆕 新词学习', 14, y);
      y += 10;

      for (const id of plan.newWords) {
        const w = await WordStore.get(id);
        if (!w) continue;
        y = this._drawWordRow(doc, w, y);
        if (y > 270) { doc.addPage(); y = 20; }
      }
    }

    // Review words section
    if (plan.reviewWords.length > 0) {
      y += 8;
      doc.setFontSize(14);
      doc.setTextColor(39, 174, 96);
      doc.text('🔄 复习巩固', 14, y);
      y += 10;

      for (const id of plan.reviewWords) {
        const w = await WordStore.get(id);
        if (!w) continue;
        y = this._drawWordRow(doc, w, y);
        if (y > 270) { doc.addPage(); y = 20; }
      }
    }

    // Stubborn words section
    if (plan.stubbornWords.length > 0) {
      y += 8;
      doc.setFontSize(14);
      doc.setTextColor(231, 76, 60);
      doc.text('🎯 专项攻克 (顽固词)', 14, y);
      y += 10;

      for (const id of plan.stubbornWords) {
        const w = await WordStore.get(id);
        if (!w) continue;
        y = this._drawWordRow(doc, w, y);
        if (y > 270) { doc.addPage(); y = 20; }
      }
    }

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    doc.text('Generated by VocabTracker · 每天进步一点点', 14, 285);

    return doc;
  },

  /** Draw a single word row, return new y position */
  _drawWordRow(doc, word, y) {
    doc.setFontSize(11);
    doc.setTextColor(44, 62, 80);
    doc.text(`${word.spelling}  ${word.phonetic || ''}`, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    doc.text(`   ${word.meaning}`, 14, y);
    if (word.exampleSentence) {
      y += 6;
      doc.text(`   ${word.exampleSentence}`, 14, y);
    }
    y += 8;
    return y;
  },

  /**
   * Generate a quiz/test PDF (测试卷).
   * For each word: en→ch multiple choice, ch→en spelling blank
   */
  async generateQuizSheet(dateStr) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const plan = await DB.db.get('dailyPlans', dateStr) || await Scheduler.generateDailyPlan(dateStr);
    const allWordIds = [...plan.newWords, ...plan.reviewWords, ...plan.stubbornWords];
    const words = [];
    for (const id of allWordIds) {
      const w = await WordStore.get(id);
      if (w) words.push(w);
    }

    doc.setFontSize(18);
    doc.text('📝 单词测试卷', 14, 20);
    doc.setFontSize(12);
    doc.text(`日期: ${dateStr}    姓名: ________    得分: ________`, 14, 30);

    let y = 44;
    let qNum = 1;

    // Part A: 英译中 (multiple choice)
    doc.setFontSize(14);
    doc.setTextColor(74, 144, 217);
    doc.text('A. 英译中 (选择正确的释义)', 14, y);
    y += 10;

    for (const w of words) {
      const q = await QuizEngine.generateEnToCh(w);
      if (y > 260) { doc.addPage(); y = 20; }

      doc.setFontSize(11);
      doc.setTextColor(44, 62, 80);
      doc.text(`${qNum}. ${w.spelling}`, 14, y);
      y += 7;

      const letters = ['A', 'B', 'C', 'D'];
      for (let i = 0; i < q.options.length; i++) {
        doc.setFontSize(10);
        doc.text(`   ${letters[i]}. ${q.options[i]}`, 18, y);
        y += 6;
      }
      y += 4;
      qNum++;
    }

    // Part B: 中译英
    y += 8;
    doc.setFontSize(14);
    doc.setTextColor(39, 174, 96);
    doc.text('B. 中译英 (写出英文单词)', 14, y);
    y += 12;

    for (const w of words) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setTextColor(44, 62, 80);
      doc.text(`${qNum}. ${w.meaning}  __________________`, 14, y);
      y += 8;
      qNum++;
    }

    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    doc.text('Generated by VocabTracker · 每天进步一点点', 14, 285);

    return doc;
  },

  /** Save and download a PDF */
  downloadPDF(doc, filename) {
    doc.save(filename);
  },
};
```

- [ ] **Step 2: Verify PDF generation**

In browser console:
```javascript
const doc = await PDFReport.generateStudyList(new Date().toISOString().split('T')[0]);
doc.save('test-study-list.pdf');
```
Expected: Downloads a PDF with correct formatting.

- [ ] **Step 3: Commit**

```bash
git add js/pdfReport.js
git commit -m "feat: PDF report generation — study list and quiz sheet"
```

---

### Task 8: Dashboard Page

**Files:**
- Create: `/工具开发/word-tool/js/pages/dashboard.js`

- [ ] **Step 1: Create dashboard.js**

```javascript
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
      <button class="btn btn-primary" onclick="App.navigate('study')" ${totalToStudy === 0 ? 'disabled' : ''}>
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
  const doc = await PDFReport.generateStudyList(today);
  PDFReport.downloadPDF(doc, `背诵清单-${today}.pdf`);
}
```

- [ ] **Step 2: Add badge styles to CSS**

Append to `style.css`:
```css
.badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; }
.badge-success { background: #D5F5E3; color: var(--color-success); }
.badge-pending { background: #FDEBD0; color: var(--color-warning); }
```

Wait, I should use Edit to modify the file instead. Let me note: after creating CSS, use Edit to append badge styles.

- [ ] **Step 3: Commit**

```bash
git add js/pages/dashboard.js css/style.css
git commit -m "feat: dashboard page with stats, today plan overview, and quick actions"
```

---

### Task 9: Today's Study Page

**Files:**
- Create: `/工具开发/word-tool/js/pages/study.js`

- [ ] **Step 1: Create study.js**

```javascript
// pages/study.js — Today's learning page (new words + review)

let studyState = {
  words: [],
  currentIndex: 0,
  mode: 'learn', // 'learn' | 'review'
  phase: 'card', // 'card' | 'quiz'
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
    // All done
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
        <div class="progress-fill" style="width: ${((studyState.currentIndex) / studyState.words.length) * 100}%"></div>
      </div>

      <div class="word-display">
        <div class="word-spelling">${word.spelling}</div>
        ${word.phonetic ? `<div class="word-phonetic">${word.phonetic}</div>` : ''}
        <button class="btn btn-outline btn-sm" onclick="speakWord('${word.spelling.replace(/'/g, "\\'")}')">🔊 发音</button>
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
    // All questions done — check results
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
          <input type="text" class="quiz-input" id="spelling-input" placeholder="输入英文拼写..." autocomplete="off" autocapitalize="off">
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
          <input type="text" class="quiz-input" id="spelling-input" placeholder="输入英文拼写..." autocomplete="off" autocapitalize="off">
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

// Quiz answer handlers
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
```

- [ ] **Step 2: Add study page styles**

Append to `style.css` via Edit:
```css
/* Study page */
.study-card { text-align: center; }
.study-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.progress-text { font-size: 14px; color: var(--color-text-light); }
.progress-bar { height: 4px; background: var(--color-border); border-radius: 2px; margin-bottom: 20px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--color-primary); transition: width 0.3s; }
.word-display { margin: 24px 0; }
.word-spelling { font-size: 36px; font-weight: 700; color: var(--color-primary); margin-bottom: 8px; }
.word-phonetic { font-size: 16px; color: var(--color-text-light); margin-bottom: 12px; }
.word-meaning { margin: 16px 0; padding: 12px; background: #F0F7FF; border-radius: 8px; }
.meaning-text { font-size: 20px; font-weight: 600; }
.word-example { margin: 12px 0; padding: 12px; background: #F5F5F5; border-radius: 8px; text-align: left; }
.example-label { font-size: 13px; color: var(--color-text-light); }
.example-text { font-size: 15px; margin-top: 4px; font-style: italic; }
.word-source { font-size: 13px; color: var(--color-text-light); margin: 8px 0; }
.study-actions { display: flex; gap: 12px; justify-content: center; margin-top: 20px; }

/* Quiz question styles */
.quiz-question { text-align: center; }
.quiz-type { font-size: 14px; color: var(--color-text-light); margin-bottom: 12px; }
.quiz-prompt { font-size: 22px; font-weight: 600; margin-bottom: 12px; }
.quiz-phonetic { font-size: 15px; color: var(--color-text-light); margin-bottom: 12px; }
.quiz-options { display: flex; flex-direction: column; gap: 8px; max-width: 400px; margin: 0 auto; }
.quiz-option-btn { padding: 12px 16px; border: 2px solid var(--color-border); border-radius: 8px; background: white; font-size: 15px; cursor: pointer; transition: all 0.2s; text-align: left; }
.quiz-option-btn:hover { border-color: var(--color-primary); background: #F0F7FF; }
.quiz-input { width: 100%; max-width: 300px; padding: 12px; border: 2px solid var(--color-border); border-radius: 8px; font-size: 18px; text-align: center; margin: 8px 0; }
.quiz-input:focus { outline: none; border-color: var(--color-primary); }
.fill-blank-sentence { font-size: 18px; margin: 12px 0; padding: 12px; background: #F5F5F5; border-radius: 8px; font-style: italic; }
.quiz-result { text-align: center; padding: 20px; }
.result-icon { font-size: 48px; margin-bottom: 12px; }
.result-text { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
.result-detail { font-size: 14px; color: var(--color-text-light); margin-bottom: 16px; }
.btn-sm { padding: 6px 12px; font-size: 13px; }

/* Page header */
.page-header { margin-bottom: 20px; }
.page-header h2 { font-size: 24px; margin-bottom: 4px; }
.page-header .date { color: var(--color-text-light); font-size: 14px; }
```

- [ ] **Step 3: Commit**

```bash
git add js/pages/study.js css/style.css
git commit -m "feat: study page — flashcard learning + progressive quiz for each word"
```

---

### Task 10: Stubborn Words Page + Quiz Center + Word Bank + Settings Pages

Given the plan length, Tasks 10-13 cover the remaining pages. Let me consolidate them while keeping full code.

**Files:**
- Create: `/工具开发/word-tool/js/pages/stubborn.js`
- Create: `/工具开发/word-tool/js/pages/quiz.js`
- Create: `/工具开发/word-tool/js/pages/wordBank.js`
- Create: `/工具开发/word-tool/js/pages/settings.js`

- [ ] **Step 1: Create stubborn.js**

```javascript
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

  // Reuse same question rendering logic as study.js
  // (In production, extract shared quiz rendering to a helper)
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
```

- [ ] **Step 2: Create quiz.js (quiz center — free practice)**

```javascript
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

  // Generate questions for each word based on type filter
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
      <input class="quiz-input" id="f-input" placeholder="输入英文" autocomplete="off">
      <button class="btn btn-primary" onclick="freeChToEn()">确认</button><div id="f-feedback"></div></div>`;
  } else if (q.type === 'dictation') {
    html += `<div class="quiz-question"><div class="quiz-prompt">听发音写出单词 (${q.meaning})</div>
      <button class="btn btn-outline" onclick="freeDictationPlay()">🔊 播放</button>
      <input class="quiz-input" id="f-input" placeholder="输入英文" autocomplete="off">
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
```

- [ ] **Step 3: Create wordBank.js (word library with search/filter)**

```javascript
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
          <span style="color:var(--color-text-light); margin-left:8px;">${w.phonetic || ''}</span>
          ${w.isStubborn ? '<span class="badge" style="background:#FADBD8; color:var(--color-danger); margin-left:8px;">顽固</span>' : ''}
        </div>
        <span class="badge badge-${w.status === 'mastered' ? 'success' : w.status === 'pool' ? 'pending' : w.status === 'stubborn' ? 'danger' : 'info'}">${statusLabel(w.status)}</span>
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

function statusLabel(s) {
  const labels = { active: '学习中', pool: '待背池', mastered: '已掌握', stubborn: '顽固词' };
  return labels[s] || s;
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
        <label>拼写: <input id="edit-spelling" class="quiz-input" value="${w.spelling}" style="margin:0;"></label>
        <label>音标: <input id="edit-phonetic" class="quiz-input" value="${w.phonetic || ''}" style="margin:0;"></label>
        <label>释义: <input id="edit-meaning" class="quiz-input" value="${w.meaning}" style="margin:0;"></label>
        <label>例句: <input id="edit-sentence" class="quiz-input" value="${w.exampleSentence || ''}" style="margin:0;"></label>
        <label>来源: <input id="edit-source" class="quiz-input" value="${w.source || ''}" style="margin:0;"></label>
      </div>
      <div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="saveWordEdit('${id}')">保存</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
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

async function initWordBank(container) {}
```

- [ ] **Step 4: Create settings.js (settings + import/export UI)**

```javascript
// pages/settings.js — Settings and data import/export

async function renderSettings(container) {
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
        JSON 格式: [{"spelling": "word", "phonetic": "/.../", "meaning": "释义", "exampleSentence": "例句", "source": "来源"}]
      </p>
      <div style="margin-top:12px;">
        <input type="file" id="import-file" accept=".json" style="display:none;" onchange="handleFileImport(event)">
        <button class="btn btn-outline" onclick="document.getElementById('import-file').click()">📁 选择 JSON 文件</button>
        <button class="btn btn-outline" onclick="pasteImport()">📋 从剪贴板粘贴</button>
      </div>
      <div id="import-result" style="margin-top:12px;"></div>
    </div>

    <div class="card">
      <h3>📤 导出/备份</h3>
      <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">
        <button class="btn btn-outline" onclick="exportWordsJSON()">📄 导出单词 (JSON)</button>
        <button class="btn btn-outline" onclick="exportFullBackup()">💾 完整备份 (含进度)</button>
        <button class="btn btn-outline" onclick="document.getElementById('restore-file').click()">📥 恢复备份</button>
        <input type="file" id="restore-file" accept=".json" style="display:none;" onchange="handleRestoreBackup(event)">
      </div>
      <div id="export-result" style="margin-top:12px;"></div>
    </div>

    <div class="card">
      <h3>🗑️ 数据管理</h3>
      <p style="color:var(--color-text-light); font-size:13px; margin-bottom:8px;">清除数据前建议先导出备份</p>
      <button class="btn btn-danger" onclick="clearAllData()">清除所有数据</button>
    </div>
  `;
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
```

- [ ] **Step 5: Add remaining CSS styles**

Append to `style.css` via Edit:
```css
/* Word bank */
.word-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
.badge-info { background: #D6EAF8; color: var(--color-primary); }
.badge-danger { background: #FADBD8; color: var(--color-danger); }

/* Stubborn words */
.stubborn-list { display: flex; flex-direction: column; gap: 12px; }
.stubborn-word-card .word-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.fail-badge { background: #FADBD8; color: var(--color-danger); padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
```

- [ ] **Step 6: Verify all pages load**

Open `index.html`, click through each nav tab. Verify:
- Dashboard shows stats
- Study page works (learning card → quiz → next word)
- Stubborn page shows stubborn words or empty state
- Quiz center shows options and can start a free quiz
- Word bank shows all words with search/filter
- Settings shows import/export/backup options

- [ ] **Step 7: Commit**

```bash
git add js/pages/stubborn.js js/pages/quiz.js js/pages/wordBank.js js/pages/settings.js css/style.css
git commit -m "feat: stubborn training, free quiz center, word bank, settings with import/export"
```

---

### Task 11: Sample Data + README

**Files:**
- Create: `/工具开发/word-tool/data/sample.json`
- Create: `/工具开发/word-tool/README.md`

- [ ] **Step 1: Create sample.json with 10 realistic words for testing**

```json
[
  {
    "spelling": "abandon",
    "phonetic": "/əˈbændən/",
    "meaning": "放弃；抛弃",
    "exampleSentence": "They had to abandon the plan due to bad weather.",
    "source": "卷38-金水区"
  },
  {
    "spelling": "brilliant",
    "phonetic": "/ˈbrɪliənt/",
    "meaning": "杰出的；明亮的",
    "exampleSentence": "She had a brilliant idea for the project.",
    "source": "卷38-金水区"
  },
  {
    "spelling": "curious",
    "phonetic": "/ˈkjʊəriəs/",
    "meaning": "好奇的",
    "exampleSentence": "The little boy was curious about everything.",
    "source": "卷42-惠济区"
  },
  {
    "spelling": "discover",
    "phonetic": "/dɪˈskʌvər/",
    "meaning": "发现；发觉",
    "exampleSentence": "Scientists discover new things every day.",
    "source": "卷42-惠济区"
  },
  {
    "spelling": "enormous",
    "phonetic": "/ɪˈnɔːrməs/",
    "meaning": "巨大的；庞大的",
    "exampleSentence": "An enormous whale swam past the boat.",
    "source": "卷44-惠济区"
  },
  {
    "spelling": "familiar",
    "phonetic": "/fəˈmɪliər/",
    "meaning": "熟悉的",
    "exampleSentence": "The song sounded familiar to everyone.",
    "source": "卷44-惠济区"
  },
  {
    "spelling": "generous",
    "phonetic": "/ˈdʒenərəs/",
    "meaning": "慷慨的；大方的",
    "exampleSentence": "He was generous enough to share his lunch.",
    "source": "卷49-二七区"
  },
  {
    "spelling": "hesitate",
    "phonetic": "/ˈhezɪteɪt/",
    "meaning": "犹豫；迟疑",
    "exampleSentence": "Don't hesitate to ask if you need help.",
    "source": "卷49-二七区"
  },
  {
    "spelling": "immediate",
    "phonetic": "/ɪˈmiːdiət/",
    "meaning": "立即的；直接的",
    "exampleSentence": "We need an immediate answer to this question.",
    "source": "卷32-高新区"
  },
  {
    "spelling": "journey",
    "phonetic": "/ˈdʒɜːrni/",
    "meaning": "旅行；旅程",
    "exampleSentence": "The journey to the mountains took three hours.",
    "source": "卷32-高新区"
  }
]
```

- [ ] **Step 2: Create README.md**

```markdown
# 📖 VocabTracker — 背单词工具

为小升初阶段设计的背单词工具，基于艾宾浩斯记忆曲线，支持多种测试题型。

## 功能

- 📥 单词录入：JSON 批量导入 / 剪贴板粘贴
- 📊 艾宾浩斯记忆曲线：自动安排第 1/2/4/7/15 天复习
- 📝 四种测试题型：英译中 → 中译英 → 听写 → 例句填空
- 🎯 顽固词专项攻克：连续失败的单词自动进入强化训练
- 📋 待背池：超出每日上限的单词排队等候
- 🖨️ PDF 打印：每日背诵清单 + 测试卷
- 💾 数据备份：完整导出/导入，数据存浏览器本地

## 使用方式

1. 直接用浏览器打开 `index.html`
2. 或部署到 GitHub Pages（免费）

## 导入单词

准备一个 JSON 文件，格式如下：

\`\`\`json
[
  {
    "spelling": "abandon",
    "phonetic": "/əˈbændən/",
    "meaning": "放弃",
    "exampleSentence": "They abandoned the plan.",
    "source": "卷38-金水区"
  }
]
\`\`\`

在「设置」页面导入即可。

## 技术

纯前端 Web App，无构建工具，无后端：
- 存储：IndexedDB (idb)
- PDF：jsPDF
- 发音：Web Speech API
- 部署：GitHub Pages
```

- [ ] **Step 3: Commit**

```bash
git add data/sample.json README.md
git commit -m "feat: add sample data and README"
```

---

### Task 12: End-to-End Testing & Polish

- [ ] **Step 1: Open index.html and run through the complete flow**

1. Open `index.html` in browser
2. Go to Settings → Import → select `data/sample.json`
3. Verify: Dashboard shows 10 new words (or fewer depending on limit)
4. Click "开始今日学习"
5. Go through learning cards → test each word → verify stage advancement
6. Check Dashboard shows completed
7. Go to Word Bank → search, filter, edit, delete
8. Go to Quiz Center → run free quiz
9. Export JSON backup → clear data → restore backup → verify words restored
10. Print PDF study list

- [ ] **Step 2: Fix any issues found during testing**

- [ ] **Step 3: Add missing edge cases**

Common issues to check:
- Empty states (no words, no stubborn words, no reviews)
- Very long words or sentences (UI overflow)
- Missing optional fields (phonetic, exampleSentence, source)
- Speech synthesis not available (graceful degradation)
- Multiple rapid imports
- Date edge cases

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: end-to-end testing fixes and polish"
```

---

### Task 13: Deploy to GitHub Pages

- [ ] **Step 1: Create GitHub repository**

```bash
cd /Users/jason/WorkBuddy/2026-05-30-20-40-13/卷子库/工具开发/word-tool
git remote add origin <repo-url>
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Enable GitHub Pages**

Go to repo Settings → Pages → Source: Deploy from branch → main → / (root) → Save

- [ ] **Step 3: Verify deployment**

Visit `https://<username>.github.io/<repo-name>/` — app should load and work.

---

## Plan Self-Review

1. **Spec coverage:** All requirements from the design spec are covered:
   - ✅ Word CRUD with batch import + pool overflow: Tasks 3, 6
   - ✅ Ebbinghaus scheduler: Task 4
   - ✅ 4 quiz types: Task 5
   - ✅ Dashboard: Task 8
   - ✅ Today's learning (new + review): Task 9
   - ✅ Stubborn words intensive training: Task 10
   - ✅ Free quiz center: Task 10
   - ✅ Word bank with search/filter/edit: Task 10
   - ✅ Settings + import/export/backup: Task 10
   - ✅ PDF reports: Task 7
   - ✅ Sample data: Task 11
   - ✅ Deployment: Task 13

2. **Placeholder scan:** No TBD, TODO, or vague instructions. All code is concrete.

3. **Type consistency:** All function names, property names, and data shapes are consistent across tasks:
   - Word object shape matches across wordStore.js, scheduler.js, quizEngine.js
   - Page render/init functions follow same pattern (`renderXxx`, `initXxx`)
   - DB module is the single source for IndexedDB access
   - WordStore wraps all word operations
   - Scheduler processes reviews and generates plans
