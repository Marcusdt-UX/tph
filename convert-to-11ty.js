const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const srcPages = path.join(root, 'src', 'pages');
const siteUrl = 'https://thomaspublishinghouse.com';

// All HTML pages and their output locations
const pages = [
  // Root pages
  'index.html', 'about.html', 'services.html', 'portfolio.html',
  'pricing.html', 'faq.html', 'contact.html', 'privacy.html',
  'blog.html', 'web-design.html', 'seo-services.html',
  'app-development.html', 'ux-design.html', 'content-creation.html',
  'maintenance.html', '404.html',
  // Subdirectory pages
  'areas/st-clair-county.html', 'areas/macomb-county.html',
  'areas/sarnia-lambton.html', 'areas/southeast-michigan.html',
  'portfolio/engidynamics.html', 'portfolio/four-farms.html',
  'portfolio/roskeys.html',
];

function extract(html, regex) {
  const m = html.match(regex);
  return m ? m[1].trim() : '';
}

function escapeYaml(str) {
  if (!str) return '""';
  // If contains special chars, wrap in double quotes and escape internal quotes
  if (str.includes(':') || str.includes('#') || str.includes('"') || str.includes("'") || str.includes('\n') || str.startsWith('{') || str.startsWith('[')) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return str;
}

for (const relPath of pages) {
  const htmlPath = path.join(root, relPath);
  if (!fs.existsSync(htmlPath)) {
    console.log(`SKIP (not found): ${relPath}`);
    continue;
  }

  const html = fs.readFileSync(htmlPath, 'utf8');

  // Extract metadata
  const title = extract(html, /<title>([\s\S]*?)<\/title>/);
  const description = extract(html, /<meta\s+name="description"\s+content="([\s\S]*?)"/);
  const canonical = extract(html, /<link\s+rel="canonical"\s+href="([\s\S]*?)"/);
  const ogTitle = extract(html, /<meta\s+property="og:title"\s+content="([\s\S]*?)"/);
  const ogDescription = extract(html, /<meta\s+property="og:description"\s+content="([\s\S]*?)"/);
  const ogType = extract(html, /<meta\s+property="og:type"\s+content="([\s\S]*?)"/);
  const ogUrl = extract(html, /<meta\s+property="og:url"\s+content="([\s\S]*?)"/);
  const ogImage = extract(html, /<meta\s+property="og:image"\s+content="([\s\S]*?)"/);
  const twitterCard = extract(html, /<meta\s+name="twitter:card"\s+content="([\s\S]*?)"/);
  const twitterTitle = extract(html, /<meta\s+name="twitter:title"\s+content="([\s\S]*?)"/);
  const twitterDescription = extract(html, /<meta\s+name="twitter:description"\s+content="([\s\S]*?)"/);
  const twitterImage = extract(html, /<meta\s+name="twitter:image"\s+content="([\s\S]*?)"/);
  const robots = extract(html, /<meta\s+name="robots"\s+content="([\s\S]*?)"/);

  // Extract JSON-LD schema
  const schemaMatch = html.match(/<script\s+type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  const schema = schemaMatch ? schemaMatch[1].trim() : '';

  // Extract main content style attribute
  const mainTagMatch = html.match(/<main[^>]*id="main-content"[^>]*>/);
  let mainStyle = '';
  if (mainTagMatch) {
    const styleMatch = mainTagMatch[0].match(/style="([^"]*)"/);
    if (styleMatch) mainStyle = styleMatch[1];
  }

  // Extract content between <main...> and </main>
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  let mainContent = mainMatch ? mainMatch[1] : '';

  // Normalize asset paths — convert relative ../assets/ and assets/ to absolute /assets/
  mainContent = mainContent.replace(/(?:\.\.\/)+assets\//g, '/assets/');
  mainContent = mainContent.replace(/"assets\//g, '"/assets/');
  mainContent = mainContent.replace(/'assets\//g, "'/assets/");

  // Normalize page links — convert ../ prefixed links to absolute
  mainContent = mainContent.replace(/href="\.\.\/([^"]+)"/g, 'href="/$1"');

  // Clean leading/trailing whitespace but preserve internal formatting
  mainContent = mainContent.replace(/^\n+/, '').replace(/\n+$/, '');

  // Build frontmatter
  let fm = '---\n';
  fm += `title: ${escapeYaml(title)}\n`;
  fm += `description: ${escapeYaml(description)}\n`;
  if (canonical) fm += `canonical: ${canonical}\n`;
  if (ogTitle) fm += `ogTitle: ${escapeYaml(ogTitle)}\n`;
  if (ogDescription) fm += `ogDescription: ${escapeYaml(ogDescription)}\n`;
  if (ogType && ogType !== 'website') fm += `ogType: ${ogType}\n`;
  if (ogUrl) fm += `ogUrl: ${ogUrl}\n`;
  if (twitterTitle && twitterTitle !== ogTitle) fm += `twitterTitle: ${escapeYaml(twitterTitle)}\n`;
  if (twitterDescription && twitterDescription !== ogDescription) fm += `twitterDescription: ${escapeYaml(twitterDescription)}\n`;
  if (robots) fm += `robots: ${robots}\n`;
  if (mainStyle) fm += `mainStyle: ${escapeYaml(mainStyle)}\n`;

  // Handle special permalink for index and 404
  const slug = path.basename(relPath, '.html');
  if (slug === 'index') {
    fm += `permalink: /index.html\n`;
  } else if (slug === '404') {
    fm += `permalink: /404.html\n`;
  }

  if (schema) {
    // Indent schema for YAML block scalar
    fm += `schema: |\n`;
    for (const line of schema.split('\n')) {
      fm += `  ${line}\n`;
    }
  }

  fm += '---\n';

  // Determine output path
  const njkRelPath = relPath.replace('.html', '.njk');
  const outPath = path.join(srcPages, njkRelPath);
  const outDir = path.dirname(outPath);
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outPath, fm + mainContent + '\n', 'utf8');
  console.log(`OK: ${relPath} → src/pages/${njkRelPath}`);
}

console.log('\nDone! All pages converted.');
