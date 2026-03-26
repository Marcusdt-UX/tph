const { HtmlBasePlugin } = require("@11ty/eleventy");
const inlineIcons = require("./scripts/inline-icons");

module.exports = function (eleventyConfig) {
  // Automatically rewrite all URLs to include pathPrefix
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Inline Lucide icons at build time (replaces <i data-lucide="..."> with <svg>)
  eleventyConfig.addTransform("inline-icons", inlineIcons);

  // Passthrough copy static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/.htaccess");

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
