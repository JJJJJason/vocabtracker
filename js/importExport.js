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
    // Auto-push to GitHub if token is configured
    GithubSync.push().catch(() => {}); // fire-and-forget, don't block UI
    const active = result.filter(w => w.status === 'active');
    const pooled = result.filter(w => w.status === 'pool');
    return { total: result.length, active: active.length, pooled: pooled.length, words: result };
  },

  /** Export all words as JSON (study data only, no review state) */
  async exportAllWords() {
    const words = await WordStore.getAll();
    const exportData = words.map(w => ({
      spelling: w.spelling,
      phonetic: w.phonetic,
      meaning: w.meaning,
      partOfSpeech: w.partOfSpeech,
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
