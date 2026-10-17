// Cubic-bezier evaluation and a simple "which named easing fits these samples best" search.

export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // Fall back to bisection if Newton wandered off.
    if (t < 0 || t > 1 || Math.abs(sx(t) - x) > 1e-3) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 30; i++) {
        t = (lo + hi) / 2;
        if (sx(t) < x) lo = t; else hi = t;
      }
    }
    return sy(t);
  };
}

// Named easings, with CSS and GSAP spellings where they match.
export const EASINGS: { css: string; gsap: string; fn: (x: number) => number }[] = [
  { css: 'linear', gsap: 'none', fn: (x) => x },
  { css: 'ease', gsap: 'power1.inOut', fn: cubicBezier(0.25, 0.1, 0.25, 1) },
  { css: 'ease-in', gsap: 'power1.in', fn: cubicBezier(0.42, 0, 1, 1) },
  { css: 'ease-out', gsap: 'power1.out', fn: cubicBezier(0, 0, 0.58, 1) },
  { css: 'ease-in-out', gsap: 'power1.inOut', fn: cubicBezier(0.42, 0, 0.58, 1) },
  { css: 'cubic-bezier(0.215, 0.61, 0.355, 1)', gsap: 'power2.out', fn: cubicBezier(0.215, 0.61, 0.355, 1) },
  { css: 'cubic-bezier(0.165, 0.84, 0.44, 1)', gsap: 'power3.out', fn: cubicBezier(0.165, 0.84, 0.44, 1) },
  { css: 'cubic-bezier(0.19, 1, 0.22, 1)', gsap: 'expo.out', fn: cubicBezier(0.19, 1, 0.22, 1) },
  { css: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)', gsap: 'power2.in', fn: cubicBezier(0.55, 0.055, 0.675, 0.19) },
  { css: 'cubic-bezier(0.645, 0.045, 0.355, 1)', gsap: 'power2.inOut', fn: cubicBezier(0.645, 0.045, 0.355, 1) },
];

/** points: [x, y] with both normalised to 0..1. Returns the best-fitting named easing. */
export function fitEasing(points: [number, number][]): { css: string; gsap: string; error: number } {
  let best = { css: 'linear', gsap: 'none', error: Infinity };
  for (const e of EASINGS) {
    const err = Math.sqrt(points.reduce((s, [x, y]) => s + (e.fn(x) - y) ** 2, 0) / Math.max(points.length, 1));
    if (err < best.error) best = { css: e.css, gsap: e.gsap, error: err };
  }
  return best;
}
