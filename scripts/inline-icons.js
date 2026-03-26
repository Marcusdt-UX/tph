/**
 * 11ty Transform: Inline Lucide icons at build time.
 *
 * Replaces <i data-lucide="icon-name" ...></i> with inline <svg> elements,
 * eliminating the need for lucide.min.js at runtime.
 *
 * This removes ~35KB of JS and 37+ DOM mutations from page load.
 */

const fs = require('fs');
const path = require('path');

// Parse the icon data from the lucide.min.js bundle
let iconData = null;

function loadIcons() {
  if (iconData) return iconData;

  const bundlePath = path.join(__dirname, '..', 'src', 'assets', 'js', 'lucide.min.js');
  const bundle = fs.readFileSync(bundlePath, 'utf8');

  // Extract the icons object from the IIFE
  const match = bundle.match(/var icons=\{(.+?)\};\nfunction ce/s);
  if (!match) throw new Error('Could not parse lucide.min.js icon data');

  // Parse the icon JSON entries
  iconData = {};
  try {
    const obj = JSON.parse('{' + match[1] + '}');
    for (const [name, data] of Object.entries(obj)) {
      iconData[name.toLowerCase()] = data;
    }
  } catch (e) {
    // Fallback: evaluate in a safe context
    const fn = new Function('return {' + match[1] + '}');
    const obj = fn();
    for (const [name, data] of Object.entries(obj)) {
      iconData[name.toLowerCase()] = data;
    }
  }

  return iconData;
}

/**
 * Convert kebab-case to PascalCase for icon lookup
 */
function toPascal(str) {
  return str.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
}

/**
 * Recursively build SVG string from Lucide icon data: [tag, attrs, children]
 */
function buildSvg(node) {
  const [tag, attrs, children] = node;
  let html = '<' + tag;
  for (const [k, v] of Object.entries(attrs || {})) {
    html += ' ' + k + '="' + String(v).replace(/"/g, '&quot;') + '"';
  }
  if (children && children.length) {
    html += '>';
    for (const child of children) {
      html += buildSvg(child);
    }
    html += '</' + tag + '>';
  } else {
    html += '/>';
  }
  return html;
}

/**
 * Replace all <i data-lucide="name" ...></i> with inline SVGs.
 */
function inlineIcons(content, outputPath) {
  if (!outputPath || !outputPath.endsWith('.html')) return content;

  const icons = loadIcons();

  // Match <i data-lucide="icon-name" ...></i> or self-closing
  return content.replace(/<i\s([^>]*?)data-lucide="([^"]+)"([^>]*?)><\/i>/gi, (match, before, iconName, after) => {
    const pascalName = toPascal(iconName);
    const data = icons[pascalName.toLowerCase()];
    if (!data) {
      console.warn(`[inline-icons] Unknown icon: ${iconName} (${pascalName})`);
      return match; // Keep original if icon not found
    }

    // Collect attributes from the original <i> tag
    const allAttrs = before + after;
    const extraAttrs = {};
    const attrRegex = /(\w[\w-]*)="([^"]*)"/g;
    let m;
    while ((m = attrRegex.exec(allAttrs)) !== null) {
      if (m[1] !== 'data-lucide') {
        extraAttrs[m[1]] = m[2];
      }
    }

    // Build SVG with merged attributes
    const [tag, defaultAttrs, children] = data;
    const mergedAttrs = { ...defaultAttrs };
    mergedAttrs['data-lucide'] = iconName;

    // Build CSS classes
    const classes = ['lucide', 'lucide-' + iconName];
    if (extraAttrs['class']) {
      classes.push(extraAttrs['class']);
      delete extraAttrs['class'];
    }
    mergedAttrs['class'] = classes.join(' ');

    // Merge remaining attributes (style, aria-*, etc.)
    for (const [k, v] of Object.entries(extraAttrs)) {
      mergedAttrs[k] = v;
    }

    return buildSvg([tag, mergedAttrs, children]);
  });
}

module.exports = inlineIcons;
