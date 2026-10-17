// Builds a plain-language Markdown brief of a scan: the design system and every
// animation, written so a designer, a developer or an AI builder (Claude,
// Cursor, Lovable, v0...) can understand and rebuild it without the extension.

import type { ColorToken, FullScan, MotionItem, ScrollRecording, ScrollTrack } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const ms = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(2)}s` : `${Math.round(n)}ms`);

function table(head: string[], rows: unknown[][]): string {
  if (!rows.length) return '_None found._\n';
  return [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n') + '\n';
}

// ---------- Colors ----------

/** How much actual color a shade carries (0 = grey/white/black, 1 = pure hue). Unlike HSL
 * saturation, pale tints like #eeeeff score low. */
function saturation(hex: string) {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  if (ch.some((v) => Number.isNaN(v))) return 0;
  return Math.max(...ch) - Math.min(...ch);
}

/** Best-guess role for each color: the most used text color, background, and the boldest accent. */
export function colorRoles(colors: ColorToken[]): Map<string, string> {
  const roles = new Map<string, string>();
  const text = colors.find((c) => c.usage.includes('text'));
  const bg = colors.find((c) => c.usage.includes('background'));
  if (bg) roles.set(bg.value, 'Background');
  if (text && !roles.has(text.value)) roles.set(text.value, 'Text');
  const accent = colors.filter((c) => !roles.has(c.value) && c.count >= 2).sort((a, b) => saturation(b.value) - saturation(a.value))[0];
  if (accent && saturation(accent.value) > 0.3) roles.set(accent.value, 'Accent / brand');
  else {
    const rare = colors.filter((c) => !roles.has(c.value)).sort((a, b) => saturation(b.value) - saturation(a.value))[0];
    if (rare && saturation(rare.value) > 0.3) roles.set(rare.value, 'Accent / brand');
  }
  for (const c of colors) {
    if (roles.has(c.value)) continue;
    if (c.usage.includes('border') && c.usage.length === 1) roles.set(c.value, 'Border');
    else if (c.usage.includes('background')) roles.set(c.value, 'Surface');
    else if (c.usage.includes('text')) roles.set(c.value, 'Secondary text');
  }
  return roles;
}

// ---------- Plain-language motion ----------

const round = (n: number) => +n.toFixed(2);

/** Pulls x / y / scale / rotate out of a CSS transform string like "translateY(24px) scale(0.9)". */
function parseTransform(v: unknown): Record<string, number> | null {
  if (typeof v !== 'string') return null;
  if (v === 'none') return {};
  const out: Record<string, number> = {};
  const re = /(translate3d|translateX|translateY|translate|scale|rotate)\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  let any = false;
  while ((m = re.exec(v))) {
    any = true;
    const args = m[2].split(',').map((a) => parseFloat(a));
    if (m[1] === 'translateX') out.x = args[0];
    else if (m[1] === 'translateY') out.y = args[0];
    else if (m[1] === 'translate' || m[1] === 'translate3d') { out.x = args[0] || 0; out.y = args[1] || 0; }
    else if (m[1] === 'scale') out.scale = args[0];
    else if (m[1] === 'rotate') out.rotate = args[0];
  }
  return any ? out : null;
}

/** Expands CSS "transform" (and individual translate/scale/rotate) into x/y/scale/rotate keys. */
function normalise(frame: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(frame)) {
    if (k === 'transform') {
      const t = parseTransform(v);
      if (t) Object.assign(out, Object.keys(t).length ? t : { x: 0, y: 0 });
      else out[k] = v;
    } else if (k === 'translate' && typeof v === 'string') {
      const [x, y] = v.split(/\s+/).map((a) => parseFloat(a));
      out.x = x || 0;
      out.y = y || 0;
    } else out[k] = v;
  }
  return out;
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** "fades in, moves up 40px" from a from/to pair of property maps. */
export function describeChange(rawFrom: Record<string, unknown>, rawTo: Record<string, unknown>): string {
  const from = normalise(rawFrom);
  const to = normalise(rawTo);
  const parts: string[] = [];
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
  for (const k of keys) {
    if (k === 'offset' || k === 'easing' || k === 'composite') continue;
    const a = from[k], b = to[k];
    const natural = (v: unknown) => v === '(current)' || v === undefined;
    const na = num(a) == null ? null : round(num(a)!), nb = num(b) == null ? null : round(num(b)!);
    if (na != null && nb != null && na === nb) continue;
    switch (k) {
      case 'opacity':
        if (natural(b) && na === 0) parts.push('fades in');
        else if (natural(a) && nb === 0) parts.push('fades out');
        else if (na === 0 && nb === 1) parts.push('fades in');
        else if (na === 1 && nb === 0) parts.push('fades out');
        else if (na != null && nb != null) parts.push(`opacity ${na} → ${nb}`);
        break;
      case 'y':
      case 'translateY': {
        const d = natural(b) && na != null ? -na : na != null && nb != null ? nb - na : nb;
        if (d) parts.push(`moves ${d < 0 ? 'up' : 'down'} ${Math.abs(Math.round(d))}px`);
        break;
      }
      case 'x':
      case 'translateX': {
        const d = natural(b) && na != null ? -na : na != null && nb != null ? nb - na : nb;
        if (d) parts.push(`moves ${d < 0 ? 'left' : 'right'} ${Math.abs(Math.round(d))}px`);
        break;
      }
      case 'scale':
        parts.push(natural(b) ? `scales from ${na ?? a} to normal size` : `scales ${natural(a) ? '' : `from ${na ?? a} `}to ${nb ?? b}`);
        break;
      case 'rotate':
      case 'rotation':
        parts.push(`rotates ${natural(a) ? '' : `from ${na ?? a}° `}to ${natural(b) ? 'its resting angle' : `${nb ?? b}°`}`);
        break;
      default:
        parts.push(`${k}: ${natural(a) ? 'current' : a} → ${natural(b) ? 'current' : b}`);
    }
  }
  return parts.join(', ') || 'changes';
}

function motionTrigger(m: MotionItem): string {
  if (m.timeline === 'view') return `scroll-linked while the element crosses the viewport (${m.scroll?.start ?? 'entry'} → ${m.scroll?.end ?? 'exit'})`;
  if (m.timeline === 'scroll' && m.engine !== 'gsap') return 'scroll-linked to page scroll';
  if (m.scroll) {
    const where = `${m.scroll.trigger ?? m.target} hits "${m.scroll.start}"`;
    if (m.scroll.scrub) return `scrubbed with scroll from ${where} to "${m.scroll.end}"${m.scroll.pin ? ', pinned' : ''}`;
    return `plays when ${where}${m.scroll.pin ? ', pinned' : ''}`;
  }
  if (m.engine === 'css-transition') return 'on state change (hover, focus or class change)';
  if (m.iterations === 'infinite') return 'loops continuously';
  return 'on page load or when triggered by script';
}

export function describeMotion(m: MotionItem): string {
  const first = m.keyframes[0] ?? {};
  const last = m.keyframes[m.keyframes.length - 1] ?? {};
  let what = m.engine === 'css-transition' && m.keyframes.length < 2 ? `transitions ${m.name}` : m.name;
  if (m.keyframes.length >= 2) {
    what = describeChange(first, last);
    // Start and end are the same (e.g. a float loop): describe the middle and "and back".
    if (what === 'changes' && m.keyframes.length > 2) what = `${describeChange(first, m.keyframes[Math.floor(m.keyframes.length / 2)])} and back`;
  }
  const scrubbed = !!m.scroll?.scrub || ((m.timeline === 'scroll' || m.timeline === 'view') && m.engine !== 'gsap');
  if (m.duration && !scrubbed) what += ` over ${ms(m.duration)}`;
  const bits = [what];
  if (m.easing && m.easing !== '-' && m.easing !== 'linear') bits.push(`easing ${m.easing}`);
  if (m.delay) bits.push(`after ${ms(m.delay)} delay`);
  if (m.stagger && m.targetCount > 1) bits.push(`staggered ${ms(m.stagger)} across ${m.targetCount} elements`);
  if (m.iterations === 'infinite') bits.push('repeating forever');
  else if (typeof m.iterations === 'number' && m.iterations > 1) bits.push(`${m.iterations} times`);
  if (m.direction === 'alternate') bits.push('back and forth');
  return bits.join(', ');
}

export function describeTrack(t: ScrollTrack): string {
  if (t.mode === 'pinned') return `stays pinned in the viewport for ${Math.round(t.endPx - t.startPx)}px of scrolling`;
  const nums = (r: Record<string, string>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, num(v) ?? v]));
  const change = describeChange(nums(t.from), nums(t.to));
  return t.mode === 'scrubbed'
    ? `${change}, tied to scroll position (easing ${t.easing})`
    : `${change}, plays once when it scrolls into view`;
}

// ---------- The brief ----------

export function buildBrief(data: FullScan, recording?: ScrollRecording): string {
  const t = data.tokens;
  const roles = colorRoles(t.colors);
  const motions = data.motions.filter((m) => m.target !== '(timeline)' && m.target !== '(none)');
  const timelines = data.motions.length - motions.length;
  const scrollMotions = motions.filter((m) => m.scroll || m.timeline === 'scroll' || m.timeline === 'view');
  const timeMotions = motions.filter((m) => !scrollMotions.includes(m));
  const L: string[] = [];

  L.push(`# Design & motion spec: ${data.title || data.url}`, '');
  L.push(`- **Source:** ${data.url}`);
  L.push(`- **Captured:** ${new Date(data.scannedAt).toUTCString()} with MotionScope`);
  L.push(`- **Libraries detected:** ${data.libraries.map((l) => l.name + (l.version ? ` ${l.version}` : '')).join(', ') || 'none (plain CSS / JavaScript)'}`);
  L.push(`- **Found:** ${t.colors.length} colors, ${t.typeStyles.length} type styles, ${motions.length} animations${recording ? `, ${recording.tracks.length} scroll-driven elements` : ''}`);
  L.push('');
  L.push('## How to use this file', '');
  L.push('This is a description of how the page above looks and moves, measured from the live site. Give it to a designer, a developer or an AI builder together with the other files in this folder.');
  L.push('');
  L.push('- `tokens/`: the design system as DTCG JSON, CSS variables and a Tailwind v4 theme.');
  L.push('- `motion/`: every animation as data (`motion.json`), CSS (`animations.css`, `site-keyframes.css`) and GSAP code (`gsap-animations.js`).');
  L.push('- `raw/scan.json`: everything MotionScope captured.');
  L.push('');
  L.push('**Prompt for an AI builder:** _"Build the page using the design tokens in `tokens/tokens.css` and recreate the motion described in this spec. Use GSAP + ScrollTrigger for scroll motion (see `motion/gsap-animations.js`). Match durations, easings, staggers and scroll start/end points exactly. Respect `prefers-reduced-motion`."_');
  L.push('');
  if (!recording) L.push('> Scroll motion was not recorded for this export. Press **Record scroll** in MotionScope before exporting to include it.', '');

  // Design system
  L.push('## Design system', '');
  L.push('### Colors', '');
  L.push(table(['Color', 'Likely role', 'Used for', 'Uses'], t.colors.map((c) => [`\`${c.value}\``, roles.get(c.value) ?? '', c.usage.join(', '), c.count])));
  L.push('### Typography', '');
  L.push(`Font families: ${t.fonts.map((f) => `**${f.value}**`).join(', ') || 'n/a'}`, '');
  L.push(table(['Font', 'Size', 'Line height', 'Weight', 'Letter spacing', 'Used on', 'Uses'], t.typeStyles.slice(0, 16).map((s) => [s.fontFamily, s.fontSize, s.lineHeight, s.fontWeight, s.letterSpacing, s.tags.join(', '), s.count])));
  L.push('### Spacing', '');
  L.push(t.spacingBase ? `Built on a **${t.spacingBase}px grid**. Most used values:` : 'Most used values:', '');
  L.push(t.spacing.map((s) => `\`${s.value}\``).join(' · ') || '_None found._', '');
  L.push('### Corners, shadows and breakpoints', '');
  L.push(`- **Radii:** ${t.radii.map((r) => `\`${r.value}\``).join(', ') || 'none'}`);
  L.push(`- **Shadows:** ${t.shadows.map((s) => `\`${s.value}\``).join('; ') || 'none'}`);
  L.push(`- **Breakpoints:** ${t.breakpoints.join(', ') || 'none found'}`);
  L.push('');
  L.push('### Motion tokens', '');
  L.push(`- **Durations:** ${t.durations.map((d) => `\`${d.value}\` (${d.count}×)`).join(', ') || 'none'}`);
  L.push(`- **Easings:** ${t.easings.map((d) => `\`${d.value}\` (${d.count}×)`).join(', ') || 'none'}`);
  L.push('');

  // Motion
  L.push('## Motion', '');
  L.push('### Scroll animations', '');
  const scrollRows: unknown[][] = scrollMotions.map((m) => [`\`${m.target}\`${m.targetCount > 1 ? ` (+${m.targetCount - 1})` : ''}`, describeMotion(m), motionTrigger(m), engineName(m)]);
  if (recording) {
    // Skip recorded tracks the engines already explain (same element, or a sibling of a staggered tween).
    const base = (sel: string) => sel.replace(/:nth-of-type\(\d+\)/g, '');
    const known = new Set(scrollMotions.flatMap((m) => [m.target, m.targetCount > 1 ? base(m.target) : '']).filter(Boolean));
    const isKnown = (sel: string) => known.has(sel) || known.has(base(sel));
    for (const tr of recording.tracks) {
      if (isKnown(tr.target)) continue;
      scrollRows.push([`\`${tr.target}\``, describeTrack(tr), tr.mode === 'pinned' ? `pinned from ${tr.startPx}px to ${tr.endPx}px of scroll` : `starts when element top is at ${tr.startLabel.replace('top ', '')} of the viewport, ends at ${tr.endLabel.replace('top ', '')}`, 'measured by scrolling']);
    }
  }
  L.push(table(['Element', 'What happens', 'When', 'Source'], scrollRows));
  L.push('### Other animations', '');
  L.push(table(['Element', 'What happens', 'When', 'Source'], timeMotions.slice(0, 150).map((m) => [`\`${m.target}\`${m.targetCount > 1 ? ` (+${m.targetCount - 1})` : ''}`, describeMotion(m), motionTrigger(m), engineName(m)])));
  if (timeMotions.length > 150) L.push(`_…and ${timeMotions.length - 150} more in \`motion/motion.json\`._`, '');
  if (timelines) L.push(`_${timelines} GSAP timeline(s) group the tweens above; see \`motion/motion.json\` for nesting._`, '');
  if (data.splitText.length) {
    L.push('### Text effects', '');
    L.push(table(['Element', 'Split into', 'Pieces', 'Text'], data.splitText.map((s) => [`\`${s.target}\``, `${s.unit}s`, s.pieces, s.sample])));
    L.push('Split text is usually animated with a stagger (see the matching rows above). Libraries such as GSAP SplitText or Splitting.js create these pieces.', '');
  }
  L.push('## Notes on accuracy', '');
  L.push('- Values come from the live page at capture time, on one screen size. Responsive variants may differ.');
  L.push('- Scroll easings are estimated from samples taken while scrolling; durations of "plays once" scroll animations are listed in the animation tables when the engine exposes them.');
  L.push('- Selectors are generated to find elements on the original page; rename them to fit your own markup.');
  return L.join('\n');
}

function engineName(m: MotionItem) {
  return { 'css-animation': 'CSS animation', 'css-transition': 'CSS transition', waapi: 'Web Animations API', gsap: 'GSAP' }[m.engine];
}
