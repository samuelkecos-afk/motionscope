// Turns scan results into things people can paste: DTCG tokens, CSS variables,
// a Tailwind v4 @theme block, CSS @keyframes and GSAP code.

import type { DesignTokens, MotionItem, ScrollTrack } from './types';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

function named<T>(list: T[], prefix: string) {
  return list.map((v, i) => [`${prefix}-${i + 1}`, v] as const);
}

// Font sizes arrive sorted largest first; name them from the top of the scale down.
function sizeName(i: number, _total: number) {
  const names = ['5xl', '4xl', '3xl', '2xl', 'xl', 'lg', 'md', 'base', 'sm', 'xs', '2xs'];
  return names[i] ?? `size-${i + 1}`;
}

export function toDTCG(t: DesignTokens) {
  const color: Record<string, unknown> = {};
  named(t.colors, 'color').forEach(([k, c]) => (color[k] = { $type: 'color', $value: c.value, $description: `${c.usage.join(', ')} · used ${c.count}×` }));
  const fontSize: Record<string, unknown> = {};
  t.fontSizes.forEach((s, i) => (fontSize[sizeName(i, t.fontSizes.length)] = { $type: 'dimension', $value: s.value }));
  const fontFamily: Record<string, unknown> = {};
  t.fonts.forEach((f) => (fontFamily[slug(f.value)] = { $type: 'fontFamily', $value: f.value }));
  const spacing: Record<string, unknown> = {};
  t.spacing.forEach((s) => (spacing[s.value.replace('px', '')] = { $type: 'dimension', $value: s.value }));
  const radius: Record<string, unknown> = {};
  named(t.radii, 'radius').forEach(([k, r]) => (radius[k] = { $type: 'dimension', $value: r.value }));
  const shadow: Record<string, unknown> = {};
  named(t.shadows, 'shadow').forEach(([k, s]) => (shadow[k] = { $type: 'shadow', $value: s.value }));
  const duration: Record<string, unknown> = {};
  named(t.durations, 'duration').forEach(([k, d]) => (duration[k] = { $type: 'duration', $value: d.value }));
  const easing: Record<string, unknown> = {};
  named(t.easings, 'ease').forEach(([k, e]) => (easing[k] = { $type: 'cubicBezier', $value: e.value }));
  const typography: Record<string, unknown> = {};
  named(t.typeStyles.slice(0, 12), 'text').forEach(([k, s]) => {
    typography[k] = {
      $type: 'typography',
      $description: `used on ${s.tags.join(', ')} (${s.count}×)`,
      $value: { fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing },
    };
  });
  return { color, fontFamily, fontSize, spacing, radius, shadow, duration, easing, typography };
}

export function toCssVariables(t: DesignTokens) {
  const lines: string[] = [':root {'];
  named(t.colors, '--color').forEach(([k, c]) => lines.push(`  ${k}: ${c.value};`));
  t.fonts.forEach((f) => lines.push(`  --font-${slug(f.value)}: "${f.value}";`));
  t.fontSizes.forEach((s, i) => lines.push(`  --text-${sizeName(i, t.fontSizes.length)}: ${s.value};`));
  t.spacing.forEach((s) => lines.push(`  --space-${s.value.replace('px', '')}: ${s.value};`));
  named(t.radii, '--radius').forEach(([k, r]) => lines.push(`  ${k}: ${r.value};`));
  named(t.shadows, '--shadow').forEach(([k, s]) => lines.push(`  ${k}: ${s.value};`));
  named(t.durations, '--duration').forEach(([k, d]) => lines.push(`  ${k}: ${d.value};`));
  named(t.easings, '--ease').forEach(([k, e]) => lines.push(`  ${k}: ${e.value};`));
  lines.push('}');
  return lines.join('\n');
}

/** Tailwind CSS v4 theme block. */
export function toTailwindTheme(t: DesignTokens) {
  const lines: string[] = ['@theme {'];
  named(t.colors, '--color-brand').forEach(([k, c]) => lines.push(`  ${k}: ${c.value};`));
  t.fonts.forEach((f) => lines.push(`  --font-${slug(f.value)}: "${f.value}", sans-serif;`));
  t.fontSizes.forEach((s, i) => lines.push(`  --text-${sizeName(i, t.fontSizes.length)}: ${s.value};`));
  if (t.spacingBase) lines.push(`  --spacing: ${t.spacingBase / 4 === 1 ? '0.25rem' : `${t.spacingBase / 16}rem`}; /* detected ${t.spacingBase}px base */`);
  named(t.radii, '--radius').forEach(([k, r]) => lines.push(`  ${k}: ${r.value};`));
  named(t.shadows, '--shadow').forEach(([k, s]) => lines.push(`  ${k}: ${s.value};`));
  named(t.easings, '--ease').forEach(([k, e]) => lines.push(`  ${k}: ${e.value};`));
  lines.push('}');
  return lines.join('\n');
}

// ---------- Motion ----------

const camelToKebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function motionToCss(m: MotionItem): string {
  const name = slug(m.name === 'element.animate()' ? `anim-${m.id}` : m.name);
  const frames = m.keyframes
    .map((k, i, all) => {
      const pct = k.offset ?? (all.length > 1 ? i / (all.length - 1) : 0);
      const decls = Object.entries(k)
        .filter(([p, v]) => p !== 'offset' && p !== 'easing' && v != null && v !== '(current)')
        .map(([p, v]) => `${camelToKebab(p)}: ${v};`)
        .join(' ');
      return `  ${Math.round(pct * 100)}% { ${decls} }`;
    })
    .join('\n');
  const iter = m.iterations === 'infinite' ? 'infinite' : m.iterations;
  const lines = [`@keyframes ${name} {`, frames, '}', '', `${m.target} {`];
  lines.push(`  animation: ${name} ${m.duration}ms ${m.easing} ${m.delay}ms ${iter}${m.direction && m.direction !== 'normal' ? ` ${m.direction}` : ''}${m.fill && m.fill !== 'none' && m.fill !== 'auto' ? ` ${m.fill}` : ''};`);
  if (m.timeline === 'view' || m.timeline === 'scroll') {
    lines.push(`  animation-timeline: ${m.timeline}();`);
    if (m.scroll?.start || m.scroll?.end) lines.push(`  animation-range: ${m.scroll?.start ?? 'normal'} ${m.scroll?.end ?? 'normal'};`);
  }
  lines.push('}');
  return lines.join('\n');
}

const GSAP_TRANSFORM: Record<string, string> = { x: 'x', y: 'y', scale: 'scale', rotate: 'rotation', opacity: 'opacity', clip: 'clipPath', filter: 'filter' };

function jsValue(v: string | number | null | undefined) {
  if (typeof v === 'number') return String(v);
  if (v == null) return 'null';
  const n = Number(v);
  if (v !== '' && !Number.isNaN(n)) return String(n);
  return JSON.stringify(v);
}

export function motionToGsap(m: MotionItem): string {
  const first = m.keyframes[0] ?? {};
  const last = m.keyframes[m.keyframes.length - 1] ?? {};
  const props = (k: Record<string, unknown>) =>
    Object.entries(k)
      .filter(([p, v]) => p !== 'offset' && p !== 'easing' && v !== '(current)' && v != null)
      .map(([p, v]) => `${p}: ${jsValue(v as string | number)}`);
  const from = props(first);
  const to = props(last);
  to.push(`duration: ${+(m.duration / 1000).toFixed(3)}`);
  if (m.delay) to.push(`delay: ${+(m.delay / 1000).toFixed(3)}`);
  if (m.easing && m.easing !== '-') to.push(`ease: ${JSON.stringify(m.easing)}`);
  if (m.stagger) to.push(`stagger: ${+(m.stagger / 1000).toFixed(3)}`);
  if (m.iterations === 'infinite') to.push('repeat: -1');
  else if (typeof m.iterations === 'number' && m.iterations > 1) to.push(`repeat: ${m.iterations - 1}`);
  if (m.direction === 'alternate') to.push('yoyo: true');
  if (m.scroll && m.engine === 'gsap') {
    const st = [`trigger: ${JSON.stringify(m.scroll.trigger ?? m.target)}`, `start: ${JSON.stringify(m.scroll.start)}`, `end: ${JSON.stringify(m.scroll.end)}`];
    if (m.scroll.scrub) st.push(`scrub: ${m.scroll.scrub === true ? 'true' : m.scroll.scrub}`);
    if (m.scroll.pin) st.push('pin: true');
    to.push(`scrollTrigger: { ${st.join(', ')} }`);
  }
  const sel = JSON.stringify(m.target);
  if (from.length && to.length) return `gsap.fromTo(${sel},\n  { ${from.join(', ')} },\n  { ${to.join(', ')} }\n);`;
  return `gsap.to(${sel}, { ${to.join(', ')} });`;
}

export function trackToGsap(t: ScrollTrack): string {
  const from = Object.entries(t.from).map(([p, v]) => `${GSAP_TRANSFORM[p] ?? p}: ${jsValue(v.replace(/px$|deg$/, ''))}`);
  const to = Object.entries(t.to).map(([p, v]) => `${GSAP_TRANSFORM[p] ?? p}: ${jsValue(v.replace(/px$|deg$/, ''))}`);
  const sel = JSON.stringify(t.target);
  if (t.mode === 'pinned') {
    return `ScrollTrigger.create({\n  trigger: ${sel},\n  start: "top top",\n  end: "+=${Math.round(t.endPx - t.startPx)}",\n  pin: true,\n});`;
  }
  const st =
    t.mode === 'scrubbed'
      ? `scrollTrigger: { trigger: ${sel}, start: ${JSON.stringify(t.startLabel)}, end: ${JSON.stringify(t.endLabel)}, scrub: true }`
      : `scrollTrigger: { trigger: ${sel}, start: ${JSON.stringify(t.startLabel)}, toggleActions: "play none none none" }`;
  const ease = t.mode === 'scrubbed' ? `ease: ${JSON.stringify(t.easing === 'custom' ? 'none' : t.easing)}` : 'duration: 0.8, ease: "power2.out" /* timing not measurable from scroll alone */';
  return `gsap.fromTo(${sel},\n  { ${from.join(', ')} },\n  { ${to.join(', ')}, ${ease},\n    ${st} }\n);`;
}
