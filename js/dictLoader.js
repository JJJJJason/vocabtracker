// dictLoader.js — Lazy-load local Chinese-English dictionary
// Format: { "word": ["phonetic", "中文释义", "pos"], ... }

const DictLoader = {
  _dict: null,
  _loading: null,

  async load() {
    if (this._dict) return this._dict;
    if (this._loading) return this._loading;

    this._loading = (async () => {
      try {
        const resp = await fetch('data/dict-zh.json?v=80bcc30');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        this._dict = await resp.json();
        console.log(`DictLoader: ${Object.keys(this._dict).length} words loaded`);
        return this._dict;
      } catch (e) {
        console.warn('DictLoader: failed to load dict-zh.json, using fallback', e.message);
        this._dict = {}; // empty fallback
        return this._dict;
      } finally {
        this._loading = null;
      }
    })();

    return this._loading;
  },

  /** Look up a word in the local dictionary.
   *  Returns null if not found.
   *  Returns { phonetic, meaning, pos } on match. */
  async lookup(word) {
    await this.load();
    const key = word.toLowerCase().trim();
    const entry = this._dict[key];
    if (!entry) return null;
    return {
      phonetic: entry[0] || '',
      meaning: entry[1] || '',
      pos: entry[2] || '',
    };
  },

  /** Check if dictionary is available (loaded + non-empty) */
  async isAvailable() {
    await this.load();
    return this._dict && Object.keys(this._dict).length > 0;
  }
};
