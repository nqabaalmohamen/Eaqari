const fs = require('fs');
const file = 'd:/Eaqari/frontend/src/app/register/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('return (\r\n    <main className="fixed inset-0 bg-gradient-to-br');
if (startIdx !== -1) {
    const endIdx = content.indexOf('</main>\r\n  );\r\n}', startIdx);
    if (endIdx !== -1) {
        const replacement = content.substring(startIdx, endIdx + 16);
        const originalStartIdx = content.indexOf('return (\r\n\r\n    <main className="min-h-screen flex items-center');
        if (originalStartIdx !== -1) {
             const finalContent = content.substring(0, originalStartIdx) + replacement;
             fs.writeFileSync(file, finalContent);
             console.log('Fixed duplicate content.');
        } else {
             console.log('original start not found');
             // Maybe different line endings
             const origStart2 = content.indexOf('return (\n\n    <main className="min-h-screen');
             if (origStart2 !== -1) {
                  const finalContent = content.substring(0, origStart2) + replacement;
                  fs.writeFileSync(file, finalContent);
                  console.log('Fixed duplicate content.');
             }
        }
    }
}
