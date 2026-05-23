// =====================================================
// Sirāj — أدوات مساعدة (v0.3)
// 1. تقليم السياق (Context Window Pruning)
// 2. نوافذ منبثقة مخصصة (Custom Modal)
// 3. كاشف قدرات الجهاز (Device Capability Detection)
// =====================================================

export function estimateTokens(text) {
  if (!text) return 0;
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const otherChars = text.length - arabicChars;
  return Math.ceil(arabicChars / 2.5) + Math.ceil(otherChars / 4);
}

export function pruneContext(history, options = {}) {
  const {
    maxTokens = 3000,
    minKeepPairs = 3,
    reserveTokens = 800,
  } = options;

  if (!history || history.length === 0) {
    return { pruned: [], droppedCount: 0, finalTokens: 0 };
  }

  const budget = maxTokens - reserveTokens;
  const minKeepMessages = minKeepPairs * 2;

  const withTokens = history.map(m => ({
    ...m,
    tokens: estimateTokens(m.content)
  }));

  const totalTokens = withTokens.reduce((s, m) => s + m.tokens, 0);
  if (totalTokens <= budget) {
    return { pruned: history, droppedCount: 0, finalTokens: totalTokens };
  }

  let kept = [...withTokens];
  let droppedCount = 0;

  while (kept.length > minKeepMessages) {
    const sum = kept.reduce((s, m) => s + m.tokens, 0);
    if (sum <= budget) break;
    kept.shift();
    droppedCount++;
  }

  const finalTokens = kept.reduce((s, m) => s + m.tokens, 0);

  return {
    pruned: kept.map(({ tokens, ...m }) => m),
    droppedCount,
    finalTokens
  };
}

class ModalSystem {
  constructor() {
    this._root = null;
    this._activeResolve = null;
    this._injected = false;
  }

