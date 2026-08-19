// سكريبت إصلاح الأنماط المكسورة في الواجهة الأمامية
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
  let changed = false;

  // إصلاح: `${API_BASE}/path' → `${API_BASE}/path`
  // هذا يستبدل ' بعد رابط API_BASE بـ `
  const pattern1 = /`\$\{API_BASE\}[^`\r\n]*?'/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, (match) => {
      // إزالة الاقتباس الأخير واستبداله بـ `
      return match.slice(0, -1) + '`';
    });
    changed = true;
  }

  // إصلاح: `${API_BASE}/path" → `${API_BASE}/path`
  const pattern2 = /`\$\{API_BASE\}[^`\r\n]*?"/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, (match) => {
      return match.slice(0, -1) + '`';
    });
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ تم إصلاح: ' + path.relative(frontendSrc, filePath));
  }
}

const files = walkDir(frontendSrc);
files.forEach(fixFile);
console.log('\n🎉 تم إصلاح جميع الملفات بنجاح!');