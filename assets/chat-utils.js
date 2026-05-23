// =====================================================
// Sirāj — أدوات المحادثة (v0.4)
// 1. تصدير المحادثات (Markdown / JSON / Text)
// 2. البحث في المحادثات
// 3. مراقبة الموارد الحية (RAM / GPU)
// =====================================================

export class ChatExporter {
  static toMarkdown(conv) {
    const lines = [];
    lines.push(`# ${conv.title || 'محادثة سِراج'}`);
    lines.push('');
    lines.push(`**التاريخ:** ${new Date(conv.updatedAt || Date.now()).toLocaleString('ar-EG')}`);
    if (conv.model) lines.push(`**النموذج:** ${conv.model}`);
    lines.push(`**المصدر:** سِراج (Sirāj) — مساعد ذكي يعمل في المتصفح`);
    lines.push('');
    lines.push('---');
    lines.push('');

    conv.messages.forEach((m) => {
      const label = m.role === 'user' ? '👤 السؤال' : '✦ سِراج';
      lines.push(`### ${label}`);
      lines.push('');
      lines.push(m.content);
      lines.push('');
    });

    lines.push('---');
    lines.push('');
    lines.push('> *تنويه: سِراج أداة معرفية مساعدة. في المسائل الشرعية والطبية والقانونية الجادة، يجب الرجوع إلى أهل الاختصاص.*');

    return lines.join('\n');
  }

  static toPlainText(conv) {
    const lines = [];
    lines.push(conv.title || 'محادثة سِراج');
    lines.push('═'.repeat(60));
    lines.push(`التاريخ: ${new Date(conv.updatedAt || Date.now()).toLocaleString('ar-EG')}`);
    if (conv.model) lines.push(`النموذج: ${conv.model}`);
    lines.push('');

    conv.messages.forEach((m) => {
      const label = m.role === 'user' ? '> السؤال' : '> سِراج';
      lines.push(label);
      lines.push('-'.repeat(40));
      lines.push(m.content);
      lines.push('');
    });

    lines.push('═'.repeat(60));
    lines.push('سِراج — مساعد ذكي مفتوح المصدر يعمل في المتصفح');
    return lines.join('\n');
  }

  static toJSON(conv) {
    return JSON.stringify({
      ...conv,
      exportedAt: Date.now(),
      exportedFrom: 'Sirāj v0.4',
    }, null, 2);
  }

  static download(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch {
        document.body.removeChild(ta);
        return false;
      }
    }
  }

  static export(conv, format = 'markdown') {
    const safeTitle = (conv.title || 'محادثة')
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '')
      .slice(0, 50)
      .trim();
    const dateStr = new Date(conv.updatedAt || Date.now())
      .toISOString().slice(0, 10);
    const baseName = `siraj-${safeTitle}-${dateStr}`;

    switch (format) {
      case 'markdown':
        this.download(this.toMarkdown(conv), `${baseName}.md`, 'text/markdown');
        break;
      case 'text':
        this.download(this.toPlainText(conv), `${baseName}.txt`, 'text/plain');
        break;
      case 'json':
        this.download(this.toJSON(conv), `${baseName}.json`, 'application/json');
        break;
      default:
        throw new Error('صيغة غير مدعومة: ' + format);
    }
  }
}

export class ConversationSearch {
  static search(conversations, query) {
    if (!query || !query.trim()) return conversations.map(c => ({ conv: c, matches: 0, snippet: null }));

    const q = this._normalize(query);
    const terms = q.split(/\s+/).filter(t => t.length >= 2);
    if (terms.length === 0) return conversations.map(c => ({ conv: c, matches: 0, snippet: null }));

    const results = [];

    for (const conv of conversations) {
      let matches = 0;
      let bestSnippet = null;
      let bestSnippetMatches = 0;

      const titleNorm = this._normalize(conv.title || '');
      terms.forEach(t => { if (titleNorm.includes(t)) matches += 2; });

      for (const msg of (conv.messages || [])) {
        const contentNorm = this._normalize(msg.content);
        let msgMatches = 0;
        terms.forEach(t => {
          if (contentNorm.includes(t)) msgMatches++;
        });
        matches += msgMatches;

        if (msgMatches > bestSnippetMatches) {
          bestSnippetMatches = msgMatches;
          bestSnippet = this._extractSnippet(msg.content, terms);
        }
      }

      if (matches > 0) {
        results.push({ conv, matches, snippet: bestSnippet });
      }
    }

    results.sort((a, b) => b.matches - a.matches);
    return results;
  }

  static _normalize(text) {
    if (!text) return '';
    return text
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[إأآ]/g, 'ا')
      .replace(/[ىئ]/g, 'ي')
      .replace(/ة/g, 'ه')
      .toLowerCase();
  }

  static _extractSnippet(content, terms, maxLen = 120) {
    const normContent = this._normalize(content);
    let bestPos = -1;

    for (const t of terms) {
      const pos = normContent.indexOf(t);
      if (pos >= 0 && (bestPos === -1 || pos < bestPos)) {
        bestPos = pos;
      }
    }

    if (bestPos === -1) return content.slice(0, maxLen) + '...';

    const start = Math.max(0, bestPos - 30);
    const end = Math.min(content.length, bestPos + 90);
    let snippet = content.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  static highlight(text, query) {
    if (!query) return text;
    const terms = this._normalize(query).split(/\s+/).filter(t => t.length >= 2);
    if (terms.length === 0) return text;

    let result = text;
    terms.forEach(t => {
      const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`([\u0600-\u06FFa-zA-Z]*${escaped}[\u0600-\u06FFa-zA-Z]*)`, 'gi');
      result = result.replace(re, '<mark>$1</mark>');
    });
    return result;
  }
}

export class ResourceMonitor {
  constructor() {
    this.gpuAdapter = null;
    this.intervalId = null;
    this.callbacks = [];
    this.lastSnapshot = null;
  }

  async init() {
    if (navigator.gpu) {
      try {
        this.gpuAdapter = await navigator.gpu.requestAdapter();
      } catch (err) {
        console.warn('[ResourceMonitor] GPU adapter unavailable');
      }
    }
  }

  async snapshot() {
    const snap = {
      timestamp: Date.now(),
      ram: null,
      gpu: null,
      battery: null,
    };

    if (performance.memory) {
      snap.ram = {
        usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
        totalMB: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
      };
      snap.ram.percentUsed = Math.round((snap.ram.usedMB / snap.ram.limitMB) * 100);
    }

    if (this.gpuAdapter && this.gpuAdapter.info) {
      snap.gpu = {
        vendor: this.gpuAdapter.info.vendor || 'unknown',
        architecture: this.gpuAdapter.info.architecture || 'unknown',
      };
    }

    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        snap.battery = {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
        };
      } catch {}
    }

    this.lastSnapshot = snap;
    return snap;
  }

  start(callback, intervalMs = 2000) {
    if (callback) this.callbacks.push(callback);

    if (this.intervalId) return;

    const tick = async () => {
      const snap = await this.snapshot();
      this.callbacks.forEach(cb => {
        try { cb(snap); } catch (err) { console.warn(err); }
      });
    };

    tick();
    this.intervalId = setInterval(tick, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.callbacks = [];
  }

  static formatSnapshot(snap) {
    if (!snap) return 'غير متاح';
    const parts = [];
    if (snap.ram) {
      parts.push(`RAM: ${snap.ram.usedMB}MB`);
    }
    if (snap.battery) {
      const charging = snap.battery.charging ? '⚡' : '';
      parts.push(`🔋 ${snap.battery.level}%${charging}`);
    }
    return parts.join(' · ') || 'غير متاح';
  }
}
