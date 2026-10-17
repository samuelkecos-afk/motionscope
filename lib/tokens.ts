import { oklabDistance, parseColor, toHex, type RGBA } from './color';
import { prettyName } from './selector';
import type { ColorToken, CountedValue, DesignTokens, TypeStyle } from './types';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'LINK', 'HEAD', 'TITLE', 'BR', 'WBR']);
const MAX_ELEMENTS = 4000;

class Counter {
  map = new Map<string, number>();
  add(v: string | null | undefined, n = 1) {
    if (!v) return;
    this.map.set(v, (this.map.get(v) ?? 0) + n);
  }
  top(limit = 30): CountedValue[] {
    return [...this.map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value, count]) => ({ value, count }));
  }
}

export interface StylesheetData {
  cssVariables: Map<string, string>;
  keyframes: { name: string; css: string; aliases?: string[] }[];
  breakpoints: Set<string>;
}

/** Walks CSS rules (recursing into @media/@supports/@layer) and collects variables, keyframes and breakpoints. */
export function walkRules(rules: CSSRuleList, out: StylesheetData) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSKeyframesRule) {
      // CSS modules repeat the same keyframes under hashed names; keep one copy
      // per distinct body and list the other names as aliases.
      const body = rule.cssText.slice(rule.cssText.indexOf('{'));
      const name = prettyName(rule.name);
      const same = out.keyframes.find((k) => k.css.slice(k.css.indexOf('{')) === body);
      if (same) {
        if (same.name !== name && !same.aliases?.includes(name) && (same.aliases?.length ?? 0) < 50) (same.aliases ??= []).push(name);
      } else if (!out.keyframes.some((k) => k.name === name)) out.keyframes.push({ name, css: `@keyframes ${rule.name} ${body}` });
    } else if (rule instanceof CSSStyleRule) {
      if (/(^|,)\s*(:root|html|:host)\b/.test(rule.selectorText)) {
        for (const prop of Array.from(rule.style)) {
          if (prop.startsWith('--')) out.cssVariables.set(prop, rule.style.getPropertyValue(prop).trim());
        }
      }
      if ('cssRules' in rule && (rule as CSSStyleRule).cssRules?.length) walkRules((rule as CSSStyleRule).cssRules, out);
    } else if (rule instanceof CSSMediaRule) {
      for (const m of rule.conditionText.matchAll(/(min|max)-width:\s*([\d.]+(px|em|rem))/g)) out.breakpoints.add(`${m[1]}-width: ${m[2]}`);
      walkRules(rule.cssRules, out);
    } else if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) {
      walkRules((rule as CSSGroupingRule).cssRules, out);
    }
  }
}

/**
 * Reads every stylesheet. Same-origin sheets are read directly; cross-origin
 * ones throw on .cssRules, so their text is fetched by the background worker
 * and parsed with a constructable stylesheet.
 */
export async function readStylesheets(fetchCss: (url: string) => Promise<string | null>): Promise<StylesheetData> {
  const out: StylesheetData = { cssVariables: new Map(), keyframes: [], breakpoints: new Set() };
  const blocked: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walkRules(sheet.cssRules, out);
    } catch {
      if (sheet.href) blocked.push(sheet.href);
    }
  }
  const texts = await Promise.all(blocked.map((u) => fetchCss(u).catch(() => null)));
  for (const text of texts) {
    if (!text) continue;
    try {
      const s = new CSSStyleSheet();
      s.replaceSync(text); // @import rules are ignored, which is fine here
      walkRules(s.cssRules, out);
    } catch {
      /* unparsable sheet */
    }
  }
  return out;
}

function isVisible(el: Element, cs: CSSStyleDeclaration) {
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function hasOwnText(el: Element) {
  for (const n of Array.from(el.childNodes)) if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) return true;
  return false;
}

function px(v: string): number | null {
  const m = v.match(/^(-?[\d.]+)px$/);
  return m ? Number(m[1]) : null;
}

function mergeColors(raw: Map<string, { rgba: RGBA; count: number; usage: Set<string> }>): ColorToken[] {
  const sorted = [...raw.values()].sort((a, b) => b.count - a.count);
  const clusters: { rgba: RGBA; count: number; usage: Set<string> }[] = [];
  for (const c of sorted) {
    const hit = clusters.find((k) => oklabDistance(k.rgba, c.rgba) < 0.02);
    if (hit) {
      hit.count += c.count;
      c.usage.forEach((u) => hit.usage.add(u));
    } else clusters.push({ rgba: c.rgba, count: c.count, usage: new Set(c.usage) });
  }
  return clusters.slice(0, 40).map((c) => ({ value: toHex(c.rgba), count: c.count, usage: [...c.usage] }));
}

