/**
 * 11ty Transform: rewrite internal ".html" links to clean URLs.
 *
 * The server already 301-redirects /page.html -> /page, but templates still
 * link to the .html versions. That makes every internal click and every
 * Googlebot crawl go through a redirect hop. This transform rewrites
 * internal links (root-relative and absolute to our own domain) at build
 * time so the HTML points straight at the canonical URL.
 *
 * Output filenames are unchanged (the server maps /page -> page.html).
 * The /anke app pages are left alone.
 */

const SITE = "https://thomaspublishinghouse.com";

// href="/foo.html", href="/areas/foo.html#x", "https://thomaspublishinghouse.com/foo.html"
const PATTERN = new RegExp(
  '(href="|"item":\\s*"|"url":\\s*"|<loc>)' +       // attribute / JSON-LD / sitemap context
  "((?:" + SITE.replace(/[.]/g, "\\.") + ")?)" +     // optional absolute origin
  "/(?!anke)([a-z0-9][a-z0-9\\-/]*?)\\.html" +       // internal path ending in .html
  '(?=[#?"<])',
  "g"
);

// href="contact.html", href="portfolio/roskeys.html#top" (no scheme, no leading slash)
const RELATIVE = /href="(?![a-z]+:)([a-z][-a-z0-9/]*)\.html([#?][^"]*)?"/g;

module.exports = function cleanLinks(content) {
  if (!this.page.outputPath || !this.page.outputPath.endsWith(".html")) return content;
  if (this.page.outputPath.replace(/\\/g, "/").includes("/anke")) return content;

  let out = content.replace(PATTERN, (m, prefix, origin, path) => {
    const clean = path === "index" ? "" : path;
    return `${prefix}${origin}/${clean}`;
  });

  // Relative links (href="contact.html", href="st-clair-county.html") are
  // resolved against this page's URL, then cleaned the same way.
  const base = SITE + (this.page.url || "/");
  out = out.replace(RELATIVE, (m, path, suffix) => {
    const resolved = new URL(path + ".html", base).pathname.replace(/\.html$/, "");
    if (resolved.startsWith("/anke")) return m;
    const clean = resolved === "/index" ? "/" : resolved;
    return `href="${clean}${suffix || ""}"`;
  });
  return out;
};
