// سكريبت إصلاح جميع القوالب النصية المكسورة في الواجهة الأمامية
// الأنماط المكسورة: `${API_BASE}/...' أو `${API_BASE}/..."
// يجب أن تكون: `${API_BASE}/...`

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

  // النمط 1: `${API_BASE}/...' ← `${API_BASE}/...`
  content = content.replace(/(`\$\{API_BASE\}[^`\r\n]*?)'/g, (match, group1) => {
    // لا نستبدل إذا كان هناك حرف ' داخل النص
    if (group1.includes("'")) return match;
    changed = true;
    return group1 + '`';
  });

  // النمط 2: `${API_BASE}/..." ← `${API_BASE}/...`
  content = content.replace(/(`\$\{API_BASE\}[^`\r\n]*?)"/g, (match, group1) => {
    if (group1.includes('"')) return match;
    changed = true;
    return group1 + '`';
  });

  // النمط 3: '${API_BASE}/... ← `${API_BASE}/...` (بدون إغلاق)
  content = content.replace(/'(\$\{API_BASE\}[^'\r\n]*)/g, (match, group1) => {
    // إذا كان السطر ينتهي بـ { method: 'POST' } فلا نغيره
    if (group1.includes("method: '")) return match;
    changed = true;
    return '`' + group1 + '`';
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ تم إصلاح: ' + path.relative(frontendSrc, filePath));
  }
}

const files = walkDir(frontendSrc);
files.forEach(fixFile);
console.log('\n🎉 تم إصلاح جميع الملفات بنجاح!');