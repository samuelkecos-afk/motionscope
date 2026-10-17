// Runs in the MAIN world. Scrolls the page in small steps and samples every
// visible element's opacity / transform / clip-path / filter. Anything that
// changes with scroll becomes a "track" with a scroll range, from/to values and
// a best-guess easing. This catches motion no API exposes (custom rAF loops,
// Framer Motion inline styles, bundled libraries...).

import { fitEasing } from './easing';
import { selectorFor } from './selector';
import { getScrollTrigger } from './motion';
import type { ScrollRecording, ScrollTrack } from './types';

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'BR', 'svg', 'path', 'g', 'defs']);
const MAX_CANDIDATES = 2500;

interface Sample {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  clip: string;
  filter: string;
  docTop: number;
}

const EPS: Record<string, number> = { opacity: 0.01, x: 0.5, y: 0.5, scale: 0.005, rotate: 0.2, docTop: 0.5 };

function parseTransform(t: string) {
  if (!t || t === 'none') return { x: 0, y: 0, scale: 1, rotate: 0 };
  const nums = t.slice(t.indexOf('(') + 1, -1).split(',').map(Number);
  if (t.startsWith('matrix3d')) {
    return { x: nums[12], y: nums[13], scale: Math.hypot(nums[0], nums[1]), rotate: (Math.atan2(nums[1], nums[0]) * 180) / Math.PI };
  }
  const [a, b, , , e, f] = nums;
  return { x: e, y: f, scale: Math.hypot(a, b), rotate: (Math.atan2(b, a) * 180) / Math.PI };
}

// rAF never fires in background tabs, so fall back to a timeout.
const frame = () => new Promise<void>((r) => { requestAnimationFrame(() => r()); setTimeout(r, 50); });
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function hasInfiniteAnimation(el: Element) {
  try {
    return el.getAnimations().some((a) => a.effect?.getTiming().iterations === Infinity);
  } catch {
    return false;
  }
}

function candidates(): Element[] {
  const out: Element[] = [];
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    if (out.length >= MAX_CANDIDATES) break;
    if (SKIP.has(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    out.push(el);
  }
  return out;
}

/** originTop: viewport y of the scroller's top edge (0 for the window). */
function sample(el: Element, scrollPos: number, originTop = 0): Sample {
  const cs = getComputedStyle(el);
  const t = parseTransform(cs.transform);
  return {
    opacity: Number(cs.opacity),
    ...t,
    clip: cs.clipPath,
    filter: cs.filter,
    docTop: el.getBoundingClientRect().top - originTop + scrollPos,
  };
}

interface Scroller {
  label: string; // "window" or a selector
  max: number;
  viewHeight: number;
  originTop: () => number;
  get: () => number;
  set: (y: number) => void;
}

/**
 * Finds what actually scrolls. Usually the window, but many sites (Lenis with a
 * wrapper, app shells, full-screen layouts) scroll an inner element instead.
 */
function findScroller(): Scroller | null {
  const doc = document.scrollingElement ?? document.documentElement;
  const docMax = doc.scrollHeight - window.innerHeight;
  if (docMax > 40) {
    return {
      label: 'window',
      max: docMax,
      viewHeight: window.innerHeight,
      originTop: () => 0,
      get: () => window.scrollY,
      set: (y) => {
        window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
        window.dispatchEvent(new Event('scroll'));
      },
    };
  }
  let best: HTMLElement | null = null;
  let bestArea = 0;
  for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
    if (el.scrollHeight - el.clientHeight < 40) continue;
    const oy = getComputedStyle(el).overflowY;
    if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') continue;
    const area = el.clientWidth * el.clientHeight;
    if (area > bestArea) {
      best = el;
      bestArea = area;
    }
  }
  if (!best || bestArea < window.innerWidth * window.innerHeight * 0.25) return null;
  const el = best;
  return {
    label: selectorFor(el),
    max: el.scrollHeight - el.clientHeight,
    viewHeight: el.clientHeight,
    originTop: () => el.getBoundingClientRect().top,
    get: () => el.scrollTop,
    set: (y) => {
      el.scrollTop = y;
      el.dispatchEvent(new Event('scroll'));
    },
  };
}

function isLocked() {
  return [document.documentElement, document.body].some((e) => e && getComputedStyle(e).overflowY === 'hidden');
}

