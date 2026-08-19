// سكريبت تحديث رابط API تلقائياً
// يقرأ الرابط من tunnel_url.txt ويحدّث ملف api.ts في الواجهة الأمامية

const fs = require('fs');
const path = require('path');

const tunnelFile = path.join(__dirname, 'tunnel_url.txt');
const apiFile = path.join(__dirname, '..', 'frontend', 'src', 'utils', 'api.ts');

function extractUrl(content) {
  // البحث عن أول رابط trycloudflare.com في الملف
  const match = content.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  return match ? match[0] : null;
}

function updateApiFile(url) {
  const content = `// ============================================
// ملف الإعداد المركزي لرابط الخادم
// يتم تحديث هذا الملف تلقائياً بواسطة سكريبت التشغيل
// ============================================

// الرابط الحالي للخادم (يتم تحديثه تلقائياً)
export const API_BASE = '${url}/api';

// رابط الخادم الأساسي (بدون /api)
export const SERVER_URL = '${url}';
`;
  fs.writeFileSync(apiFile, content, 'utf8');
  console.log(`✅ تم تحديث الرابط إلى: ${url}`);
}

// مراقبة الملف كل 5 ثوانٍ
let lastUrl = null;

function check() {
  try {
    if (fs.existsSync(tunnelFile)) {
      const content = fs.readFileSync(tunnelFile, 'utf8');
      const url = extractUrl(content);
      if (url && url !== lastUrl) {
        lastUrl = url;
        updateApiFile(url);
      }
    }
  } catch (err) {
    // تجاهل الأخطاء المؤقتة
  }
}

console.log('🔄 مراقبة الرابط... (اضغط Ctrl+C للإيقاف)');
check();
setInterval(check, 5000);