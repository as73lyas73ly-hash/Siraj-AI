// =====================================================
// Sirāj — محرك RAG محلي بسيط (Tiny Local RAG)
// بحث دلالي تقريبي على قاعدة المعرفة دون أي مكتبات خارجية
// =====================================================

export class TinyRAG {
  constructor() {
    this.entries = [];
    this.idf = {};        // Inverse Document Frequency
    this.vectors = [];    // متجهات TF-IDF لكل entry
    this.ready = false;
    this.stopWords = new Set([
      'من', 'إلى', 'عن', 'على', 'في', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
      'الذي', 'التي', 'الذين', 'هو', 'هي', 'أن', 'إن', 'لا', 'لم', 'لن',
      'قد', 'كان', 'كانت', 'يكون', 'ما', 'ماذا', 'متى', 'أين', 'كيف',
      'لماذا', 'هل', 'أي', 'كل', 'بعض', 'و', 'أو', 'ثم', 'بل', 'لكن',
      'يا', 'أيها', 'أيتها'
    ]);
  }

  // -------------------------------------------------
  // تحضير: تحميل قاعدة المعرفة وحساب TF-IDF
  // -------------------------------------------------
  async load(url = './data/knowledge-base.json') {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        // محاولة الاحتياط بالاسم القديم
        const res2 = await fetch('./data/quran-snippets.json');
        if (!res2.ok) throw new Error('Failed to fetch knowledge base');
        const data2 = await res2.json();
        this.entries = data2.entries || [];
      } else {
        const data = await res.json();
        this.entries = data.entries || [];
      }
      this._buildIndex();
      this.ready = true;
      const stats = this._getStats();
      console.log(`[Sirāj RAG] Loaded ${this.entries.length} entries (${stats.quran} قرآن، ${stats.hadith} حديث)`);
      return true;
    } catch (err) {
      console.warn('[Sirāj RAG] Could not load knowledge base:', err.message);
      this.ready = false;
      return false;
    }
  }

  _getStats() {
    const stats = { quran: 0, hadith: 0, other: 0 };
    this.entries.forEach(e => {
      if (e.type === 'quran') stats.quran++;
      else if (e.type === 'hadith') stats.hadith++;
      else stats.other++;
    });
    return stats;
  }

  // -------------------------------------------------
  // تطبيع النص العربي
  // -------------------------------------------------
  _normalize(text) {
    return text
      // إزالة التشكيل
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // توحيد الألف
      .replace(/[إأآ]/g, 'ا')
      // توحيد الياء
      .replace(/[ىئ]/g, 'ي')
      // توحيد التاء المربوطة
      .replace(/ة/g, 'ه')
      // إزالة علامات الترقيم والأرقام
      .replace(/[^\u0600-\u06FF\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  _tokenize(text) {
    const normalized = this._normalize(text);
    return normalized
      .split(' ')
      .filter(t => t.length >= 2 && !this.stopWords.has(t));
  }

  _stem(word) {
    if (word.length <= 3) return word;
    let w = word;
    const prefixes = ['ال', 'وال', 'بال', 'كال', 'فال', 'و', 'ف', 'ب', 'ل', 'ك', 'س'];
    for (const p of prefixes) {
      if (w.startsWith(p) && w.length - p.length >= 3) {
        w = w.slice(p.length);
        break;
      }
    }
    const suffixes = ['ون', 'ين', 'ات', 'ها', 'هم', 'كم', 'نا', 'تم', 'وا', 'ه', 'ك', 'ي'];
    for (const s of suffixes) {
      if (w.endsWith(s) && w.length - s.length >= 3) {
        w = w.slice(0, -s.length);
        break;
      }
    }
    return w;
  }

  _buildIndex() {
    const N = this.entries.length;
    const df = {};

    const entryTokens = this.entries.map(entry => {
      const combined = [
        entry.text,
        entry.topic || '',
        (entry.keywords || []).join(' ')
      ].join(' ');

      const tokens = this._tokenize(combined).map(t => this._stem(t));
      const uniqueTokens = new Set(tokens);
      uniqueTokens.forEach(t => {
        df[t] = (df[t] || 0) + 1;
      });
      return tokens;
    });

    for (const term in df) {
      this.idf[term] = Math.log((N + 1) / (df[term] + 1)) + 1;
    }

    this.vectors = entryTokens.map(tokens => {
      const tf = {};
      tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      const vec = {};
      let normSq = 0;
      for (const term in tf) {
        const w = (tf[term] / tokens.length) * (this.idf[term] || 0);
        vec[term] = w;
        normSq += w * w;
      }
      return { vec, norm: Math.sqrt(normSq) || 1 };
    });
  }

  _queryVector(query) {
    const tokens = this._tokenize(query).map(t => this._stem(t));
    if (tokens.length === 0) return null;

    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });

    const vec = {};
    let normSq = 0;
    for (const term in tf) {
      const idfVal = this.idf[term] || 0;
      if (idfVal === 0) continue;
      const w = (tf[term] / tokens.length) * idfVal;
      vec[term] = w;
      normSq += w * w;
    }

    return { vec, norm: Math.sqrt(normSq) || 1 };
  }

  _cosine(qv, dv) {
    let dot = 0;
    for (const term in qv.vec) {
      if (dv.vec[term]) dot += qv.vec[term] * dv.vec[term];
    }
    return dot / (qv.norm * dv.norm);
  }

  search(query, topK = 3, minScore = 0.05) {
    if (!this.ready || this.entries.length === 0) return [];

    const qv = this._queryVector(query);
    if (!qv) return [];

    const scored = this.vectors.map((dv, i) => ({
      entry: this.entries[i],
      score: this._cosine(qv, dv)
    }));

    return scored
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  isReligiousQuery(query) {
    const normalized = this._normalize(query);
    const triggers = [
      'حكم', 'حلال', 'حرام', 'مكروه', 'مستحب', 'فقه', 'فتوى', 'فتاوى',
      'شريعه', 'شرعي', 'إسلام', 'اسلام', 'مسلم', 'مسلمه',
      'قرآن', 'قران', 'آيه', 'ايه', 'سوره', 'حديث', 'سنه', 'نبي', 'رسول',
      'صلاه', 'صلاة', 'زكاه', 'زكاة', 'صوم', 'صيام', 'حج', 'عمره',
      'ايمان', 'إيمان', 'كفر', 'شرك', 'توبه', 'استغفار',
      'علم', 'صبر', 'توكل', 'انفاق', 'رزق', 'والدين', 'عدل', 'خلق'
    ];
    return triggers.some(t => normalized.includes(t));
  }

  formatAsContext(results) {
    if (results.length === 0) return '';

    let ctx = '\n--- مراجع شرعية ذات صلة (للاستئناس) ---\n';
    results.forEach((r, i) => {
      const typeLabel = r.entry.type === 'hadith' ? 'حديث نبوي شريف' : 'آية قرآنية';
      ctx += `\n[${i + 1}] ${typeLabel} | ${r.entry.source} (${r.entry.ref})`;
      if (r.entry.narrator) ctx += ` | عن ${r.entry.narrator}`;
      ctx += `:\n${r.entry.text}\n`;
    });
    ctx += '\n--- نهاية المراجع ---\n';
    ctx += 'ملاحظة: استند إلى هذه المراجع إن كانت ذات صلة بالسؤال، واذكر مصدر كل آية أو حديث تستشهد به. وإن لم تكن ذات صلة فلا تُقحمها قسراً.\n';
    return ctx;
  }
}

// -------------------------------------------------
// فلتر محتوى شفاف بسيط
// -------------------------------------------------
export class ContentFilter {
  constructor() {
    this.rules = [
      {
        id: 'absolute-fatwa',
        name: 'كشف الإفتاء القاطع',
        pattern: /(يجب عليك|الحكم القاطع|بإجماع العلماء|لا خلاف في)/,
        severity: 'warn',
        message: 'تنبيه: يبدو أن هذه الإجابة قاطعة في حكم شرعي. تذكّر مراجعة العلماء المعتبرين قبل التعويل عليها.'
      },
      {
        id: 'unsourced-attribution',
        name: 'نسبة بلا مصدر',
        pattern: /(قال الإمام\s+\w+|قال الشيخ\s+\w+|في كتاب\s+\w+) (?!.*\(.*\))/,
        severity: 'info',
        message: 'تنبيه: قد تكون هذه الإجابة تحوي نسبة قول دون مصدر دقيق. تحقق من المصدر قبل النقل.'
      },
      {
        id: 'medical-advice',
        name: 'نصيحة طبية',
        pattern: /(تشخيص|علاج|دواء|مرض|أعراض)/,
        severity: 'info',
        message: 'تنبيه طبي: هذه ليست استشارة طبية. راجع طبيبا مختصاً للتشخيص والعلاج.'
      },
      {
        id: 'legal-advice',
        name: 'استشارة قانونية',
        pattern: /(قانوني|محكمه|قضيه|دعوى|عقد قانوني)/,
        severity: 'info',
        message: 'تنبيه قانوني: هذه ليست استشارة قانونية. راجع محامياً مختصاً.'
      }
    ];
  }

  check(text) {
    const warnings = [];
    for (const rule of this.rules) {
      if (rule.pattern.test(text)) {
        warnings.push({
          ruleId: rule.id,
          severity: rule.severity,
          message: rule.message
        });
      }
    }
    return warnings;
  }
}