  _ensureInjected() {
    if (this._injected) return;

    const style = document.createElement('style');
    style.textContent = `
      .siraj-modal-backdrop {
        position: fixed; inset: 0;
        background: rgba(26, 31, 58, 0.55);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 1000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        opacity: 0;
        animation: sirajFadeIn 0.2s ease forwards;
      }
      .siraj-modal-backdrop.closing { animation: sirajFadeOut 0.15s ease forwards; }
      @keyframes sirajFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes sirajFadeOut { to { opacity: 0; } }
      .siraj-modal {
        background: var(--paper, #fffdf7);
        border: 1px solid var(--hairline, #d9cfb5);
        border-radius: 14px;
        max-width: 480px; width: 100%;
        max-height: 85vh; overflow-y: auto;
        box-shadow: 0 10px 50px rgba(26, 31, 58, 0.25);
        transform: translateY(20px);
        animation: sirajSlideUp 0.25s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
        font-family: 'Tajawal', system-ui, sans-serif;
        direction: rtl;
      }
      @keyframes sirajSlideUp { to { transform: translateY(0); } }
      .siraj-modal-header { padding: 22px 24px 0; display: flex; align-items: center; gap: 14px; }
      .siraj-modal-icon {
        width: 40px; height: 40px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      .siraj-modal-icon.info { background: rgba(184, 147, 90, 0.15); color: var(--gold-deep, #8f6f3e); }
      .siraj-modal-icon.warning { background: rgba(184, 147, 90, 0.2); color: var(--gold-deep, #8f6f3e); }
      .siraj-modal-icon.danger { background: rgba(160, 74, 42, 0.15); color: var(--rust, #a04a2a); }
      .siraj-modal-icon.success { background: rgba(107, 128, 104, 0.15); color: var(--sage, #6b8068); }
      .siraj-modal-title {
        font-family: 'Amiri', serif;
        font-size: 22px; font-weight: 700;
        color: var(--ink, #1a1f3a);
        line-height: 1.3;
      }
      .siraj-modal-body {
        padding: 16px 24px 4px;
        color: var(--ink-soft, #2a3050);
        font-size: 15px; line-height: 1.8;
      }
      .siraj-modal-body strong { color: var(--ink, #1a1f3a); }
      .siraj-modal-body .device-info {
        background: var(--cream-soft, #faf6ed);
        border: 1px solid var(--hairline, #d9cfb5);
        border-radius: 8px;
        padding: 14px;
        margin-top: 14px;
        font-size: 13px;
      }
      .siraj-modal-body .device-info-row {
        display: flex; justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px dashed var(--hairline, #d9cfb5);
      }
      .siraj-modal-body .device-info-row:last-child { border-bottom: none; }
      .siraj-modal-body .device-info-label { color: var(--ink-soft, #2a3050); }
      .siraj-modal-body .device-info-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: var(--ink, #1a1f3a);
        direction: ltr;
      }
      .siraj-modal-actions {
        padding: 20px 24px;
        display: flex; gap: 10px; justify-content: flex-start;
        border-top: 1px solid var(--hairline, #d9cfb5);
        margin-top: 16px;
      }
      .siraj-modal-btn {
        font-family: 'Tajawal', system-ui, sans-serif;
        font-size: 14px; font-weight: 500;
        padding: 10px 22px;
        border-radius: 8px;
        border: 1px solid var(--hairline, #d9cfb5);
        background: transparent;
        color: var(--ink, #1a1f3a);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .siraj-modal-btn:hover { background: var(--cream-soft, #faf6ed); border-color: var(--gold, #b8935a); }
      .siraj-modal-btn.primary {
        background: var(--ink, #1a1f3a);
        color: var(--paper, #fffdf7);
        border-color: var(--ink, #1a1f3a);
      }
      .siraj-modal-btn.primary:hover { background: var(--ink-soft, #2a3050); }
      .siraj-modal-btn.danger {
        background: var(--rust, #a04a2a);
        color: var(--paper, #fffdf7);
        border-color: var(--rust, #a04a2a);
      }
      .siraj-modal-btn.danger:hover { opacity: 0.9; }
    `;
    document.head.appendChild(style);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._root) {
        this._close(null);
      }
    });

    this._injected = true;
  }

  _close(value) {
    if (!this._root) return;
    this._root.classList.add('closing');
    setTimeout(() => {
      if (this._root && this._root.parentNode) {
        this._root.parentNode.removeChild(this._root);
      }
      this._root = null;
      if (this._activeResolve) {
        const r = this._activeResolve;
        this._activeResolve = null;
        r(value);
      }
    }, 150);
  }

  show(options = {}) {
    this._ensureInjected();

    if (this._root) this._close(null);

    const {
      title = 'تنبيه',
      body = '',
      icon = 'info',
      type = 'alert',
      confirmText = 'حسناً',
      cancelText = 'إلغاء',
      dangerConfirm = false,
    } = options;

    const iconChars = { info: 'ℹ', warning: '⚠', danger: '⊘', success: '✓' };

    const backdrop = document.createElement('div');
    backdrop.className = 'siraj-modal-backdrop';
    backdrop.innerHTML = `
      <div class="siraj-modal" role="dialog" aria-modal="true">
        <div class="siraj-modal-header">
          <div class="siraj-modal-icon ${icon}">${iconChars[icon] || iconChars.info}</div>
          <div class="siraj-modal-title">${this._escape(title)}</div>
        </div>
        <div class="siraj-modal-body">${body}</div>
        <div class="siraj-modal-actions">
          ${type === 'confirm' ? `
            <button class="siraj-modal-btn primary ${dangerConfirm ? 'danger' : ''}" data-action="confirm">
              ${this._escape(confirmText)}
            </button>
            <button class="siraj-modal-btn" data-action="cancel">
              ${this._escape(cancelText)}
            </button>
          ` : `
            <button class="siraj-modal-btn primary" data-action="confirm">
              ${this._escape(confirmText)}
            </button>
          `}
        </div>
      </div>
    `;

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this._close(null);
    });

    backdrop.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this._close(action === 'confirm' ? true : false);
      });
    });

    document.body.appendChild(backdrop);
    this._root = backdrop;

    setTimeout(() => {
      const primaryBtn = backdrop.querySelector('.siraj-modal-btn.primary');
      if (primaryBtn) primaryBtn.focus();
    }, 100);

    return new Promise(resolve => {
      this._activeResolve = resolve;
    });
  }

  _escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  alert(title, body, icon = 'info') {
    return this.show({ title, body, icon, type: 'alert' });
  }

  confirm(title, body, options = {}) {
    return this.show({
      title, body,
      icon: options.icon || 'warning',
      type: 'confirm',
      confirmText: options.confirmText || 'متابعة',
      cancelText: options.cancelText || 'إلغاء',
      dangerConfirm: options.dangerConfirm || false
    });
  }
}

