const { HtmlBasePlugin } = require("@11ty/eleventy");
const inlineIcons = require("./scripts/inline-icons");
const cleanLinks = require("./scripts/clean-links");

module.exports = function (eleventyConfig) {
  // Automatically rewrite all URLs to include pathPrefix
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Inline Lucide icons at build time (replaces <i data-lucide="..."> with <svg>)
  eleventyConfig.addTransform("inline-icons", inlineIcons);

  // Point internal links at clean URLs (/about, not /about.html) so crawlers
  // and visitors skip the 301 hop. See scripts/clean-links.js.
  eleventyConfig.addTransform("clean-links", cleanLinks);

  // Passthrough copy static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/.htaccess");
  // anke app privacy policy (Google Play requirement) lives at
  // src/anke-privacy.html — 11ty renders it as a standalone page (no TPH
  // layout, since it's outside src/pages/) at /anke-privacy/.

  // Blog post collection sorted by date (newest first)
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date);
  });

  // Date formatting filter
  eleventyConfig.addFilter("dateFormat", function (date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  // ISO date filter for sitemaps and feeds
  eleventyConfig.addFilter("isoDate", function (date) {
    return new Date(date).toISOString().split("T")[0];
  });

  // Sitemap: every real page, with <lastmod> from the last git commit that touched
  // its source file (or the file's modified time if it has uncommitted edits).
  // Accurate lastmod is what tells Google and Bing which pages to re-crawl, and
  // tph-deploy uses it to decide which URLs to send to IndexNow after a deploy.
  // One git call for the whole repo instead of one per page (keeps builds fast).
  let gitDates = null;
  function lastmodOf(inputPath) {
    const today = new Date().toISOString().slice(0, 10);
    if (!inputPath) return today;
    const { execFileSync } = require("child_process");
    const fs = require("fs");
    if (!gitDates) {
      gitDates = { dates: new Map(), dirty: new Set() };
      try {
        let day = null;
        for (const line of execFileSync("git", ["log", "--format=@%cs", "--name-only", "--", "src"], { cwd: __dirname, maxBuffer: 64 * 1024 * 1024 }).toString().split(/\r?\n/)) {
          if (line.startsWith("@")) day = line.slice(1);
          else if (line && !gitDates.dates.has(line)) gitDates.dates.set(line, day);
        }
        for (const line of execFileSync("git", ["status", "--porcelain", "--", "src"], { cwd: __dirname }).toString().split(/\r?\n/)) {
          if (line.trim()) gitDates.dirty.add(line.slice(3).trim().replace(/^"|"$/g, ""));
        }
      } catch {}
    }
    const rel = inputPath.replace(/^\.\//, "").replace(/\\/g, "/");
    if (!gitDates.dirty.has(rel) && gitDates.dates.has(rel)) return gitDates.dates.get(rel);
    try { return fs.statSync(inputPath).mtime.toISOString().slice(0, 10); } catch { return today; }
  }
  eleventyConfig.addFilter("lastmod", lastmodOf);

  eleventyConfig.addFilter("sitemapPages", function (all) {
    const SKIP = /^\/(404|anke)([./-]|$)/;
    const group = (loc) => (loc === "/" ? 0 : loc.startsWith("/areas/") ? 2 : loc.startsWith("/portfolio/") ? 3 : loc === "/blog" ? 4 : loc.startsWith("/blog/") ? 5 : 1);
    return all
      .filter((item) => item.url && (item.url.endsWith(".html") || item.url.endsWith("/")) && item.data.sitemap !== false && !SKIP.test(item.url))
      .map((item) => {
        const loc = item.url.replace(/index\.html$/, "").replace(/\.html$/, "");
        let lastmod = lastmodOf(item.inputPath);
        if (loc.startsWith("/blog/") && item.date) {
          const pub = new Date(item.date).toISOString().slice(0, 10);
          if (pub > lastmod) lastmod = pub;
        }
        return { loc, lastmod, date: item.date };
      })
      .sort((a, b) => group(a.loc) - group(b.loc) || (group(a.loc) === 5 ? b.date - a.date : 0));
  });

  // String startsWith filter for breadcrumbs
  eleventyConfig.addFilter("startsWith", function (str, prefix) {
    return str && str.startsWith(prefix);
  });

  // Excerpt filter — first paragraph of content
  eleventyConfig.addFilter("excerpt", function (content) {
    if (!content) return "";
    const match = content.match(/<p>(.*?)<\/p>/s);
    return match ? match[1].replace(/<[^>]+>/g, "") : "";
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
