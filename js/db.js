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
