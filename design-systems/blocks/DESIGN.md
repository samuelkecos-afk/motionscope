# Blocks: design rules

An editorial colour-block system. Its type scale, spacing, layout and motion were measured from **warmnfuzzy.tv**'s live stylesheets with MotionScope (October 2026). Use it as a starting point for your own brand, and change the colours, font and wordmark so the result is yours, not a copy of theirs.

These rules are written so a person or an AI builder can follow them exactly. When building with this system, follow every **Must**.

---

## 1. The page is a stack of colour blocks

- **Must:** The page background is black (`--black`). Every section is a **full-width block** in one colour, set with `data-theme`: `black`, `white`, `yellow`, `orange` or `blue`.
- **Must:** Neighbouring blocks are separated by a 1px hairline (`--line`, 10% white on dark blocks, 10% black on light ones). There are no gaps, cards or shadows between blocks.
- Text colour follows the block: white on black, orange and blue; black on white and yellow.
- Recommended order for a landing page:

| # | Block | Theme | Content |
|---|---|---|---|
| 1 | Hero | black | Giant CAPS headline, a CAPS one-liner and buttons under a hairline |
| 2 | Intro | **yellow** | Split: label left, lede paragraph right, closing link |
| 3 | Work / products | black | Label, display heading + link, grid of cards |
| 4 | Ticker | black | Display CAPS marquee |
| 5 | Statement + list | **orange** | Big statement, then split with a name list ("how it works", services) |
| 6 | Tiles | **blue** | Four outlined tiles (one circle) with label + count |
| 7 | Rows | black | Split: pricing or specs as name / value rows |
| 8 | FAQ | **white** | Split: accordion of questions |
| 9 | Footer | **blue** | Contact row, title + sign-up, giant wordmark, link labels |

Avoid two neighbouring blocks in the same colour, except black.

## 2. Every section: small CAPS label left, big type right

- **Must:** Each block opens with a **small CAPS label** (`.t-label`) at the top-left, 16px from the block's top edge (`.section-top`).
- **Must:** In a **split** (`.split`), the label holds the left column and the big content takes the right column:
  - Phone: one column; the label stacks on top with 50px under it.
  - Tablet (≥768px): label column = 5 of 16 columns.
  - Desktop (≥1280px): label column = 8 of 24 columns.
- When a big headline follows a label in the same column, leave the large gap between them (`.headline`, 75 → 120 → 170px).
- A section's closing link is an **underlined CAPS label** with a long gap above it (`.closing-link`, 70 → 100 → 160px).
- Labels read like captions: short, plain sentences ending with a full stop are typical ("Taught by people who still do the work.").

## 3. Space under every section

- **Must:** Every block ends with **70px (phone) → 120px (tablet) → 180px (desktop)** of space (`--space`), scaling smoothly in between. Do not shrink this to fit more content; the space is part of the look.
- The outer page margin is 16px at every size (`--gutter`). Column gaps are 10px on phones and 16px from tablet up.
- Grid: 8 columns on phones, 16 on tablets (≥768px), 24 on desktops (≥1280px).

## 4. Typography

**One family, heavy, tight.** The original uses Suisse Int'l (a commercial font). This system uses **Geist** from Google Fonts as a free stand-in.

- **Must:** Use weight **600** (semi-bold) for everything except body copy, which uses **500**. The original font is visually heavy; a regular 400 weight looks wrong.
- **Must:** Letter spacing is **−0.027em** everywhere, and **−0.045em** for the hero and display sizes. Small labels use 0 on phones and −0.027em from 1280px up.
- **Must:** Only the seven roles below exist. Never set a font size by hand.

| Role | Class | Phone → tablet → desktop | Line height | Case | Used for |
|---|---|---|---|---|---|
| Hero | `.t-hero` | 64 → 164 → 320px | 0.98 / 0.91 / 0.85 | CAPS | Hero headline (1–3 short words per line), footer wordmark |
| Display | `.t-display` | 48 → 48 → 132px | 0.91 | CAPS | Section names ("COURSES"), ticker, words in tiles |
| Title | `.t-title` | 32 → 64 → 96px | 1.0 | Sentence | Statements, closing titles |
| Name | `.t-name` | 24 → 24 → 46px | 1.15 / 1.04 | Sentence (CAPS for the hero one-liner) | Service lists, steps, FAQ questions, prices |
| Lede | `.t-lede` | 21 → 21 → 32px | 1.11 | Sentence | The one intro paragraph (yellow block), max ~30 characters per line |
| Body | `.t-body` | 14 → 14 → 16px | 1.22 | Sentence | Details, descriptions, answers (at 60–70% opacity) |
| Label | `.t-label` | 12 → 12 → 16px | 1.0 | **CAPS** | Section labels, nav, buttons, links, dates, counts. Same font: **never monospace** |

