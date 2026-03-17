const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const subDirs = ['areas', 'portfolio'];

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

const replacements = [
  ['assets/css/styles.css', 'assets/css/styles.min.css'],
  ['assets/js/main.js', 'assets/js/main.min.js'],
  ['../assets/css/styles.css', '../assets/css/styles.min.css'],
  ['../assets/js/main.js', '../assets/js/main.min.js'],
];

const files = getFiles(root, '.html');
let total = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    const relPath = path.relative(root, file).replace(/\\/g, '/');
    console.log(`${relPath}: updated`);
    total++;
  }
}
console.log(`\nTotal: ${total} files updated`);
