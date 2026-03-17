const fs = require('fs');
const path = require('path');

const map = {
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=500&fit=crop': 'team-collab.webp',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop': 'analytics-dashboard.webp',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop': 'analytics-blog.webp',
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop': 'engineering-site.webp',
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=400&fit=crop': 'engineering-thumb.webp',
  'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=800&h=600&fit=crop': 'apparel.webp',
  'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=800&h=400&fit=crop': 'apparel-thumb.webp',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=600&fit=crop': 'seniors-learning.webp',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=400&fit=crop': 'seniors-thumb.webp',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=450&fit=crop': 'fundraising.webp',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=450&fit=crop': 'utility-planning.webp',
  'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=450&fit=crop': 'navigation-app.webp',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop': 'blue-water-bridge.webp',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&h=500&fit=crop': 'blue-water-bridge-wide.webp',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop': 'cityscape.webp',
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop': 'mobile-app.webp',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop': 'seo-data.webp',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=600&fit=crop': 'writing.webp',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop': 'office-modern.webp',
  'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=600&fit=crop': 'security.webp',
  'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=600&fit=crop': 'workspace.webp',
  'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&h=400&fit=crop': 'website-speed.webp',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=400&fit=crop': 'social-media.webp',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face': 'portrait.webp',
};

// about.html long URLs (match by photo ID prefix)
const aboutMap = {
  'photo-1763441100534-aa374a2bd4bd': 'waterfront.webp',
  'photo-1765648636118-6d1eaaeb669f': 'team-editorial.webp',
};

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

const root = path.resolve(__dirname);
const files = getFiles(root, '.html');
let totalReplacements = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let count = 0;
  const relPath = path.relative(root, file).replace(/\\/g, '/');
  const isSubDir = subDirs.some(d => relPath.startsWith(d + '/'));
  const prefix = isSubDir ? '../assets/images/' : 'assets/images/';

  // Replace exact URL matches
  for (const [url, localFile] of Object.entries(map)) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'g');
    const matches = content.match(re);
    if (matches) {
      content = content.replace(re, prefix + localFile);
      count += matches.length;
    }
  }

  // Replace about.html long URLs by photo ID
  for (const [photoId, localFile] of Object.entries(aboutMap)) {
    const re = new RegExp('https://images\\.unsplash\\.com/' + photoId + '[^"]*', 'g');
    const matches = content.match(re);
    if (matches) {
      content = content.replace(re, prefix + localFile);
      count += matches.length;
    }
  }

  if (count > 0) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`${relPath}: ${count} replacement(s)`);
    totalReplacements += count;
  }
}
console.log(`\nTotal: ${totalReplacements} replacements across ${files.length} files scanned`);
