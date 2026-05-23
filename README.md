# سِراج · Sirāj

> ذكاء اصطناعي عربي مفتوح المصدر يعمل بالكامل في متصفحك.
> لا خوادم، لا تتبّع، لا اشتراكات، لا حواجز.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-b8935a.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.4--alpha-1a1f3a)]()
[![WebGPU](https://img.shields.io/badge/WebGPU-required-1a1f3a)]()

---

## 🆕 الجديد في v0.4

- 📤 **تصدير المحادثات** — Markdown، نص عادي، JSON، أو نسخ مباشر للحافظة
- 🔍 **بحث في المحادثات** — بحث ذكي يدعم العربية مع إبراز النتائج
- 📊 **مراقبة الموارد الحية** — استهلاك RAM والبطارية في الزاوية
- 📚 **قاعدة معرفة موسعة** — 60 إدخال (30 آية + 30 حديثاً صحيحاً) في 21 موضوعاً
- 🏷️ **شارات بصرية للمراجع** — تمييز القرآن عن الحديث، مع ذكر الراوي
- ♻️ تحسينات أداء وتنظيف الكود

## 🆕 الجديد في v0.3

- ✨ **تقليم ذكي للسياق** — لا تتعطل المحادثة مهما طالت
- 💎 **نوافذ منبثقة مخصصة** — بديل أنيق لـ `alert/confirm` الافتراضية
- 🔍 **كاشف قدرات الجهاز** — يقترح النموذج الأنسب تلقائياً
- ⚠️ **تحذيرات ذكية** — يُحذرك قبل اختيار نموذج ثقيل على جهازك
- 📊 **شاشة "جهازي"** — معلومات شفافة عن قدرات جهازك

---

## 🌙 ما هو سِراج؟

**سِراج** تطبيق ويب يُحمَّل من شبكة CDN مجانية، ثم يُشغّل نموذج لغة كبير (LLM) محلياً في متصفحك عبر **WebGPU**.
بعد التحميل الأول، يعمل التطبيق كاملاً دون أي اتصال بالإنترنت، ولا تغادر أي بيانات جهازك إطلاقاً.

> ﴿ وَجَعَلَ الشَّمْسَ سِرَاجًا ﴾ — [نوح: 16]

---

## ✨ الميزات

| الميزة | الوصف |
|---|---|
| 🔒 **خصوصية مطلقة** | لا توجد خوادم، أسئلتك لا تغادر متصفحك أبداً |
| ⚡ **سريع** | 15-45 رمز/ثانية حسب الجهاز والنموذج |
| 📴 **يعمل دون اتصال** | PWA كاملة بـ Service Worker |
| 📱 **قابل للتثبيت** | كتطبيق على الموبايل وسطح المكتب |
| 📚 **قاعدة معرفة قرآنية** | بحث دلالي محلي في آيات منتقاة (RAG) |
| 🛡 **فلتر محتوى شفاف** | قواعد علنية قابلة للمراجعة |
| 💾 **حفظ المحادثات** | في متصفحك فقط، عبر localStorage |
| 🌐 **عربي أصيل** | واجهة RTL، نموذج يدعم العربية بقوة |
| 🆓 **مجاني للأبد** | بدون اشتراكات أو إعلانات |
| 📖 **مفتوح المصدر** | Apache 2.0 — استخدمه، عدّله، انشره |

---

## 🚀 جرّبه الآن (3 طرق)

### الطريقة 1: تشغيل محلي للتطوير

```bash
git clone https://github.com/YOUR_USERNAME/siraj.git
cd siraj
python3 -m http.server 8000
# افتح http://localhost:8000
```

### الطريقة 2: GitHub Pages (الأسهل، مجاني للأبد)

راجع **[دليل النشر على GitHub Pages](#-النشر-على-github-pages)** أدناه.

### الطريقة 3: Cloudflare Pages (أسرع توزيع عالمي)

1. اذهب إلى [pages.cloudflare.com](https://pages.cloudflare.com)
2. اربط مستودع GitHub
3. اختر `siraj` ثم Deploy
4. ⌛ ثوانٍ ثم يعمل على `https://siraj.pages.dev`

---

## 💻 متطلبات المتصفح

WebGPU شرط أساسي. التغطية الحالية ممتازة (~80%):

| المتصفح | الإصدار | الحالة |
|---|---|---|
| Chrome | 113+ | ✅ كامل |
| Edge | 113+ | ✅ كامل |
| Safari | 17+ (macOS Sonoma) | ✅ كامل |
| Firefox | 121+ | ⚠ يحتاج تفعيل |
| Chrome Android | حديث | ✅ معظم الأجهزة |
| Safari iOS | 17+ | ⚠ جزئي |

---

## 🖥 متطلبات الجهاز

| النموذج | الذاكرة الحرة | التخزين | السرعة |
|---|---|---|---|
| Llama 3.2 1B | 2 GB RAM | 700 MB | 30-60 رمز/ث |
| Qwen 2.5 3B | 4 GB RAM | 1.9 GB | 15-30 رمز/ث |
| Qwen 2.5 7B | 8 GB RAM | 4.2 GB | 8-15 رمز/ث |

> 💡 **نصيحة:** ابدأ بـ Qwen 2.5 3B — توازن ممتاز بين الجودة والسرعة.

---

## 📁 بنية المشروع

```
siraj/
├── index.html              ← التطبيق الرئيسي (57KB)
├── manifest.json           ← PWA Manifest
├── sw.js                   ← Service Worker
├── assets/
│   ├── rag.js             ← محرك البحث الدلالي المحلي
│   ├── utils.js           ← Modal + Context Pruning + Device Detection
│   └── chat-utils.js      ← Export + Search + Resource Monitor
├── data/
│   ├── knowledge-base.json ← 60 إدخال (آيات + أحاديث صحيحة)
│   └── quran-snippets.json ← نسخة احتياطية للتوافق
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── favicon.png
├── .nojekyll              ← لمنع GitHub Pages من تجاهل الملفات
├── LICENSE                ← Apache 2.0
├── CHANGELOG.md           ← سجل التغييرات
└── README.md
```

**لا Node modules. لا Build step. لا Bundler. مجرد ملفات ثابتة.**

---

## 📤 النشر على GitHub Pages

دليل خطوة بخطوة من الصفر:

### الخطوة 1: إنشاء حساب GitHub

إن لم يكن لديك حساب:
1. اذهب إلى [github.com/signup](https://github.com/signup)
2. أدخل بريداً وكلمة مرور
3. تحقق من البريد

### الخطوة 2: إنشاء مستودع جديد

1. اذهب إلى [github.com/new](https://github.com/new)
2. **Repository name:** `siraj` (أو ما تشاء)
3. **Description:** "AI in your browser, no servers, free forever"
4. اختر **Public**
5. ⚠️ **لا تضع** علامة على "Add a README" — سنرفع ملفاتنا بأنفسنا
6. اضغط **Create repository**

### الخطوة 3: رفع الملفات (طريقتان)

#### الطريقة (أ) — عبر الواجهة (الأسهل للمبتدئين)

1. في صفحة المستودع الفارغ، اضغط **uploading an existing file**
2. اسحب وأفلت كل ملفات مجلد `siraj/` كاملاً
3. في الأسفل، اكتب رسالة commit: `Initial release of Sirāj v0.2`
4. اضغط **Commit changes**

#### الطريقة (ب) — عبر سطر الأوامر (للمطورين)

```bash
cd siraj
git init
git add .
git commit -m "Initial release of Sirāj v0.2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/siraj.git
git push -u origin main
```

### الخطوة 4: تفعيل GitHub Pages

1. في مستودعك، اذهب إلى **Settings** (الترس أعلى يميناً)
2. من القائمة الجانبية، اختر **Pages**
3. تحت **Source**، اختر:
   - Branch: **main**
   - Folder: **/ (root)**
4. اضغط **Save**
5. انتظر دقيقة، ثم سيظهر رابطك:
   ```
   https://YOUR_USERNAME.github.io/siraj/
   ```

### الخطوة 5: التحقق

1. افتح الرابط في Chrome أو Edge
2. يجب أن ترى شاشة الترحيب
3. اختر "متوازن (Qwen 2.5 3B)" واضغط "تحميل"
4. ⏳ التحميل الأول 1.9 GB — قد يستغرق 3-10 دقائق حسب سرعة الإنترنت
5. بعدها يعمل فوراً، حتى دون إنترنت

### الخطوة 6 (اختيارية): نطاق مخصص

إن أردت نطاقاً مثل `siraj.app` بدل `username.github.io/siraj`:

1. اشترِ نطاقاً من Namecheap أو Cloudflare ($10/سنة)
2. في إعدادات DNS للنطاق، أضف:
   ```
   Type: CNAME
   Name: @
   Value: YOUR_USERNAME.github.io
   ```
3. في إعدادات GitHub Pages، أدخل النطاق في **Custom domain**
4. فعّل **Enforce HTTPS**

---

## 🌐 النشر على Cloudflare Pages (بديل أسرع)

أسرع توزيع عالمي مع شبكة Cloudflare الضخمة:

1. سجل في [Cloudflare Pages](https://pages.cloudflare.com) (مجاني)
2. **Create application** → **Connect to Git**
3. اختر مستودع `siraj`
4. إعدادات البناء:
   - **Framework preset:** None
   - **Build command:** (اتركه فارغاً)
   - **Build output directory:** `/`
5. **Save and Deploy**
6. خلال ثوانٍ، رابطك جاهز: `https://siraj.pages.dev`

---

## 🤝 المساهمة

نحب أي مساهمة. الأبواب المفتوحة:

- 🐛 **تقارير أخطاء** عبر Issues
- 💡 **اقتراحات ميزات** عبر Discussions
- 🌍 **توسيع قاعدة المعرفة** بآيات وأحاديث أخرى موثقة
- 🎨 **تحسينات تصميم** أو تجربة مستخدم
- 📚 **مراجعة شرعية** للقواعد والفلاتر
- 🌐 **ترجمة** الواجهة للغات أخرى

### إضافة محتوى لقاعدة المعرفة

عدّل `data/quran-snippets.json` وأضف entry جديد:

```json
{
  "id": "q-021",
  "topic": "الموضوع",
  "keywords": ["كلمات", "مفتاحية", "للبحث"],
  "source": "سورة كذا",
  "ref": "X:Y",
  "text": "نص الآية الكامل بالتشكيل"
}
```

---

## 📜 الترخيص والإسناد

### رخصة المشروع
**Apache 2.0** — استخدم وعدّل وانشر بحرية، مع الإشارة للمصدر.

### المكونات الأساسية

| المكون | الترخيص | الجهة |
|---|---|---|
| WebLLM | Apache 2.0 | [CMU Catalyst Lab](https://webllm.mlc.ai/) |
| Qwen 2.5 | Apache 2.0 | [Alibaba Cloud](https://qwenlm.github.io/) |
| Llama 3.2 | Llama Community | [Meta AI](https://llama.meta.com/) |
| Amiri Font | SIL OFL 1.1 | [Khaled Hosny](https://www.amirifont.org/) |
| Tajawal Font | SIL OFL 1.1 | [Boutros International](https://fonts.google.com/specimen/Tajawal) |
| النصوص القرآنية | Public Domain | — |

---

## 📞 التواصل

- **المؤسس:** عادل سالم
- **المكان:** طرابلس، ليبيا
- **التاريخ:** 2026

---

## 💛 شكر خاص

شكراً لكل من ساهم في جعل هذا التصميم ممكناً: فريق MLC، أصحاب نماذج Qwen وLlama، ومجتمع المصدر المفتوح بأسره.

> ﴿ هَلْ جَزَاءُ الْإِحْسَانِ إِلَّا الْإِحْسَانُ ﴾ — [الرحمن: 60]
