// Runs in the page's MAIN world. Detects animations from CSS, the Web Animations
// API and GSAP, keeps snapshots of animations after they finish, and detects
// common motion libraries and split-text setups.

import { prettyName, resetSelectorCache, selectorFor } from './selector';
import type { LibraryHit, MotionItem, MotionKeyframe, ScrollRange, SplitTextHit, TimelineKind } from './types';

const MAX_ITEMS = 1500;
const items = new Map<string, MotionItem>();
const animIds = new WeakMap<object, string>();
let counter = 0;

function idFor(obj: object, prefix: string) {
  let id = animIds.get(obj);
  if (!id) {
    id = `${prefix}-${++counter}`;
    animIds.set(obj, id);
  }
  return id;
}

function store(item: MotionItem) {
  if (!items.has(item.id) && items.size >= MAX_ITEMS) return;
  items.set(item.id, item);
}

// While the user is not scanning, MotionScope runs in every tab, so the hooks
// below only keep references in small capped sets. All the expensive work
// (keyframes, selectors, serialisation) happens in collectMotions() on scan.
const MAX_REFS = 400;
const animRefs = new Set<Animation>();
const gsapRefs = new Set<object>();
const transitionRefs = new Map<Element, Set<string>>();

function remember<T>(set: Set<T>, value: T) {
  if (set.has(value)) return;
  if (set.size >= MAX_REFS) set.delete(set.values().next().value as T);
  set.add(value);
}

// ---------- Web Animations API (covers CSS animations + transitions too) ----------

function timelineKind(tl: AnimationTimeline | null): TimelineKind {
  const w = window as any;
  if (!tl) return 'unknown';
  if (w.ViewTimeline && tl instanceof w.ViewTimeline) return 'view';
  if (w.ScrollTimeline && tl instanceof w.ScrollTimeline) return 'scroll';
  if (tl instanceof DocumentTimeline) return 'document';
  return 'unknown';
}

function rangeText(r: any): string | undefined {
  if (!r || r === 'normal') return undefined;
  if (typeof r === 'string') return r;
  const off = r.offset ? `${r.offset.value ?? ''}${r.offset.unit === 'percent' ? '%' : (r.offset.unit ?? '')}` : '';
  return `${r.rangeName ?? ''} ${off}`.trim();
}

function plainKeyframes(effect: KeyframeEffect): MotionKeyframe[] {
  try {
    return effect.getKeyframes().map((k) => {
      const out: MotionKeyframe = { offset: (k.offset as number | null) ?? (k.computedOffset as number) ?? null };
      for (const [prop, val] of Object.entries(k)) {
        if (prop === 'offset' || prop === 'computedOffset' || prop === 'composite') continue;
        if (typeof val === 'string' || typeof val === 'number') out[prop] = val;
      }
      return out;
    });
  } catch {
    return [];
  }
}

function captureAnimation(anim: Animation) {
  const effect = anim.effect as KeyframeEffect | null;
  if (!effect) return;
  const id = idFor(anim, 'anim');
  const timing = effect.getTiming();
  const w = window as any;
  let engine: MotionItem['engine'] = 'waapi';
  let name = anim.id || 'element.animate()';
  if (w.CSSAnimation && anim instanceof w.CSSAnimation) {
    engine = 'css-animation';
    name = prettyName((anim as any).animationName);
  } else if (w.CSSTransition && anim instanceof w.CSSTransition) {
    engine = 'css-transition';
    name = (anim as any).transitionProperty;
  }
  const kind = timelineKind(anim.timeline);
  let scroll: ScrollRange | undefined;
  if (kind === 'scroll' || kind === 'view') {
    scroll = { start: rangeText((anim as any).rangeStart), end: rangeText((anim as any).rangeEnd), scrub: true };
    const subject = (anim.timeline as any)?.subject ?? (anim.timeline as any)?.source;
    if (subject) scroll.trigger = selectorFor(subject);
  }
  const target = effect.target;
  const pseudo = effect.pseudoElement ? effect.pseudoElement : '';
  const iterations = timing.iterations === Infinity ? 'infinite' : (timing.iterations ?? 1);
  const keyframes = plainKeyframes(effect);
  // Mask reveal: moves by a % of its own size inside a parent that clips overflow.
  let masked = false;
  if (target instanceof Element && target.parentElement && keyframes.some((k) => /translate[XY3d]*\([^)]*%/.test(String(k.transform ?? k.translate ?? '')))) {
    const ov = getComputedStyle(target.parentElement);
    masked = ov.overflow.includes('hidden') || ov.overflow.includes('clip');
  }
  // CSS animations keep animation-timing-function on each keyframe, not on the timing.
  let easing = timing.easing ?? 'linear';
  if (engine === 'css-animation' && easing === 'linear' && typeof keyframes[0]?.easing === 'string') easing = keyframes[0].easing;
  store({
    id,
    engine,
    name,
    target: selectorFor(target) + pseudo,
    targetCount: 1,
    duration: typeof timing.duration === 'number' ? timing.duration : 0,
    delay: timing.delay ?? 0,
    easing,
    iterations,
    direction: timing.direction,
    fill: timing.fill,
    keyframes,
    timeline: kind,
    scroll,
    masked: masked || undefined,
    finished: anim.playState === 'finished',
  });
}

