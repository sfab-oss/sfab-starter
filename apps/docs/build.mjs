// Thin docs renderer (ALW-326 AC-7).
//
// Renders the repo's canonical `docs/` markdown to a static HTML site under
// `dist/`. The markdown in root `docs/` is the single source of truth — this
// app reads it at build time and duplicates nothing. At fabrication the
// `apps/docs` app is DROPPED while `docs/` is KEPT (see .sfab/template.json
// `fabrication.drop`). No framework on purpose: a template's docs preview
// should stay trivial to build, understand, and delete.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = resolve(__dirname, "../../docs");
const OUT_DIR = resolve(__dirname, "dist");

const MD_EXT = /\.md$/;
const H1_RE = /^#\s+(.+)$/m;

/** Recursively collect `.md` files, skipping dotfiles/dirs (e.g. `.local`). */
function collectMarkdown(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectMarkdown(full, acc);
    } else if (entry.endsWith(".md")) {
      acc.push(full);
    }
  }
  return acc;
}

function htmlPathFor(mdAbsPath) {
  return `${relative(DOCS_DIR, mdAbsPath).replace(MD_EXT, ".html")}`;
}

function title(mdAbsPath, source) {
  const h1 = source.match(H1_RE);
  if (h1) {
    return h1[1].trim();
  }
  return relative(DOCS_DIR, mdAbsPath).replace(MD_EXT, "");
}

function navHtml(pages, currentHref) {
  const groups = new Map();
  for (const p of pages) {
    const top = p.href.includes("/") ? p.href.split("/")[0] : ".";
    if (!groups.has(top)) {
      groups.set(top, []);
    }
    groups.get(top).push(p);
  }
  let out = '<nav><a class="brand" href="/index.html">Docs</a>';
  for (const [group, items] of [...groups].sort()) {
    if (group !== ".") {
      out += `<div class="group">${group}</div>`;
    }
    for (const item of items.sort((a, b) => a.title.localeCompare(b.title))) {
      const active = item.href === currentHref ? ' class="active"' : "";
      out += `<a${active} href="/${item.href}">${item.title}</a>`;
    }
  }
  return `${out}</nav>`;
}

function page(bodyHtml, pages, currentHref, pageTitle) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${pageTitle}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.6 system-ui, sans-serif; display: grid; grid-template-columns: 260px 1fr; }
  nav { position: sticky; top: 0; align-self: start; height: 100vh; overflow: auto; padding: 1.5rem 1rem; border-right: 1px solid #8884; }
  nav a { display: block; padding: 0.2rem 0.4rem; border-radius: 6px; text-decoration: none; color: inherit; }
  nav a.active, nav a:hover { background: #8882; }
  nav a.brand { font-weight: 700; font-size: 1.1rem; margin-bottom: 1rem; }
  nav .group { margin: 1rem 0 0.25rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
  main { padding: 2.5rem 3rem; max-width: 60rem; }
  main pre { background: #8881; padding: 1rem; border-radius: 8px; overflow: auto; }
  main code { background: #8881; padding: 0.1em 0.3em; border-radius: 4px; }
  main pre code { background: none; padding: 0; }
  main table { border-collapse: collapse; }
  main th, main td { border: 1px solid #8884; padding: 0.4rem 0.6rem; }
</style>
</head>
<body>
${navHtml(pages, currentHref)}
<main>${bodyHtml}</main>
</body>
</html>`;
}

function build() {
  if (!existsSync(DOCS_DIR)) {
    throw new Error(`docs source not found at ${DOCS_DIR}`);
  }
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const sources = collectMarkdown(DOCS_DIR).map((md) => {
    const source = readFileSync(md, "utf8");
    return { md, source, href: htmlPathFor(md), title: title(md, source) };
  });

  for (const { source, href, title: pageTitle } of sources) {
    const outFile = join(OUT_DIR, href);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(
      outFile,
      page(marked.parse(source), sources, href, pageTitle)
    );
  }

  // Landing page: link out to the architecture map if present, else first doc.
  const landing =
    sources.find((p) => p.href === "architecture.html") ?? sources[0];
  const index = `<h1>Documentation</h1><p>The canonical docs live in the repo's <code>docs/</code> directory.</p><ul>${sources
    .map((p) => `<li><a href="/${p.href}">${p.title}</a></li>`)
    .join("")}</ul>`;
  writeFileSync(
    join(OUT_DIR, "index.html"),
    page(index, sources, landing?.href ?? "index.html", "Documentation")
  );

  console.log(
    `Rendered ${sources.length} docs -> ${relative(process.cwd(), OUT_DIR)}`
  );
}

build();