const LOCKED_NOTE =
  'Scrolling was locked (overflow: hidden), usually by an intro, menu or cookie overlay. MotionScope scrolled the page anyway, so results may include that overlay. For cleaner results, close it and record again.';

/** Scroll-driven CSS animations (scroll()/view() timelines) are scroll-linked by definition. */
function hasScrollTimeline(el: Element) {
  try {
    return el.getAnimations().some((a) => a.timeline && !(a.timeline instanceof DocumentTimeline));
  } catch {
    return false;
  }
}

function lockedReason(): string {
  const locked = isLocked();
  return locked
    ? 'The page is not scrollable right now: scrolling is locked (overflow: hidden), usually by an intro, menu or cookie overlay. Close it, scroll a little by hand, then record again.'
    : 'The page is not scrollable: nothing on it is taller than the window. If it scrolls with a custom effect (canvas, WebGL or wheel-driven slides), MotionScope cannot record it yet.';
}

const NUMERIC = ['opacity', 'x', 'y', 'scale', 'rotate'] as const;

function differs(a: Sample, b: Sample) {
  return NUMERIC.some((p) => Math.abs(a[p] - b[p]) > EPS[p]) || a.clip !== b.clip || a.filter !== b.filter;
}

function label(viewportTopPx: number, vh: number) {
  return `top ${Math.round((viewportTopPx / vh) * 100)}%`;
}

function fmt(prop: string, s: Sample): string {
  switch (prop) {
    case 'opacity': return String(+s.opacity.toFixed(3));
    case 'x': return `${s.x.toFixed(1)}px`;
    case 'y': return `${s.y.toFixed(1)}px`;
    case 'scale': return String(+s.scale.toFixed(3));
    case 'rotate': return `${s.rotate.toFixed(1)}deg`;
    case 'clip': return s.clip;
    case 'filter': return s.filter;
    default: return '';
  }
}