function pollAnimations() {
  let live: Animation[] = [];
  try {
    live = document.getAnimations();
  } catch {
    /* getAnimations unsupported */
  }
  const all = new Set<Animation>([...animRefs, ...live]);
  let n = 0;
  for (const a of all) {
    if (++n > MAX_ITEMS) break;
    try {
      captureAnimation(a);
    } catch {
      /* skip odd animations */
    }
  }
  // Transitions that ran and finished before the scan: rebuild them from the
  // element's computed transition settings.
  const liveTransitions = new Set(
    live.filter((a) => (window as any).CSSTransition && a instanceof (window as any).CSSTransition)
      .map((a) => `${(a.effect as KeyframeEffect)?.target ? selectorFor((a.effect as KeyframeEffect).target) : ''}|${(a as any).transitionProperty}`),
  );
  for (const [el, props] of transitionRefs) {
    if (!el.isConnected) continue;
    const cs = getComputedStyle(el);
    const list = cs.transitionProperty.split(',').map((x) => x.trim());
    const durs = cs.transitionDuration.split(',').map((x) => x.trim());
    const delays = cs.transitionDelay.split(',').map((x) => x.trim());
    const eases = cs.transitionTimingFunction.split(/,(?![^(]*\))/).map((x) => x.trim());
    const target = selectorFor(el);
    for (const prop of props) {
      if (liveTransitions.has(`${target}|${prop}`)) continue;
      let i = list.indexOf(prop);
      if (i < 0) i = list.indexOf('all');
      if (i < 0) continue;
      const sec = (v: string | undefined) => (v ? parseFloat(v) * (v.endsWith('ms') ? 1 : 1000) : 0);
      store({
        id: `transition-${target}-${prop}`,
        engine: 'css-transition',
        name: prop,
        target,
        targetCount: 1,
        duration: sec(durs[i % durs.length]),
        delay: sec(delays[i % delays.length]),
        easing: eases[i % eases.length] ?? 'ease',
        iterations: 1,
        keyframes: [],
        timeline: 'document',
        finished: true,
      });
    }
  }
}

// ---------- GSAP ----------

const GSAP_SPECIAL = new Set([
  'duration', 'delay', 'ease', 'stagger', 'repeat', 'repeatDelay', 'yoyo', 'yoyoEase', 'scrollTrigger', 'id', 'overwrite',
  'immediateRender', 'startAt', 'runBackwards', 'keyframes', 'paused', 'callbackScope', 'data', 'inherit', 'lazy',
  'reversed', 'defaults', 'smoothChildTiming', 'autoRemoveChildren', 'onComplete', 'onStart', 'onUpdate', 'onRepeat',
  'onReverseComplete', 'onInterrupt', 'onCompleteParams', 'onStartParams', 'onUpdateParams', 'parent', 'force3D',
]);

function gsapValue(v: unknown): string | number | null {
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'function') return '(function)';
  if (v && typeof v === 'object') return '(object)';
  return null;
}

function gsapProps(vars: Record<string, unknown> | undefined): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  if (!vars) return out;
  for (const [k, v] of Object.entries(vars)) {
    if (GSAP_SPECIAL.has(k) || k.startsWith('on') || k.startsWith('_')) continue;
    out[k] = gsapValue(v);
  }
  return out;
}

