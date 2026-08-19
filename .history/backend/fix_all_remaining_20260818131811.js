// سكريبت إصلاح شامل لجميع القوالب النصية في الواجهة الأمامية
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

  // استبدال '${API_BASE}' بـ `${API_BASE}` (اقتباس مفرد)
  var singleOld = "'" + '${API_BASE}';
  var singleNew = '`' + '${API_BASE}';
  if (content.includes(singleOld)) {
    content = content.split(singleOld).join(singleNew);
    changed = true;
  }

  // استبدال "${API_BASE}" بـ `${API_BASE}` (اقتباس مزدوج)
  var doubleOld = '"' + '${API_BASE}';
  var doubleNew = '`' + '${API_BASE}';
  if (content.includes(doubleOld)) {
    content = content.split(doubleOld).join(doubleNew);
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