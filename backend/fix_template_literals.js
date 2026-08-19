// سكريبت إصلاح القوالب النصية الخاطئة في جميع ملفات الواجهة الأمامية
// يستبدل '${API_BASE}' أو "${API_BASE}" بـ `${API_BASE}`

const fs = require('fs');
const path = require('path');

const frontendSrc = path.join(__dirname, '..', 'frontend', 'src');

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

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // إصلاح: '${API_BASE}' → `${API_BASE}`
  // نستخدم regex للبحث عن النص الحرفي '${API_BASE}' داخل علامات اقتباس
  const singleQuoteRegex = /'\$\{API_BASE\}'/g;
  if (singleQuoteRegex.test(content)) {
    content = content.replace(singleQuoteRegex, '`${API_BASE}`');
    changed = true;
  }

  // إصلاح: "${API_BASE}" → `${API_BASE}`
  const doubleQuoteRegex = /"\$\{API_BASE\}"/g;
  if (doubleQuoteRegex.test(content)) {
    content = content.replace(doubleQuoteRegex, '`${API_BASE}`');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ تم إصلاح: ${path.relative(frontendSrc, filePath)}`);
  }
}

const files = walkDir(frontendSrc);
files.forEach(fixFile);
console.log('\n🎉 تم إصلاح جميع الملفات بنجاح!');