function easeName(e: unknown): string {
  if (typeof e === 'string') return e;
  if (typeof e === 'function') return (e as any).name || 'custom';
  return 'power1.out'; // GSAP default
}

function staggerMs(s: unknown): number | undefined {
  if (typeof s === 'number') return s * 1000;
  if (s && typeof s === 'object') {
    const o = s as { each?: number; amount?: number };
    if (typeof o.each === 'number') return o.each * 1000;
    if (typeof o.amount === 'number') return o.amount * 1000; // total spread, not per-target
  }
  return undefined;
}

function scrollTriggerInfo(st: any): ScrollRange | undefined {
  if (!st) return undefined;
  const v = st.vars ?? {};
  const asText = (x: unknown) => (typeof x === 'string' ? x : typeof x === 'number' ? `${x}px` : typeof x === 'function' ? '(function)' : undefined);
  const trig = typeof v.trigger === 'string' ? v.trigger : st.trigger ? selectorFor(st.trigger) : undefined;
  return {
    start: asText(v.start) ?? 'top bottom',
    end: asText(v.end) ?? 'bottom top',
    startPx: typeof st.start === 'number' ? Math.round(st.start) : undefined,
    endPx: typeof st.end === 'number' ? Math.round(st.end) : undefined,
    scrub: v.scrub ?? false,
    pin: !!v.pin,
    trigger: trig,
  };
}

export function getGsap(): any {
  return (window as any).gsap;
}

export function getScrollTrigger(): any {
  const w = window as any;
  return w.ScrollTrigger ?? w.gsap?.core?.globals?.()?.ScrollTrigger;
}

function pollGsap() {
  const gsap = getGsap();
  if (!gsap?.globalTimeline?.getChildren) return;
  let current: any[] = [];
  try {
    current = gsap.globalTimeline.getChildren(true, true, true);
  } catch {
    return;
  }
  const children = [...new Set<any>([...gsapRefs, ...current])].slice(0, MAX_ITEMS);
  for (const c of children) {
    const isTimeline = typeof c.getChildren === 'function';
    const id = idFor(c, 'gsap');
    const vars = c.vars ?? {};
    const parentId = c.parent && c.parent !== gsap.globalTimeline ? idFor(c.parent, 'gsap') : undefined;
    const st = scrollTriggerInfo(c.scrollTrigger);
    if (isTimeline) {
      store({
        id,
        engine: 'gsap',
        name: vars.id ?? 'timeline',
        target: '(timeline)',
        targetCount: 0,
        duration: Math.round((c.totalDuration?.() ?? 0) * 1000),
        delay: Math.round((c.delay?.() ?? 0) * 1000),
        easing: '-',
        iterations: vars.repeat === -1 ? 'infinite' : (vars.repeat ?? 0) + 1,
        keyframes: [],
        timeline: st ? 'scroll' : 'document',
        scroll: st,
        parent: parentId,
        finished: c.progress?.() === 1,
      });
      continue;
    }
    let targets: any[] = [];
    try {
      targets = c.targets?.() ?? [];
    } catch {
      /* ignore */
    }
    const domTargets = targets.filter((t) => t instanceof Element);
    // Skip GSAP's internal helpers (delayedCall, ScrollTrigger scrub tweens on plain objects).
    if (!domTargets.length && !(c.duration?.() > 0 && targets.length && !targets.some((t) => typeof t === 'function' || t?.vars))) continue;
    const to = gsapProps(vars);
    let from: Record<string, string | number | null> = {};
    let toFrame: Record<string, string | number | null> = to;
    if (vars.startAt) from = gsapProps(vars.startAt);
    else if (vars.runBackwards) {
      // gsap.from(): the vars are the starting values, the end is the element's natural state.
      from = to;
      toFrame = Object.fromEntries(Object.keys(to).map((k) => [k, '(current)']));
    } else from = Object.fromEntries(Object.keys(to).map((k) => [k, '(current)']));
    store({
      id,
      engine: 'gsap',
      name: vars.id ?? (vars.runBackwards ? 'gsap.from' : vars.startAt ? 'gsap.fromTo' : 'gsap.to'),
      target: domTargets.length ? selectorFor(domTargets[0]) : targets.length ? '(object)' : '(none)',
      targetCount: targets.length,
      duration: Math.round((c.duration?.() ?? 0) * 1000),
      delay: Math.round((c.delay?.() ?? 0) * 1000),
      easing: easeName(vars.ease),
      iterations: vars.repeat === -1 ? 'infinite' : (vars.repeat ?? 0) + 1,
      direction: vars.yoyo ? 'alternate' : undefined,
      stagger: staggerMs(vars.stagger),
      keyframes: [
        { offset: 0, ...from },
        { offset: 1, ...toFrame },
      ],
      timeline: st ? 'scroll' : 'document',
      scroll: st,
      parent: parentId,
      finished: c.progress?.() === 1,
    });
  }

  // ScrollTriggers that only fire callbacks / toggle classes (no animation attached).
  const ST = getScrollTrigger();
  try {
    for (const st of ST?.getAll?.() ?? []) {
      if (st.animation) continue;
      store({
        id: idFor(st, 'st'),
        engine: 'gsap',
        name: st.vars?.toggleClass ? `ScrollTrigger toggleClass(${JSON.stringify(st.vars.toggleClass)})` : 'ScrollTrigger (callbacks)',
        target: st.trigger ? selectorFor(st.trigger) : '(none)',
        targetCount: st.trigger ? 1 : 0,
        duration: 0,
        delay: 0,
        easing: '-',
        iterations: 1,
        keyframes: [],
        timeline: 'scroll',
        scroll: scrollTriggerInfo(st),
      });
    }
  } catch {
    /* ignore */
  }
}

