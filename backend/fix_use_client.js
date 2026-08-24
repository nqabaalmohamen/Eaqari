// سكريبت إزالة تكرارات 'use client' وضمان وجود واحد فقط في السطر الأول
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
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  return results;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // حساب عدد مرات ظهور 'use client'
  const matches = content.match(/^['"]use client['"];/gm) || [];

  if (matches.length > 1) {
    // إزالة كل أسطر 'use client'
    content = content.replace(/^['"]use client['"];\r?\n/gm, '');
    content = content.replace(/^['"]use client['"]\r?\n/gm, ''); // without semicolon
    // إزالة الأسطر الفارغة الزائدة في البداية
    content = content.replace(/^\s+/, '');
    // إضافة واحد فقط في السطر الأول
    content = "'use client';\n\n" + content;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ تم إصلاح: ${path.relative(frontendSrc, filePath)} (كان ${matches.length} تكرار)`);
  }
}

const files = walkDir(frontendSrc);
files.forEach(fixFile);
console.log('\n🎉 تم إصلاح جميع الملفات بنجاح!');