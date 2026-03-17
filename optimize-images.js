const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const https = require('https');

const IMAGES_DIR = path.join(__dirname, 'assets', 'images');

// Map: filename -> { url, width, height }
const images = [
  { name: 'team-collab.webp', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=500&fit=crop', w: 1200, h: 500 },
  { name: 'analytics-dashboard.webp', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'analytics-blog.webp', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop', w: 800, h: 400 },
  { name: 'engineering-site.webp', url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'engineering-thumb.webp', url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=400&fit=crop', w: 800, h: 400 },
  { name: 'apparel.webp', url: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'apparel-thumb.webp', url: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=800&h=400&fit=crop', w: 800, h: 400 },
  { name: 'seniors-learning.webp', url: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'seniors-thumb.webp', url: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=400&fit=crop', w: 800, h: 400 },
  { name: 'fundraising.webp', url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=450&fit=crop', w: 800, h: 450 },
  { name: 'utility-planning.webp', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=450&fit=crop', w: 800, h: 450 },
  { name: 'navigation-app.webp', url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=450&fit=crop', w: 800, h: 450 },
  { name: 'blue-water-bridge.webp', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Blue_Water_Bridge_2025o.jpg/1200px-Blue_Water_Bridge_2025o.jpg', w: 800, h: 600 },
  { name: 'blue-water-bridge-wide.webp', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Blue_Water_Bridge_2025o.jpg/1200px-Blue_Water_Bridge_2025o.jpg', w: 1200, h: 500 },
  { name: 'cityscape.webp', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'mobile-app.webp', url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'seo-data.webp', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'writing.webp', url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'office-modern.webp', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'security.webp', url: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'workspace.webp', url: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=600&fit=crop', w: 800, h: 600 },
  { name: 'website-speed.webp', url: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&h=400&fit=crop', w: 800, h: 400 },
  { name: 'social-media.webp', url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=400&fit=crop', w: 800, h: 400 },
  { name: 'portrait.webp', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face', w: 400, h: 500 },
  { name: 'waterfront.webp', url: 'https://images.unsplash.com/photo-1763441100534-aa374a2bd4bd?w=1080&fit=max', w: 1080, h: 720 },
  { name: 'team-editorial.webp', url: 'https://images.unsplash.com/photo-1765648636118-6d1eaaeb669f?w=1080&fit=max', w: 1080, h: 720 },
];

function download(url) {
  return new Promise((resolve, reject) => {
    const doRequest = (reqUrl, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(reqUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doRequest(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    doRequest(url);
  });
}

async function processImage(img) {
  const outPath = path.join(IMAGES_DIR, img.name);
  if (fs.existsSync(outPath)) {
    console.log(`  SKIP ${img.name} (exists)`);
    return;
  }
  try {
    const buffer = await download(img.url);
    await sharp(buffer)
      .resize(img.w, img.h, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`  OK   ${img.name} (${Math.round(stat.size / 1024)}KB)`);
  } catch (err) {
    console.error(`  FAIL ${img.name}: ${err.message}`);
  }
}

async function main() {
  console.log(`Downloading & converting ${images.length} images to WebP...\n`);
  // Process 3 at a time to avoid overwhelming the connection
  for (let i = 0; i < images.length; i += 3) {
    const batch = images.slice(i, i + 3);
    await Promise.all(batch.map(processImage));
  }
  console.log('\nDone!');
}

main();