export async function recordScroll(opts: { stepRatio?: number; settleMs?: number } = {}): Promise<ScrollRecording> {
  const stepRatio = opts.stepRatio ?? 0.15;
  const settleMs = opts.settleMs ?? 120;
  const scroller = findScroller();
  if (!scroller) {
    const h = (document.scrollingElement ?? document.documentElement).scrollHeight;
    return { pageHeight: h, viewportHeight: window.innerHeight, steps: 0, tracks: [], scroller: 'none', note: lockedReason() };
  }
  const vh = scroller.viewHeight;
  const maxScroll = scroller.max;
  const steps = Math.min(250, Math.max(1, Math.ceil(maxScroll / (vh * stepRatio))));
  const startY = scroller.get();

  const go = async (y: number) => {
    // set() also fires a scroll event: hidden or throttled tabs may not, and the
    // page's own listeners (parallax code, Lenis, ScrollTrigger) need it.
    scroller.set(y);
    getScrollTrigger()?.update?.();
    await frame();
    await frame();
    await wait(settleMs);
  };

  await go(0);
  const els = candidates().filter((el) => !hasInfiniteAnimation(el));
  const data: Sample[][] = els.map(() => []);
  const timeBased: boolean[][] = els.map(() => []); // [element][step]: still moving while scroll stood still
  const scrolls: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const y = Math.round((i / steps) * maxScroll);
    await go(y);
    const actual = scroller.get();
    const origin = scroller.originTop();
    scrolls.push(actual);
    const changed: number[] = [];
    els.forEach((el, k) => {
      const s = sample(el, actual, origin);
      if (i > 0 && differs(data[k][i - 1], s)) changed.push(k);
      data[k].push(s);
      timeBased[k].push(false);
    });
    // Re-sample whatever just changed without scrolling. If it is still moving,
    // a timer (CSS/WAAPI/GSAP tween) drives it, not the scroll position.
    if (changed.length) {
      await wait(Math.max(80, settleMs));
      for (const k of changed) {
        const again = sample(els[k], scroller.get(), scroller.originTop());
        if (differs(data[k][i], again)) {
          timeBased[k][i] = true;
          data[k][i] = again;
        }
      }
    }
  }
  await go(startY);

  const tracks: ScrollTrack[] = [];
  els.forEach((el, k) => {
    const s = data[k];
    const props: string[] = [];
    const changedAt = new Set<number>();
    for (const prop of ['opacity', 'x', 'y', 'scale', 'rotate', 'clip', 'filter'] as const) {
      let changed = false;
      for (let i = 1; i < s.length; i++) {
        const diff = typeof s[i][prop] === 'number' ? Math.abs((s[i][prop] as number) - (s[i - 1][prop] as number)) > EPS[prop] : s[i][prop] !== s[i - 1][prop];
        if (diff) {
          changed = true;
          changedAt.add(i);
        }
      }
      if (changed) props.push(prop);
    }

    // Pinned: element stays put in the viewport while the page scrolls.
    const cs = getComputedStyle(el);
    let pinned = false;
    if (!props.length && (cs.position === 'sticky' || cs.position === 'fixed' || el.parentElement?.classList.contains('pin-spacer'))) {
      for (let i = 1; i < s.length; i++) {
        if (Math.abs(s[i].docTop - s[i - 1].docTop) > EPS.docTop) {
          changedAt.add(i);
          pinned = true;
        }
      }
      if (pinned) props.push('position');
    }
    if (!props.length) return;
    // Ignore elements that "change" at nearly every step (continuous effects not tied to scroll).
    if (!pinned && changedAt.size > s.length * 0.95 && s.length > 10) return;

    const idxs = [...changedAt].sort((a, b) => a - b);
    const startIdx = Math.max(0, idxs[0] - 1);
    const endIdx = idxs[idxs.length - 1];
    const timed = timeBased[k].some(Boolean);
    // Timed motion already running when recording began is page-load or ambient
    // animation, not scroll motion; the Motion tab lists it instead.
    if (!pinned && timed && idxs[0] <= 1) return;
    const mode: ScrollTrack['mode'] = pinned ? 'pinned' : hasScrollTimeline(el) ? 'scrubbed' : timed || idxs.length <= 2 ? 'triggered' : 'scrubbed';

    // Easing fit on the numeric property that moved the most (relative to its tolerance).
    let easing = mode === 'triggered' ? '(time-based)' : 'linear';
    const numeric = props.filter((p) => p in EPS && p !== 'position');
    if (mode === 'scrubbed' && numeric.length && endIdx - startIdx >= 3) {
      const main = numeric.sort(
        (a, b) =>
          Math.abs((s[endIdx] as any)[b] - (s[startIdx] as any)[b]) / EPS[b] - Math.abs((s[endIdx] as any)[a] - (s[startIdx] as any)[a]) / EPS[a],
      )[0];
      const v0 = (s[startIdx] as any)[main] as number;
      const v1 = (s[endIdx] as any)[main] as number;
      const y0 = scrolls[startIdx];
      const y1 = scrolls[endIdx];
      if (v1 !== v0 && y1 !== y0) {
        const pts: [number, number][] = [];
        for (let i = startIdx; i <= endIdx; i++) pts.push([(scrolls[i] - y0) / (y1 - y0), ((s[i] as any)[main] - v0) / (v1 - v0)]);
        const fit = fitEasing(pts);
        easing = fit.error < 0.08 ? fit.gsap : 'custom';
      }
    }

    const from: Record<string, string> = {};
    const to: Record<string, string> = {};
    for (const p of props) {
      if (p === 'position') continue;
      from[p] = fmt(p, s[startIdx]);
      to[p] = fmt(p, s[endIdx]);
    }

    tracks.push({
      target: selectorFor(el),
      props,
      mode,
      startPx: scrolls[startIdx],
      endPx: scrolls[endIdx],
      startLabel: label(s[startIdx].docTop - scrolls[startIdx], vh),
      endLabel: label(s[endIdx].docTop - scrolls[endIdx], vh),
      from,
      to,
      easing,
      samples: s.slice(startIdx, endIdx + 1).map((v, j) => ({
        scroll: scrolls[startIdx + j],
        values: { opacity: v.opacity, x: v.x, y: v.y, scale: v.scale, rotate: v.rotate },
      })),
    });
  });

  return {
    pageHeight: maxScroll + vh,
    viewportHeight: vh,
    steps,
    tracks: tracks.sort((a, b) => a.startPx - b.startPx),
    scroller: scroller.label,
    note:
      scroller.label === 'window' && isLocked()
        ? LOCKED_NOTE
        : tracks.length
          ? undefined
          : 'The page scrolled but nothing moved with it. Its motion may be triggered by hover or clicks, or drawn on a canvas.',
  };
}