export const Modal = new ModalSystem();

export class DeviceDetector {
  constructor() {
    this.info = null;
  }

  async detect() {
    const info = {
      deviceMemoryGB: navigator.deviceMemory || null,
      cpuCores: navigator.hardwareConcurrency || null,
      connection: this._getConnectionInfo(),
      platform: this._getPlatform(),
      webgpu: await this._detectWebGPU(),
      storage: await this._getStorageInfo(),
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1,
      },
    };

    this.info = info;
    return info;
  }

  _getConnectionInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return null;
    return {
      effectiveType: conn.effectiveType,
      downlinkMbps: conn.downlink || null,
      saveData: conn.saveData || false,
    };
  }

  _getPlatform() {
    const ua = navigator.userAgent;
    let os = 'Unknown';
    let browser = 'Unknown';
    let isMobile = /Mobile|Android|iPhone|iPad|iPod/.test(ua);

    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS|Macintosh/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
    else if (/Linux/.test(ua)) os = 'Linux';

    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\//.test(ua)) browser = 'Chrome';
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';

    return { os, browser, isMobile };
  }

  async _detectWebGPU() {
    if (!navigator.gpu) {
      return { supported: false, reason: 'WebGPU غير متاح في هذا المتصفح' };
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { supported: false, reason: 'لم يُعثر على GPU متوافقة' };
      }
      return {
        supported: true,
        vendor: adapter.info?.vendor || 'unknown',
        architecture: adapter.info?.architecture || 'unknown',
        device: adapter.info?.device || 'unknown',
      };
    } catch (err) {
      return { supported: false, reason: err.message };
    }
  }

  async _getStorageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try {
      const est = await navigator.storage.estimate();
      return {
        quotaGB: est.quota ? (est.quota / 1073741824).toFixed(2) : null,
        usageGB: est.usage ? (est.usage / 1073741824).toFixed(2) : null,
      };
    } catch {
      return null;
    }
  }

  recommend() {
    if (!this.info) {
      return { recommended: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', reason: 'القيمة الافتراضية', warnings: [] };
    }

    const { deviceMemoryGB, webgpu, platform, connection } = this.info;
    const warnings = [];

    if (!webgpu.supported) {
      return {
        recommended: null,
        reason: 'متصفحك لا يدعم WebGPU',
        warnings: [webgpu.reason],
        canRun: false
      };
    }

    if (connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g')) {
      warnings.push('اتصالك بطيء جداً. التحميل الأول قد يستغرق وقتاً طويلا.');
    } else if (connection && connection.saveData) {
      warnings.push('وضع توفير البيانات مُفعَّل. قد تواجه قيوداً على التحميل.');
    }

    if (platform.isMobile) {
      warnings.push('على الأجهزة المحمولة، التشغيل يستهلك البطارية بسرعة ويرفع حرارة الجهاز.');
    }

    let recommended, reason;

    if (deviceMemoryGB === null) {
      recommended = platform.isMobile
        ? 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
        : 'Qwen2.5-3B-Instruct-q4f16_1-MLC';
      reason = 'لا يمكن قياس ذاكرة جهازك بدقة، فاخترنا نموذجاً آمناً';
    } else if (deviceMemoryGB <= 2) {
      recommended = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
      reason = `جهازك يملك ${deviceMemoryGB}GB ذاكرة — مناسب للنموذج الصغير فقط`;
      warnings.push('النماذج الأكبر قد تتسبب في تجميد المتصفح.');
    } else if (deviceMemoryGB <= 4) {
      recommended = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
      reason = `جهازك يملك ${deviceMemoryGB}GB ذاكرة — يفضّل النموذج الصغير`;
      warnings.push('يمكنك تجربة نموذج 3B لكن قد يكون بطيئاً.');
    } else if (deviceMemoryGB <= 8) {
      recommended = 'Qwen2.5-3B-Instruct-q4f16_1-MLC';
      reason = `جهازك يملك ${deviceMemoryGB}GB+ ذاكرة — مناسب للنموذج المتوازن`;
    } else {
      recommended = 'Qwen2.5-7B-Instruct-q4f16_1-MLC';
      reason = `جهازك قوي (${deviceMemoryGB}GB+) — يمكنه تشغيل النموذج الأكبر`;
    }

    return { recommended, reason, warnings, canRun: true };
  }

  checkModelFit(modelId) {
    if (!this.info) return { suitable: true, severity: 'none', message: '' };

    const { deviceMemoryGB, platform } = this.info;

    const modelRamGB = {
      'Llama-3.2-1B-Instruct-q4f16_1-MLC': 2,
      'Qwen2.5-3B-Instruct-q4f16_1-MLC': 4,
      'Qwen2.5-7B-Instruct-q4f16_1-MLC': 8,
    };

    const needed = modelRamGB[modelId] || 4;

    if (deviceMemoryGB === null) {
      if (needed >= 8 && platform.isMobile) {
        return {
          suitable: false,
          severity: 'high',
          message: 'هذا النموذج كبير جداً للأجهزة المحمولة. ننصح بنموذج أصغر.',
        };
      }
      return { suitable: true, severity: 'none', message: '' };
    }

    if (deviceMemoryGB < needed) {
      return {
        suitable: false,
        severity: 'high',
        message: `هذا النموذج يحتاج ~${needed}GB من الذاكرة، وجهازك يملك ${deviceMemoryGB}GB فقط. قد يتجمد المتصفح أو يتعطل.`,
      };
    }

    if (deviceMemoryGB < needed * 1.5) {
      return {
        suitable: true,
        severity: 'medium',
        message: `هذا النموذج عند الحد الأقصى لجهازك. أغلق التطبيقات الأخرى قبل التحميل.`,
      };
    }

    return { suitable: true, severity: 'none', message: '' };
  }

  toHTML() {
    if (!this.info) return '';
    const i = this.info;
    const rows = [
      ['نظام التشغيل', `${i.platform.os}${i.platform.isMobile ? ' (محمول)' : ''}`],
      ['المتصفح', i.platform.browser],
      ['الذاكرة العشوائية', i.deviceMemoryGB ? `${i.deviceMemoryGB}GB+` : 'غير متاح'],
      ['عدد أنوية المعالج', i.cpuCores || 'غير متاح'],
      ['WebGPU', i.webgpu.supported ? '✓ مدعوم' : '✗ غير مدعوم'],
    ];
    if (i.webgpu.supported && i.webgpu.vendor !== 'unknown') {
      rows.push(['كرت الشاشة', i.webgpu.vendor]);
    }
    if (i.connection) {
      rows.push(['سرعة الاتصال', `${i.connection.effectiveType.toUpperCase()}`]);
    }
    if (i.storage && i.storage.quotaGB) {
      rows.push(['مساحة التخزين المتاحة', `${i.storage.quotaGB}GB`]);
    }

    return `
      <div class="device-info">
        ${rows.map(([k, v]) => `
          <div class="device-info-row">
            <span class="device-info-label">${k}</span>
            <span class="device-info-value">${v}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}