function detectSpacingBase(spacing: Map<string, number>): number | undefined {
  const values = [...spacing.entries()].map(([v, n]) => [Number(v.replace('px', '')), n] as const).filter(([v]) => v > 0);
  const total = values.reduce((s, [, n]) => s + n, 0);
  if (!total) return undefined;
  for (const base of [8, 6, 5, 4]) {
    const fit = values.reduce((s, [v, n]) => s + (Math.abs(v / base - Math.round(v / base)) < 0.01 ? n : 0), 0);
    if (fit / total >= 0.75) return base;
  }
  return undefined;
}

export async function extractTokens(fetchCss: (url: string) => Promise<string | null>): Promise<{
  tokens: DesignTokens;
  keyframes: { name: string; css: string }[];
}> {
  const colors = new Map<string, { rgba: RGBA; count: number; usage: Set<string> }>();
  const fonts = new Counter();
  const sizes = new Counter();
  const spacing = new Counter();
  const radii = new Counter();
  const shadows = new Counter();
  const durations = new Counter();
  const easings = new Counter();
  const typeStyles = new Map<string, TypeStyle>();

  const addColor = (value: string, usage: string) => {
    const rgba = parseColor(value);
    if (!rgba || rgba.a === 0) return;
    const key = toHex(rgba);
    const entry = colors.get(key) ?? { rgba, count: 0, usage: new Set<string>() };
    entry.count++;
    entry.usage.add(usage);
    colors.set(key, entry);
  };

  const all = document.body ? Array.from(document.body.querySelectorAll('*')) : [];
  let scanned = 0;
  for (const el of [document.body, ...all]) {
    if (!el || scanned >= MAX_ELEMENTS || SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const cs = getComputedStyle(el);
    if (!isVisible(el, cs)) continue;
    scanned++;

    addColor(cs.backgroundColor, 'background');
    if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') addColor(cs.borderTopColor, 'border');

    if (hasOwnText(el)) {
      addColor(cs.color, 'text');
      const family = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      fonts.add(family);
      sizes.add(cs.fontSize);
      const key = [family, cs.fontSize, cs.fontWeight, cs.lineHeight, cs.letterSpacing].join('|');
      const style = typeStyles.get(key) ?? {
        fontFamily: family,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        count: 0,
        tags: [],
      };
      style.count++;
      const tag = el.tagName.toLowerCase();
      if (!style.tags.includes(tag) && style.tags.length < 6) style.tags.push(tag);
      typeStyles.set(key, style);
    }

    for (const prop of ['marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'rowGap', 'columnGap'] as const) {
      const v = px(cs[prop]);
      if (v && v > 0 && v <= 400) spacing.add(`${Math.round(v)}px`);
    }

    if (cs.borderTopLeftRadius !== '0px') radii.add(cs.borderRadius);
    if (cs.boxShadow && cs.boxShadow !== 'none') shadows.add(cs.boxShadow);

    for (const [dur, ease] of [
      [cs.transitionDuration, cs.transitionTimingFunction],
      [cs.animationDuration, cs.animationTimingFunction],
    ]) {
      const durs = dur.split(',').map((s) => s.trim());
      const eases = ease.split(/,(?![^(]*\))/).map((s) => s.trim());
      durs.forEach((d, i) => {
        if (d === '0s' || d === 'auto') return;
        durations.add(d);
        easings.add(eases[i] ?? eases[0]);
      });
    }
  }

  const sheets = await readStylesheets(fetchCss);
  // Fall back to computed values so variables defined in JS are included too.
  const rootStyle = getComputedStyle(document.documentElement);
  const cssVariables = [...sheets.cssVariables.keys()].map((name) => ({
    name,
    value: rootStyle.getPropertyValue(name).trim() || sheets.cssVariables.get(name) || '',
  }));

  const spacingTop = spacing.top(24).sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
  return {
    tokens: {
      colors: mergeColors(colors),
      fonts: fonts.top(10),
      fontSizes: sizes.top(20).sort((a, b) => parseFloat(b.value) - parseFloat(a.value)),
      typeStyles: [...typeStyles.values()].sort((a, b) => b.count - a.count).slice(0, 24),
      spacing: spacingTop,
      spacingBase: detectSpacingBase(spacing.map),
      radii: radii.top(12),
      shadows: shadows.top(10),
      durations: durations.top(12),
      easings: easings.top(12),
      cssVariables: cssVariables.slice(0, 400),
      breakpoints: [...sheets.breakpoints].sort((a, b) => parseFloat(a.split(': ')[1]) - parseFloat(b.split(': ')[1])),
      elementsScanned: scanned,
    },
    keyframes: sheets.keyframes,
  };
}
