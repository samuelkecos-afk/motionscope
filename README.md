# MotionScope

A Chrome extension that reads a website's **animations, scroll motion and design system** and exports them as code.

Open the side panel on any page and:

- **Scan page**: finds every CSS animation, CSS transition, Web Animations API call, GSAP tween/timeline and ScrollTrigger, native CSS scroll-driven animations (`scroll()` / `view()`), motion libraries in use, split-text setups, and the design tokens (colors, type styles, spacing scale, radii, shadows, motion durations/easings, CSS variables, breakpoints).
- **Record scroll**: scrolls the page top to bottom and samples every element. Anything that fades, moves, scales, rotates, clips or pins becomes a track with its scroll range, from/to values and a best-fit easing. It also catches motion no API exposes, such as hand-written scroll listeners or bundled libraries.
- **Export**: DTCG tokens, CSS variables, a Tailwind v4 `@theme` block, the site's `@keyframes`, GSAP + ScrollTrigger code, or the full scan as JSON.

## Getting started

```bash
npm install
npm run dev      # opens Chrome with the extension loaded and hot reload
npm run build    # production build in .output/chrome-mv3
npm run zip      # zipped build for the Chrome Web Store
npm test         # end-to-end + performance tests (needs Chromium; set CHROMIUM_PATH if it's not found)
npm run test:perf  # only the idle-CPU check: the extension must add <2% CPU per tab on a busy page
```

To load a build manually: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick `.output/chrome-mv3`. Click the toolbar icon to open the side panel.

> Pages that were already open when the extension was installed are injected on first scan, but animations that finished before that point are missed. Reload the page for a full capture.

## How it works

```
Side panel (React)                 entrypoints/sidepanel/
   │  chrome.tabs.sendMessage
   ▼
Content script, isolated world     entrypoints/content.ts    → design tokens (lib/tokens.ts)
   │  window.postMessage bridge
   ▼
Page script, MAIN world            entrypoints/page.content.ts
   ├─ lib/motion.ts                hooks + detection (runs from document_start)
   └─ lib/scroll-recorder.ts       scroll sampling
Background service worker          entrypoints/background.ts → fetches cross-origin CSS
```

| Layer | Where | What it reads |
|---|---|---|
| Stylesheets | `lib/tokens.ts` | `@keyframes`, `:root` variables, `@media` breakpoints. Cross-origin sheets are fetched by the background worker and parsed with a constructable `CSSStyleSheet`. |
| Computed styles | `lib/tokens.ts` | Colors (merged in OKLab), type styles, spacing (with base-unit detection), radii, shadows, transition/animation timing. |
| Web Animations | `lib/motion.ts` | `document.getAnimations()`: CSS animations, transitions and `element.animate()`, including keyframes, timing, and scroll/view timelines with their ranges. `Element.prototype.animate` is wrapped and `animationstart`/`transitionrun` are listened to, so short animations are captured before they finish and disappear. While idle these hooks only keep references in small capped sets; all the analysis happens when you press Scan. |
| GSAP | `lib/motion.ts` | `gsap.globalTimeline.getChildren()`: tweens, timelines, from/to values, ease, stagger, repeat/yoyo, and each tween's ScrollTrigger (`start`/`end`, resolved pixels, `scrub`, `pin`, trigger). Callback-only ScrollTriggers are listed too. |
| Libraries | `lib/motion.ts` | GSAP plugins, Lenis, Locomotive, Webflow IX, Framer, Motion, anime.js, Lottie, AOS, Barba, Swiper, Three.js, Spline, Rive, Splitting.js, native scroll-driven CSS. |
| Scroll recorder | `lib/scroll-recorder.ts` | Steps through the page (15% of the viewport per step), samples opacity/transform/clip-path/filter/position. Anything that changes while scrolling stands still is classed as time-based: if it was already running at the start it's ignored (page-load or ambient motion), otherwise it's a *triggered* animation. Scroll-linked changes are *scrubbed*. Sticky/fixed elements that track the viewport are *pinned*. |

## Performance rule

The page script runs in every open tab, so it must stay nearly free while you are not using MotionScope. `test/perf.mjs` opens 4 tabs of a busy page (`test/fixture/stress.html`: 600 elements, 400 infinite animations, 300 transitions per second) and fails if the extension adds more than 2% of a CPU core per tab. Current result: about 0.1%.

## Known limitations / next steps

- **Easing fit** comes from scroll samples, so it's only as precise as the step size. Lower `stepRatio` for more accuracy.
- **Smoothed scrub** (`scrub: 1`, Lenis lerp) keeps moving after the scroll stops, so it may be classed as *triggered*.
- **Triggered animations**: the recorder sees where they start and what they animate, but not their exact duration. The Motion tab usually has that from the engine itself.
- Not scanned yet: iframes, shadow DOM, canvas/WebGL content (Three.js, Spline and Rive are only detected).
- The page ↔ extension bridge uses `window.postMessage`, which the page can see. That's fine for a dev tool, but use a secret channel ID before publishing.
- Planned: a DevTools-Protocol "deep scan" (`chrome.debugger` Animation domain), Motion/Framer code export, an After-Effects-style timeline view, and an AI step that names motions ("per-word fade-up, 60ms stagger").