// ---------- Hooks ----------

let installed = false;

/**
 * Call as early as possible (document_start) so short-lived animations are not
 * missed. Must stay cheap: it runs in every tab, all the time.
 */
export function installMotionHooks() {
  if (installed) return;
  installed = true;

  // element.animate(): keep a reference only.
  const original = Element.prototype.animate;
  Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
    const anim = original.apply(this, args);
    try {
      remember(animRefs, anim);
    } catch {
      /* never break the page */
    }
    return anim;
  } as Element['animate'];

  // CSS animations fire animationstart once per run, so this stays cheap even
  // for infinite animations.
  document.addEventListener(
    'animationstart',
    (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      for (const a of t.getAnimations()) if ((a as any).animationName === (e as AnimationEvent).animationName) remember(animRefs, a);
    },
    true,
  );

  // Transitions can fire hundreds of times a second (hover effects), so only
  // note which element/property ran; timings are read from CSS on scan.
  document.addEventListener(
    'transitionrun',
    (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      let props = transitionRefs.get(t);
      if (!props) {
        if (transitionRefs.size >= MAX_REFS) transitionRefs.delete(transitionRefs.keys().next().value as Element);
        props = new Set();
        transitionRefs.set(t, props);
      }
      if (props.size < 8) props.add((e as TransitionEvent).propertyName);
    },
    true,
  );

  // GSAP removes finished tweens from its timeline. During page load (when
  // intro animations run), keep references to them for 15 seconds, then stop.
  let ticks = 0;
  const timer = setInterval(() => {
    if (++ticks > 30) return clearInterval(timer);
    const gsap = getGsap();
    if (!gsap?.globalTimeline?.getChildren) return;
    try {
      for (const c of gsap.globalTimeline.getChildren(true, true, true).slice(0, 200)) remember(gsapRefs, c);
    } catch {
      /* ignore */
    }
  }, 500);
}

export function collectMotions(): MotionItem[] {
  resetSelectorCache();
  pollAnimations();
  pollGsap();
  // Mark items that are no longer live as finished.
  const live = new Set<string>();
  for (const a of document.getAnimations()) {
    const id = animIds.get(a);
    if (id && a.playState !== 'finished') live.add(id);
  }
  for (const item of items.values()) {
    if (item.engine !== 'gsap' && !live.has(item.id)) item.finished = true;
  }
  return [...items.values()];
}

// ---------- Library detection ----------

