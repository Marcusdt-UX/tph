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

module.exports = function cleanLinks(content) {
  if (!this.page.outputPath || !this.page.outputPath.endsWith(".html")) return content;
  if (this.page.outputPath.replace(/\\/g, "/").includes("/anke")) return content;

  return content.replace(PATTERN, (m, prefix, origin, path) => {
    const clean = path === "index" ? "" : path;
    return `${prefix}${origin}/${clean}`;
  });
};
