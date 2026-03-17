const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const subDirs = ['areas', 'portfolio'];
const cdnUrl = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';

function getFiles(dir, ext) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && !['node_modules', '.git', 'assets'].includes(f)) {
      results = results.concat(getFiles(full, ext));
    } else if (f.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

const files = getFiles(root, '.html');
let total = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes(cdnUrl)) continue;

  const relPath = path.relative(root, file).replace(/\\/g, '/');
  const isSubDir = subDirs.some(d => relPath.startsWith(d + '/'));
  const localPath = isSubDir ? '../assets/js/lucide.min.js' : 'assets/js/lucide.min.js';

  content = content.split(cdnUrl).join(localPath);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`${relPath}: replaced`);
  total++;
}
console.log(`\nTotal: ${total} files updated`);
