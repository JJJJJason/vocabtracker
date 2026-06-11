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
   */
  async generateDailyPlan(date) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // Only keep cached plan if already completed — otherwise
    // regenerate to pick up newly imported words or code fixes.
    let plan = await DB.db.get('dailyPlans', dateStr);
    if (plan && plan.completed) return plan;

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
    // newWords = directly imported stage-0 words + words promoted from pool today
    // reviewWords = stage > 0 words due for review
    plan = {
      date: dateStr,
      newWords: [...todayActiveNew.map(w => w.id), ...newWordsToAdd.map(w => w.id)],
      reviewWords: dueWords.filter(w => w.stage > 0).map(w => w.id),
      stubbornWords: stubbornForToday.map(w => w.id),
      completed: false,
    };

    await DB.db.put('dailyPlans', plan);
    return plan;
  },

  /** Get today's plan (creates one if not exists) */
  async getTodayPlan() {
    const today = new Date().toISOString().split('T')[0];
    return await this.generateDailyPlan(today);
  },

  /** Mark today's plan as completed */
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
