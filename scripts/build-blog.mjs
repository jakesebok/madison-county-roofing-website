// Blog static-site build — LocalCraft reusable kit (drop-in for any flat
// static customer site).
//
// Renders content/blog/*.md (frontmatter + markdown body, as written by the
// LocalCraft publish bot) into /blog/{slug}/index.html + a /blog/ index, in
// the SITE'S OWN design system — it extracts the live header/footer/head
// chrome straight from index.html, so there is nothing per-site to template.
// It injects the bot's pre-built schema, refreshes the blog entries in
// sitemap.xml, and (geo guardrail) SKIPS any post whose slug/title/body
// mentions a banned term from blog.config.json.
//
// Config: blog.config.json at the site root:
//   { "origin": "https://example.com", "bannedTerms": ["benld"] }
//
// Run: npm run build   (set as the Vercel build command on the git-connected project)

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "content", "blog");
const OUT = path.join(ROOT, "blog");
const SITEMAP = path.join(ROOT, "sitemap.xml");

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "blog.config.json"), "utf8"));
const ORIGIN = cfg.origin.replace(/\/$/, "");
const BANNED = (cfg.bannedTerms || []).map((t) => String(t).toLowerCase());

marked.setOptions({ mangle: false, headerIds: false });
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Extract the site's own chrome from the homepage (no per-site template) ──
const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const grab = (re) => (home.match(re) || [""])[0];
const SKIP = grab(/<a class="skip-link"[\s\S]*?<\/a>/i);
const HEADER = grab(/<header[\s\S]*?<\/header>/i);
const FOOTER = grab(/<footer[\s\S]*?<\/footer>/i);
// Head base: reuse fonts/styles/favicons/manifest/theme-color/pixel from the
// homepage; strip the page-specific tags we set per post.
let HEAD_BASE = (home.match(/<head>([\s\S]*?)<\/head>/i) || [, ""])[1]
  .replace(/<title>[\s\S]*?<\/title>/i, "")
  .replace(/<meta\s+name="description"[^>]*>/i, "")
  .replace(/<link\s+rel="canonical"[^>]*>/i, "")
  .replace(/<meta\s+property="og:[^>]*>/gi, "")
  .replace(/<meta\s+name="twitter:[^>]*>/gi, "")
  .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, "")
  .trim();

// Minimal, structure-agnostic behavior for the shared header/footer
// (nav toggle + header scroll state + scroll-reveal). Matches every
// LocalCraft site's #siteHeader / #navToggle / #primaryNav contract.
const SCRIPTS = `
<script>
(function () {
  var header = document.getElementById("siteHeader");
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("primaryNav");
  if (header) {
    var trigger = Math.min(window.innerHeight * 0.3, 200);
    function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > trigger); }
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  }
  if (toggle && header) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }
  if (nav && header) {
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { header.classList.remove("is-open"); if (toggle) toggle.setAttribute("aria-expanded", "false"); }
    });
  }
  var rev = document.querySelectorAll("[data-reveal]");
  if (rev.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    rev.forEach(function (el) { io.observe(el); });
  }
}());
</script>`;

function readPosts() {
  if (!fs.existsSync(SRC)) return [];
  const posts = [];
  for (const file of fs.readdirSync(SRC)) {
    if (!file.endsWith(".md")) continue;
    const { data, content } = matter(fs.readFileSync(path.join(SRC, file), "utf8"));
    const slug = data.slug || file.replace(/\.md$/, "");
    const hay = `${slug} ${data.title || ""} ${content}`.toLowerCase();
    const hit = BANNED.find((b) => hay.includes(b));
    if (hit) {
      console.warn(`  ⛔ SKIPPED "${slug}" — banned term "${hit}" (geo rule). Not rendered.`);
      continue;
    }
    posts.push({ ...data, slug, body: content });
  }
  posts.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
  return posts;
}

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
const readTime = (body) => `${Math.max(1, Math.round(body.split(/\s+/).length / 200))} min read`;

function layout({ title, description, canonical, ogImage, jsonld }, bodyHtml) {
  const og = ogImage || `${ORIGIN}/og-default.png`;
  const ld = (jsonld || [])
    .filter(Boolean)
    .map((o) => `<script type="application/ld+json">${typeof o === "string" ? o : JSON.stringify(o)}</script>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
${HEAD_BASE}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${og}">
${ld}
</head>
<body>
${SKIP}
${HEADER}
<main id="main">
${bodyHtml}
</main>
${FOOTER}
${SCRIPTS}
</body>
</html>
`;
}

function faqHtml(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";
  const items = faq
    .map(
      (f) => `
        <details class="blog-faq-item"><summary>${esc(f.q)}</summary><div class="blog-faq-a"><p>${esc(f.a)}</p></div></details>`
    )
    .join("");
  return `
  <section class="band-surface" aria-labelledby="faq-h" data-reveal>
    <div class="container blog-faq">
      <p class="eyebrow">Common questions</p>
      <h2 id="faq-h">Questions teams ask.</h2>
      <div class="blog-faq-list">${items}</div>
    </div>
  </section>`;
}

function postPage(p) {
  const url = `${ORIGIN}/blog/${p.slug}/`;
  const hero = p.hero_image_url
    ? `<div class="container blog-measure"><figure class="blog-hero-figure"><img src="${esc(
        p.hero_image_url
      )}" alt="${esc(p.title)}" loading="eager" decoding="async"></figure></div>`
    : "";
  const body = `
  <article class="blog-post">
    <header class="blog-post-head" data-reveal>
      <div class="container blog-measure">
        <p class="eyebrow"><a href="/blog/" class="blog-kicker-link">Insights</a></p>
        <h1>${esc(p.title)}</h1>
        <p class="blog-meta">${fmtDate(p.published_at)} · ${readTime(p.body)}</p>
      </div>
    </header>
    ${hero}
    <div class="container blog-measure"><div class="blog-prose" data-reveal>
${marked.parse(p.body)}
    </div></div>
  </article>
  ${faqHtml(p.faq)}`;
  return layout(
    {
      title: `${p.title} | ${cfg.brandName || ""}`.trim().replace(/\|\s*$/, "").trim(),
      description: p.excerpt || p.title,
      canonical: url,
      ogImage: p.hero_image_url,
      jsonld: [p.schema_article, p.schema_faqpage]
    },
    body
  );
}

function indexPage(posts) {
  const cards = posts
    .map(
      (p) => `
        <a class="card blog-card" href="/blog/${p.slug}/">
          <div class="num">${fmtDate(p.published_at)}</div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.excerpt || "")}</p>
          <span class="offer-link">Read the article →</span>
        </a>`
    )
    .join("");
  const body = `
  <section class="page-hero ty-hero" aria-labelledby="page-h" data-reveal>
    <div class="container">
      <p class="eyebrow">Insights</p>
      <h1 id="page-h">${esc(cfg.blogTitle || "From the blog.")}</h1>
      ${cfg.blogLede ? `<p class="lede">${esc(cfg.blogLede)}</p>` : ""}
    </div>
  </section>
  <section aria-labelledby="posts-h" data-reveal>
    <div class="container">
      <h2 id="posts-h" class="sr-only">Articles</h2>
      <div class="card-grid">${
        posts.length ? cards : `<div class="card"><p class="font-prose">New articles are on the way.</p></div>`
      }</div>
    </div>
  </section>`;
  return layout(
    {
      title: `Blog | ${cfg.brandName || ""}`.trim().replace(/\|\s*$/, "").trim(),
      description: cfg.blogLede || "Articles and insights.",
      canonical: `${ORIGIN}/blog/`,
      jsonld: [{ "@context": "https://schema.org", "@type": "Blog", "@id": `${ORIGIN}/blog/#blog`, url: `${ORIGIN}/blog/` }]
    },
    body
  );
}

function refreshSitemap(posts) {
  if (!fs.existsSync(SITEMAP)) return;
  let xml = fs.readFileSync(SITEMAP, "utf8");
  xml = xml.replace(/\s*<url>(?:(?!<\/url>)[\s\S])*?\/blog\/[\s\S]*?<\/url>/g, "");
  const entries = [
    { loc: `${ORIGIN}/blog/`, lastmod: posts[0]?.published_at },
    ...posts.map((p) => ({ loc: `${ORIGIN}/blog/${p.slug}/`, lastmod: p.modified_at || p.published_at }))
  ]
    .map(
      (e) =>
        `  <url>\n    <loc>${e.loc}</loc>${
          e.lastmod ? `\n    <lastmod>${new Date(e.lastmod).toISOString().slice(0, 10)}</lastmod>` : ""
        }\n  </url>`
    )
    .join("\n");
  fs.writeFileSync(SITEMAP, xml.replace(/\s*<\/urlset>/, `\n${entries}\n</urlset>`));
}

const posts = readPosts();
fs.mkdirSync(OUT, { recursive: true });
for (const p of posts) {
  fs.mkdirSync(path.join(OUT, p.slug), { recursive: true });
  fs.writeFileSync(path.join(OUT, p.slug, "index.html"), postPage(p));
  console.log(`  ✓ /blog/${p.slug}/`);
}
fs.writeFileSync(path.join(OUT, "index.html"), indexPage(posts));
refreshSitemap(posts);

// Flat sites serve from root, not /public. The publish bot drops its IndexNow
// key + llms.txt into public/ — relocate any *.txt to root so they actually
// serve (IndexNow verification + AI-crawler llms.txt). BUILD-STANDARDS §18.
const PUB = path.join(ROOT, "public");
if (fs.existsSync(PUB)) {
  for (const f of fs.readdirSync(PUB)) {
    if (f.endsWith(".txt")) fs.copyFileSync(path.join(PUB, f), path.join(ROOT, f));
  }
}

console.log(`Built ${posts.length} post(s) + /blog/ index.`);