**The fluid formula.** Sizes are not fixed. Each role has a base size per breakpoint, and the real size is:

```
size = max( base × 0.8 + 100vw × base ÷ W × 0.2 ,  base )
```

`W` is the window width the scale is anchored to: 375 (phone), 768 (tablet), 1280 (desktop), 1600 (large). The size equals `base` at `W` and grows at 20% of the window's rate beyond it. For example, a 96px title is 98.4px at 1440px wide. `tokens.css` implements this; use the `--fs-*` variables.

- Headings use `text-box: trim-both cap alphabetic`, so their boxes hug the capital letters and spacing is measured from the letters, not the line box.
- Links are underlined with a 3px offset and lose the underline on hover.
- Secondary text (dates, counts, descriptions) is the same colour at 60% opacity (`.tint`), never a different grey.

## 5. Footer

- **Must:** The footer is a **blue** block with, in order:
  1. A contact row: email on the left, "Back to top" on the right, as CAPS labels above a hairline.
  2. A big title (`.t-title`) and the sign-up form.
  3. A **giant wordmark**: the brand name in hero type, CAPS, sized to the window width (12.4vw), on one line.
  4. A bottom row of **underlined CAPS link labels** (social links) and the copyright, above a hairline.

## 6. Components

| Component | Classes | Notes |
|---|---|---|
| Header | `.site-header .bar .logo .tagline .nav` | Black, sticky, CAPS labels, hairline under it. Tagline hides under 1024px; only `.nav-keep` links stay on phones |
| Rolling label | `.roll` with two spans | On hover the label slides up and a copy slides in from below |
| Button | `.btn`, `.btn--yellow`, `.btn--black` | CAPS label on a solid fill, no rounded corners, 12×16px padding |
| Cards | `.cards .card .card-media .card-meta` | 2 columns on phones, 3 from tablet. CAPS title left, date right at 60% opacity. Media zooms 4% on hover |
| Name list | `.list` | Big names stacked tight (12px apart), optional body line under each |
| Tiles | `.tiles .tile .tile--circle .tile-meta` | Outlined squares (one circle) with a display word; label left and "(count)" right underneath |
| Rows | `.rows .row .value` | Name left, value right (name size), body under |
| Accordion | `.accordion` | Questions at name size, "+" rotates to "×" |
| Ticker | `.ticker .ticker-track` | Display CAPS, orange dot separators, pauses on hover |
| Film grain | `.grain` | Faint animated noise over the whole page (4.5% opacity) |

## 7. Motion

All motion uses one easing, **`cubic-bezier(0.26, 1, 0.48, 1)`** (fast start, long soft stop), for **0.5s**. Opacity changes are **75ms linear**.

- **Page load, at 0.75s:**
  - The header bar slides down from above (`.intro-drop`).
  - The hero lines rise through a mask, 60ms apart (`.mask`).
  - The buttons scale from 0 to 1 (`.intro-pop`).
- **Hover:** labels roll (`.roll`) and card images zoom 4%.
- **Scroll, native CSS** (`data-scroll`):
  - `persist` on the hero: it sinks 25% of the window height as it leaves.
  - `reveal` on colour blocks: they rise 25% as they enter.
  - `shift`: a 5% drift while on screen.
- **Smooth scrolling:** Lenis (`lerp 0.1`).
- **Film grain:** 1s loop, `steps(2)`, 11 positions.
- **Must:** Everything stops for `prefers-reduced-motion: reduce`.

## 8. Do and don't

- **Do** use real words in the hero, short enough for 1–3 words per line at 320px.
- **Do** keep one lede paragraph per page.
- **Don't** add rounded corners (except circles), shadows or gradients.
- **Don't** use more than one font, or a monospace font for labels.
- **Don't** centre text. Everything aligns to the left edge or the left/right columns.
- **Don't** tighten the section spacing.

## 9. Make it yours

Change these in `tokens.css`, and the whole system follows:

1. `--blue`, `--yellow`, `--orange`: your three brand colours. Keep one dark (white text) and one light (black text).
2. `--font`: your typeface. Pick a heavy grotesk, and adjust `--weight` if needed.
3. The wordmark text in the footer, and the logo mark colour (`.logo-mark`).
