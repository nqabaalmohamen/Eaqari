// سكريبت إصلاح ترتيب 'use client' في جميع ملفات الواجهة الأمامية
// يجب أن يكون 'use client' في السطر الأول دائماً

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

  // إذا كان الملف يحتوي على 'use client' أو "use client"
  const hasUseClient = content.includes("'use client'") || content.includes('"use client"');

  if (hasUseClient) {
    // إزالة جميع أسطر 'use client' الموجودة (بما فيها المكررة)
    content = content.replace(/^['"]use client['"];\n/gm, '');
    // إزالة الأسطر الفارغة الزائدة في البداية
    content = content.replace(/^\n+/, '');
    // إضافة 'use client' في السطر الأول
    content = "'use client';\n\n" + content;
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