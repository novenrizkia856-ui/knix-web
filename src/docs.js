import './styles/base.css';
import './styles/docs.css';

import { marked } from 'marked';

/**
 * Knix docs. The pages are the GitBook source in /docs, bundled at build time,
 * so the site and GitBook always show the same text. SUMMARY.md drives the
 * navigation; routes are hashes (#/concepts/the-pool).
 */
const PAGES = import.meta.glob('../docs/**/*.md', { query: '?raw', import: 'default', eager: true });
const source = (path) => PAGES[`../docs/${path}`];

/** SUMMARY.md → [{ section, items: [{ title, path }] }] */
function readSummary() {
  const groups = [];
  let group = { section: '', items: [] };
  groups.push(group);
  for (const line of source('SUMMARY.md').split('\n')) {
    const link = line.match(/^\s*-\s*\[(.+?)\]\((.+?)\)/);
    const heading = line.match(/^-\s+([^[].*)$/);
    if (link) group.items.push({ title: link[1], path: link[2] });
    else if (heading) groups.push((group = { section: heading[1].trim(), items: [] }));
  }
  return groups.filter((g) => g.items.length);
}

const SUMMARY = readSummary();
const ORDER = SUMMARY.flatMap((g) => g.items.map((item) => ({ ...item, section: g.section })));
const HOME = 'README.md';

const routeOf = (path) => (path === HOME ? '#/' : `#/${path.replace(/\.md$/, '')}`);
const pathOf = (hash) => {
  const slug = decodeURIComponent(hash.replace(/^#\/?/, '')).replace(/\/$/, '');
  return slug ? `${slug}.md` : HOME;
};

/** Resolve a link inside a page relative to that page's folder. */
function resolve(from, href) {
  const parts = from.split('/').slice(0, -1);
  for (const seg of href.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

const toc = document.querySelector('[data-toc]');
const article = document.querySelector('[data-doc]');
const pager = document.querySelector('[data-pager]');
const sectionLabel = document.querySelector('[data-doc-section]');
const toggle = document.querySelector('[data-toc-toggle]');
const current = document.querySelector('[data-toc-current]');

toc.innerHTML = SUMMARY.map(
  (g) => `
  <div class="docs__group">
    ${g.section ? `<p class="docs__group-title">${g.section}</p>` : ''}
    ${g.items.map((item) => `<a href="${routeOf(item.path)}" data-path="${item.path}">${item.title}</a>`).join('')}
  </div>`,
).join('');

const setToc = (open) => {
  toggle.setAttribute('aria-expanded', String(open));
  toc.classList.toggle('is-open', open);
};
toggle.addEventListener('click', () => setToc(toggle.getAttribute('aria-expanded') !== 'true'));

function render(focus) {
  let path = pathOf(location.hash);
  if (!source(path)) path = HOME;
  const index = ORDER.findIndex((item) => item.path === path);
  const entry = ORDER[index];

  article.innerHTML = marked.parse(source(path));
  article.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (/^[a-z]+:/i.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener';
    } else if (/\.md(#.*)?$/.test(href)) {
      a.setAttribute('href', routeOf(resolve(path, href.replace(/#.*$/, ''))));
    }
  });
  article.querySelectorAll('table').forEach((table) => {
    const scroller = document.createElement('div');
    scroller.className = 'docs__table';
    table.replaceWith(scroller);
    scroller.append(table);
  });

  const title = article.querySelector('h1')?.textContent || entry?.title || 'Docs';
  document.title = path === HOME ? 'Knix Docs' : `${title} | Knix Docs`;
  sectionLabel.textContent = entry?.section || 'Docs';
  current.textContent = entry?.title || 'Contents';
  toc.querySelectorAll('a').forEach((a) => a.setAttribute('aria-current', a.dataset.path === path ? 'page' : 'false'));

  const prev = ORDER[index - 1];
  const next = ORDER[index + 1];
  pager.innerHTML = `
    ${prev ? `<a class="docs__page docs__page--prev" href="${routeOf(prev.path)}"><small>Previous</small>${prev.title}</a>` : '<span></span>'}
    ${next ? `<a class="docs__page docs__page--next" href="${routeOf(next.path)}"><small>Next</small>${next.title}</a>` : ''}`;

  setToc(false);
  if (focus) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    article.focus({ preventScroll: true });
  }
}

window.addEventListener('hashchange', () => render(true));
render(false);

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();
