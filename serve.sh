#!/usr/bin/env bash
# سكريبت تشغيل سِراج محلياً للتطوير
# يحتاج Python 3 فقط

PORT=${1:-8000}
DIR=$(dirname "$0")

cd "$DIR" || exit 1

echo "═════════════════════════════════════════"
echo "  🌙  سِراج · Sirāj — Local Dev Server"
echo "═════════════════════════════════════════"
echo ""
echo "  📂  مجلد المشروع: $(pwd)"
echo "  🌐  الرابط: http://localhost:$PORT"
echo "  ⏹  للإيقاف: Ctrl+C"
echo ""
echo "  ⚠  WebGPU يحتاج localhost أو https"
echo "  ⚠  لن يعمل بفتح index.html مباشرة (file://)"
echo ""
echo "═════════════════════════════════════════"
echo ""

python3 -m http.server "$PORT"
