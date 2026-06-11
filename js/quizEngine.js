// quizEngine.js — Quiz question generation and answer validation

const QuizEngine = {
  /**
   * Generate a multiple-choice (英译中) question for a word.
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
   */
  generateChToEn(word) {
    return {
      type: 'ch_to_en',
      wordId: word.id,
      prompt: word.meaning,
      answer: word.spelling,
      phonetic: word.phonetic,
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
   */
  generateDictation(word) {
    return {
      type: 'dictation',
      wordId: word.id,
      answer: word.spelling,
      meaning: word.meaning,
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
   */
  async generateFillBlank(word) {
    if (!word.exampleSentence) return null;

    const sentence = word.exampleSentence;
    // Find the word in the sentence (case insensitive)
    const escaped = word.spelling.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const blankSentence = sentence.replace(regex, '________');

    // If word not found in sentence, can't create fill-blank
    if (blankSentence === sentence) return null;

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
