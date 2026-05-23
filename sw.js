// =====================================================
// Sirāj Service Worker
// يجعل التطبيق يعمل دون إنترنت بعد التحميل الأول
// =====================================================

const VERSION = 'siraj-v0.4.0';
const CACHE_NAME = `siraj-cache-${VERSION}`;

// الموارد الأساسية للتطبيق (تُحفظ عند التثبيت)
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.png',
  './assets/rag.js',
  './assets/utils.js',
  './assets/chat-utils.js',
  './data/knowledge-base.json',
  './data/quran-snippets.json',
];

// نطاقات يُسمح بتخزينها مؤقتاً بعد جلبها (CDN للخطوط والمكتبات)
const RUNTIME_CACHE_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'esm.run',
  'cdn.jsdelivr.net',
  'unpkg.com',
];

// نطاقات لا نتدخل فيها أبداً (الأوزان من Hugging Face — يتولاها WebLLM بنفسه عبر IndexedDB)
const PASSTHROUGH_HOSTS = [
  'huggingface.co',
  'raw.githubusercontent.com',
];

// =====================================================
// التثبيت: تخزين الموارد الأساسية
// =====================================================
self.addEventListener('install', (event) => {
  console.log('[Sirāj SW] Installing version:', VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // نخزّن كل ملف على حدة لتجنب فشل التثبيت كاملاً
      for (const asset of CORE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[Sirāj SW] Failed to cache:', asset, err.message);
        }
      }
      console.log('[Sirāj SW] Core assets cached.');
    })
  );
  // تفعيل النسخة الجديدة فوراً
  self.skipWaiting();
});

// =====================================================
// التفعيل: تنظيف النسخ القديمة
// =====================================================
self.addEventListener('activate', (event) => {
  console.log('[Sirāj SW] Activating version:', VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('siraj-cache-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[Sirāj SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// =====================================================
// استراتيجية الجلب: Cache First مع Network Fallback
// =====================================================
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // نتجاهل غير GET
  if (req.method !== 'GET') return;

  // نتجاهل النطاقات التي يتولاها WebLLM بنفسه
  if (PASSTHROUGH_HOSTS.some(host => url.hostname.includes(host))) {
    return;
  }

  // طلبات نفس المصدر: Cache First (مع تحديث في الخلفية)
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithRefresh(req));
    return;
  }

  // CDN الموثوقة: Stale While Revalidate
  if (RUNTIME_CACHE_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // باقي الطلبات: شبكة عادية بلا تخزين
});

// =====================================================
// استراتيجيات التخزين المؤقت
// =====================================================

async function cacheFirstWithRefresh(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  if (cached) {
    // نُعيد المخزّن فوراً ونُحدّث في الخلفية
    fetchAndUpdate(req, cache);
    return cached;
  }

  // غير موجود: نجلب من الشبكة ونخزّن
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    // فشل الجلب — نُعيد صفحة بسيطة للوضع غير المتصل
    if (req.mode === 'navigate') {
      return cache.match('./index.html');
    }
    throw err;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req).then((res) => {
    if (res && res.status === 200) {
      cache.put(req, res.clone());
    }
    return res;
  }).catch(() => cached); // إن فشلت الشبكة، نُعيد المخزّن

  return cached || fetchPromise;
}

function fetchAndUpdate(req, cache) {
  fetch(req).then((res) => {
    if (res && res.status === 200) {
      cache.put(req, res);
    }
  }).catch(() => {/* تجاهل أخطاء التحديث الخلفي */});
}

// =====================================================
// رسائل من التطبيق
// =====================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});
