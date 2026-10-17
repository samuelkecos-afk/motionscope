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

function sample(el: Element, scrollY: number): Sample {
  const cs = getComputedStyle(el);
  const t = parseTransform(cs.transform);
  return {
    opacity: Number(cs.opacity),
    ...t,
    clip: cs.clipPath,
    filter: cs.filter,
    docTop: el.getBoundingClientRect().top + scrollY,
  };
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
  const scroller = document.scrollingElement ?? document.documentElement;
  const vh = window.innerHeight;
  const maxScroll = Math.max(0, scroller.scrollHeight - vh);
  const steps = Math.min(250, Math.max(1, Math.ceil(maxScroll / (vh * stepRatio))));
  const startY = window.scrollY;

  const go = async (y: number) => {
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    // Hidden or throttled tabs may not fire scroll events between steps; nudge
    // the page's own scroll listeners (parallax code, Lenis, ScrollTrigger).
    window.dispatchEvent(new Event('scroll'));
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
    const actual = window.scrollY;
    scrolls.push(actual);
    const changed: number[] = [];
    els.forEach((el, k) => {
      const s = sample(el, actual);
      if (i > 0 && differs(data[k][i - 1], s)) changed.push(k);
      data[k].push(s);
      timeBased[k].push(false);
    });
    // Re-sample whatever just changed without scrolling. If it is still moving,
    // a timer (CSS/WAAPI/GSAP tween) drives it, not the scroll position.
    if (changed.length) {
      await wait(Math.max(80, settleMs));
      for (const k of changed) {
        const again = sample(els[k], window.scrollY);
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
    const mode: ScrollTrack['mode'] = pinned ? 'pinned' : timed || idxs.length <= 2 ? 'triggered' : 'scrubbed';

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

  return { pageHeight: scroller.scrollHeight, viewportHeight: vh, steps, tracks: tracks.sort((a, b) => a.startPx - b.startPx) };
}
