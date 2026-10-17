// Builds a short, reasonably unique CSS selector for an element so it can be
// shown in the UI and found again later (highlighting, exports).

const HASHY = /^(css|sc|jsx|svelte|emotion)-|[0-9a-f]{6,}|__[a-z0-9]{5,}$/i;

function cleanClasses(el: Element): string[] {
  return Array.from(el.classList)
    .filter((c) => c.length < 40 && !HASHY.test(c) && /^[a-zA-Z_-][\w-]*$/.test(c))
    .slice(0, 2);
}

function part(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) return `#${el.id}`;
  const classes = cleanClasses(el);
  let sel = tag + classes.map((c) => `.${CSS.escape(c)}`).join('');
  const parent = el.parentElement;
  if (parent) {
    const same = Array.from(parent.children).filter((c) => c.matches(sel));
    if (same.length > 1) sel += `:nth-of-type(${Array.from(parent.children).filter((c) => c.tagName === el.tagName).indexOf(el) + 1})`;
  }
  return sel;
}

export function selectorFor(el: Element | null | undefined): string {
  if (!el || !(el instanceof Element)) return '(none)';
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
