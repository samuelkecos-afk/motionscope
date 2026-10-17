// Builds a short, reasonably unique CSS selector for an element so it can be
// shown in the UI and found again later (highlighting, exports).

const HASHY = /^(css|sc|jsx|svelte|emotion)-|[0-9a-f]{6,}|__[a-z0-9]{5,}$/i;

// CSS-module class names carry a build hash. Rather than dropping them (which
// leaves only bare tags), match their stable parts with attribute selectors.
//   Next.js / Turbopack: hero-module-scss-module__5KU1KW__title
//   webpack css-loader:  Hero_title__a1B2c   or   hero-module__title___3xYzq
const TURBOPACK = /^([a-z0-9-]+?)-module(?:-(?:s?css|sass|less))?-module__[\w-]{6}__([\w-]+)$/i;
const WEBPACK = /^([A-Za-z][A-Za-z0-9-]*?)(?:-module)?_{1,2}([A-Za-z][\w-]*?)_{2,3}[\w-]{5}$/;

function moduleClass(c: string): { sel: string; label: string } | null {
  let m = c.match(TURBOPACK);
  if (m) return { sel: `[class*="${m[1]}-module"][class*="__${m[2]}"]`, label: `${m[1]}__${m[2]}` };
  m = c.match(WEBPACK);
  if (m) return { sel: `[class*="${m[1]}_"][class*="${m[2]}__"]`, label: `${m[1]}__${m[2]}` };
  return null;
}

/** Readable name for a CSS-module class or keyframes name ("hero__title"), or the input unchanged. */
export function prettyName(name: string): string {
  return moduleClass(name)?.label ?? name;
}

function cleanClasses(el: Element): string[] {
  const out: string[] = [];
  for (const c of Array.from(el.classList)) {
    if (out.length >= 2) break;
    const mod = moduleClass(c);
    if (mod) out.push(mod.sel);
    else if (c.length < 40 && !HASHY.test(c) && /^[a-zA-Z_-][\w-]*$/.test(c)) out.push(`.${CSS.escape(c)}`);
  }
  return out;
}

function part(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) return `#${el.id}`;
  const classes = cleanClasses(el);
  let sel = tag + classes.join('');
  const parent = el.parentElement;
  if (parent) {
    const same = Array.from(parent.children).filter((c) => c.matches(sel));
    if (same.length > 1) sel += `:nth-of-type(${Array.from(parent.children).filter((c) => c.tagName === el.tagName).indexOf(el) + 1})`;
  }
  return sel;
}

// Cached per scan: building a selector runs querySelectorAll, which adds up on big pages.
let cache = new WeakMap<Element, string>();
export function resetSelectorCache() {
  cache = new WeakMap();
}

export function selectorFor(el: Element | null | undefined): string {
  if (!el || !(el instanceof Element)) return '(none)';
  const hit = cache.get(el);
  if (hit) return hit;
  const sel = buildSelector(el);
  cache.set(el, sel);
  return sel;
}

function buildSelector(el: Element): string {
  if (el === document.documentElement) return 'html';
  if (el === document.body) return 'body';
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.body && parts.length < 5) {
    const p = part(cur);
    parts.unshift(p);
    if (p.startsWith('#')) break;
    try {
      if (document.querySelectorAll(parts.join(' > ')).length === 1) break;
    } catch {
      /* invalid selector part, keep climbing */
    }
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}