export function detectLibraries(): LibraryHit[] {
  const w = window as any;
  const hits: LibraryHit[] = [];
  const add = (name: string, evidence: string, version?: string) => hits.push({ name, evidence, version });
  const has = (sel: string) => {
    try {
      return !!document.querySelector(sel);
    } catch {
      return false;
    }
  };
  const html = document.documentElement;

  if (w.gsap) add('GSAP', 'window.gsap', w.gsap.version);
  else if (Array.from(document.querySelectorAll('[style*="translate"]')).slice(0, 500).some((el) => '_gsap' in el)) add('GSAP (bundled)', 'element._gsap cache');
  const ST = getScrollTrigger();
  if (ST) add('ScrollTrigger', `${ST.getAll?.().length ?? 0} triggers`, ST.version);
  const plugins = w.gsap?.core?.globals?.() ?? {};
  for (const p of ['SplitText', 'ScrollSmoother', 'Flip', 'Draggable', 'MotionPathPlugin', 'DrawSVGPlugin', 'MorphSVGPlugin', 'Observer']) {
    // ScrollTrigger ships Observer internally, so only count it when used on its own.
    if (p === 'Observer' && ST) continue;
    if (plugins[p] || w[p]) add(`GSAP ${p}`, 'registered plugin');
  }
  if (w.lenisVersion || html.classList.contains('lenis') || w.lenis) add('Lenis', 'html.lenis / window.lenisVersion', w.lenisVersion);
  if (html.classList.contains('has-scroll-smooth') || has('[data-scroll-container]')) add('Locomotive Scroll', '[data-scroll-container]');
  if (html.dataset.wfPage || w.Webflow) add('Webflow Interactions', 'html[data-wf-page]');
  if (has('[data-framer-name], [data-framer-component-type]')) add('Framer', '[data-framer-name]');
  if (w.Motion) add('Motion (motion.dev)', 'window.Motion');
  if (w.anime) add('anime.js', 'window.anime', w.anime.version);
  if (w.lottie || w.bodymovin) add('Lottie', 'window.lottie', (w.lottie ?? w.bodymovin)?.version);
  if (has('lottie-player, dotlottie-player, dotlottie-wc')) add('Lottie (web component)', '<lottie-player>');
  if (w.AOS || has('[data-aos]')) add('AOS', '[data-aos]');
  if (w.ScrollReveal) add('ScrollReveal', 'window.ScrollReveal');
  if (w.barba) add('Barba.js', 'window.barba', w.barba.version);
  if (w.Swiper || has('.swiper-initialized')) add('Swiper', '.swiper-initialized');
  if (w.__THREE__) add('Three.js', 'window.__THREE__', String(w.__THREE__));
  if (has('spline-viewer')) add('Spline', '<spline-viewer>');
  if (w.rive) add('Rive', 'window.rive');
  if (w.Splitting || has('[data-splitting]')) add('Splitting.js', '[data-splitting]');
  if (has('canvas')) add('Canvas', `${document.querySelectorAll('canvas').length} <canvas> element(s)`);
  try {
    if (document.getAnimations().some((a) => timelineKind(a.timeline) !== 'document')) add('CSS scroll-driven animations', 'animation-timeline: scroll()/view()');
  } catch {
    /* ignore */
  }
  return hits;
}

// ---------- Split text ----------

export function detectSplitText(): SplitTextHit[] {
  const hits: SplitTextHit[] = [];
  const reported = new Set<Element>();
  const candidates = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a');
  for (const el of Array.from(candidates)) {
    if (hits.length >= 40) break;
    if ([...reported].some((r) => r.contains(el))) continue;
    const kids = Array.from(el.children).filter((c) => c.tagName === 'SPAN' || c.tagName === 'DIV');
    if (kids.length < 4 || kids.length !== el.children.length) continue;
    const texts = kids.map((k) => k.textContent ?? '');
    const total = texts.join('').trim();
    if (total.length < 4) continue;
    const cls = kids.map((k) => k.className).join(' ');
    let unit: SplitTextHit['unit'] | null = null;
    if (/line/i.test(cls)) unit = 'line';
    else if (texts.every((t) => t.trim().length <= 1)) unit = 'char';
    else if (
      texts.every((t) => !/\s/.test(t.trim())) &&
      (/word/i.test(cls) || kids.every((k) => getComputedStyle(k).display === 'inline-block'))
    )
      unit = 'word';
    if (!unit) continue;
    // Words that are themselves split into characters.
    if (unit === 'word' && kids[0].children.length > 1 && Array.from(kids[0].children).every((c) => (c.textContent ?? '').length <= 1)) unit = 'char';
    reported.add(el);
    hits.push({ target: selectorFor(el), unit, pieces: unit === 'char' ? total.replace(/\s/g, '').length : kids.length, sample: total.slice(0, 60) });
  }
  return hits;
}
