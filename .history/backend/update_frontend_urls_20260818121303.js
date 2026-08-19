// سكريبت تحديث جميع روابط API في الواجهة الأمامية
// يستبدل الرابط المؤقت بالرابط المركزي من utils/api.ts

const fs = require('fs');
const path = require('path');

const frontendSrc = path.join(__dirname, '..', 'frontend', 'src');
const OLD_URL = 'https://quarterly-belfast-thorough-respect.trycloudflare.com';
const OLD_LOCAL = 'http://192.168.1.37:5000';

function walkDir(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...walkDir(filePath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // استبدال الرابط المؤقت
  if (content.includes(OLD_URL)) {
    content = content.split(OLD_URL).join('${API_BASE}');
    changed = true;
  }

  // استبدال الرابط المحلي
  if (content.includes(OLD_LOCAL)) {
    content = content.split(OLD_LOCAL).join('${API_BASE}');
    changed = true;
  }

  if (changed) {
    // إضافة import للرابط المركزي إذا لم يكن موجوداً
    if (!content.includes("from '@/utils/api'") && !content.includes('from "@/utils/api"')) {
      // إضافة import بعد آخر import موجود
      const importMatch = content.match(/import[^;]+;\n/g);
      if (importMatch && importMatch.length > 0) {
        const lastImport = importMatch[importMatch.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length;
        content = content.slice(0, lastImportIndex) + "import { API_BASE } from '@/utils/api';\n" + content.slice(lastImportIndex);
      } else {
        content = "import { API_BASE } from '@/utils/api';\n" + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ تم تحديث: ${path.relative(frontendSrc, filePath)}`);
  }
}

const files = walkDir(frontendSrc);
files.forEach(updateFile);
console.log('\n🎉 تم تحديث جميع الملفات بنجاح!');