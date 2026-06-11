// githubSync.js — Sync word data to GitHub repo via GitHub API
// Token stored locally in IndexedDB settings; never sent anywhere else.

const GithubSync = {
  REPO: 'JJJJJason/vocabtracker',
  FILE_PATH: 'data/words.json',
  API_BASE: 'https://api.github.com',

  /** Get the stored token */
  async getToken() {
    const s = await DB.getSettings();
    return s.githubToken || '';
  },

  /** Set the token */
  async setToken(token) {
    const s = await DB.getSettings();
    s.githubToken = token;
    await DB.db.put('settings', s);
  },

  /** Check if token is configured */
  async isConfigured() {
    const token = await this.getToken();
    return token.length > 0;
  },

  /**
   * Push all local words to GitHub as data/words.json.
   * Returns { success, error? }
   */
  async push() {
    const token = await this.getToken();
    if (!token) return { success: false, error: '未配置 GitHub Token' };

    const words = await WordStore.getAll();
    const content = JSON.stringify(words, null, 2);
    const contentBase64 = btoa(unescape(encodeURIComponent(content)));

    // Get current file SHA (needed for update)
    let sha = null;
    try {
      const resp = await fetch(`${this.API_BASE}/repos/${this.REPO}/contents/${this.FILE_PATH}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        sha = data.sha;
      }
    } catch (_) { /* file may not exist yet */ }

    // Create or update the file
    const body = {
      message: `sync: ${words.length} words [${new Date().toLocaleDateString('zh-CN')}]`,
      content: contentBase64,
      branch: 'main',
    };
    if (sha) body.sha = sha;

    const resp = await fetch(`${this.API_BASE}/repos/${this.REPO}/contents/${this.FILE_PATH}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { success: false, error: err.message || `HTTP ${resp.status}` };
    }
    return { success: true, wordCount: words.length };
  },

  /**
   * Pull words from GitHub and merge into local DB.
   * Reading is free — no token needed for public repos.
   * Merge rule: for each remote word, import if local doesn't have it,
   * or if remote updatedAt is newer than local.
   * Returns { success, added, updated, skipped, error? }
   */
  async pull() {
    // Fetch from raw.githubusercontent.com — no auth needed for public repos
    const rawURL = `https://raw.githubusercontent.com/${this.REPO}/main/${this.FILE_PATH}`;
    let remoteWords;
    try {
      const resp = await fetch(rawURL, { cache: 'no-cache' });
      if (!resp.ok) {
        if (resp.status === 404) return { success: false, error: '云端暂无数据，请先在电脑端推送一次' };
        return { success: false, error: `HTTP ${resp.status}` };
      }
      remoteWords = await resp.json();
    } catch (e) {
      return { success: false, error: `网络错误: ${e.message}` };
    }

    // 2. Merge with local
    let added = 0, updated = 0, skipped = 0;

    for (const rw of remoteWords) {
      const local = await WordStore.get(rw.id);
      if (!local) {
        // New word from remote — add to local
        await DB.db.put('words', rw);
        added++;
      } else {
        // Both exist — use the newer version
        const localTime = new Date(local.updatedAt || 0).getTime();
        const remoteTime = new Date(rw.updatedAt || 0).getTime();
        if (remoteTime > localTime) {
          await DB.db.put('words', rw);
          updated++;
        } else {
          skipped++;
        }
      }
    }

    return { success: true, added, updated, skipped };
  },
};
