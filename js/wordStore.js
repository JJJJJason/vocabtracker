// wordStore.js — Word CRUD and query operations

const WordStore = {
  /** Generate a simple UUID v4 */
  generateId() {
    return 'w_' + crypto.randomUUID();
  },

  /** Create a new word object with defaults */
  createWord({ spelling, phonetic, meaning, partOfSpeech, exampleSentence, source }) {
    return {
      id: this.generateId(),
      spelling: spelling.trim(),
      phonetic: phonetic || '',
      meaning: meaning.trim(),
      partOfSpeech: partOfSpeech || '',
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
    const allWords = await DB.db.getAll('words');
    const allActive = allWords.filter(w => w.status === 'active');
    const todayActive = allActive.filter(w =>
      w.stage === 0 && w.createdAt.split('T')[0] === today
    );
    const remaining = Math.max(0, limit - todayActive.length);

    const results = [];
    const tx = DB.db.transaction('words', 'readwrite');

    for (let i = 0; i < wordDataList.length; i++) {
      const word = this.createWord(wordDataList[i]);
      if (i < remaining) {
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
    const all = await DB.db.getAll('words');
    return all.filter(w => w.isStubborn === true);
  },

  /** Count stubborn words */
  async countStubborn() {
    const stubborn = await this.getStubborn();
    return stubborn.length;
  },

  /** Get pool words (status = 'pool') */
  async getPoolWords() {
    const all = await DB.db.getAll('words');
    return all.filter(w => w.status === 'pool');
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
    const all = await DB.db.getAll('words');
    return all.filter(w => w.status === status);
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
      const expectedStr = expected.toISOString().split('T')[0];
      if (completed[i] === expectedStr) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },
};
