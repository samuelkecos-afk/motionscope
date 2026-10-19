# Encore: design rules

A remix of **Headliner** in which the **layout also follows Live Nation**.

| Part | Taken from | What that means here |
|---|---|---|
| **Layout** | livenation.com.au | Black page, content centred in a **1256px container**, sticky header with nav + pill search + sign in, **hero carousel** (next slide peeks in, dimmed), **4-up and 3-up card grids**, **video + playlist**, **3-column list rows**, full-width **photo banner**, centred **statement**, **5-column footer** on `#121212` |
| **Colour and font** | livenation.com.au | Black, charcoal `#202020`, white `#f9f9f9`, **red `#e21836`** for actions, yellow badges. **Noto Sans** 700 / 400, italic 900 wordmark |
| **Text sizes, hierarchy, spacing, scroll** | warmnfuzzy.tv | The fluid type scale, CAPS label above each big heading, 70 → 180px between sections, scroll reveals, Lenis smooth scroll, page-load sequence, rolling hover labels |
| **Cards** | nextstopcomedy.com | 16:9 image with a pill badge, 3px border, 16px corners, glow; on hover the card lifts and grows, the image zooms and the title turns red |

Follow every **Must**.

---

## 1. Page structure (Live Nation)

- **Must:** All content sits in the centred `.container` (max **1256px**, sides **16px** on phones, **24px** from 600px). Only the hero carousel, the photo banner and the footer band run full width.
- **Must:** Everything after the hero goes inside `.page-body` (a solid black layer), so the hero slides underneath it when you scroll.
- **Must:** Each section starts with a **section head**: a small CAPS label (`.t-label .tint`) above a **big title** (`.t-title`), with an optional "See all" link on the right (`.section-row`).
- Section order:

| # | Section | Component | Columns (phone → desktop) |
|---|---|---|---|
| 1 | Header | Red italic wordmark, CAPS nav, pill search, sign in | Nav and search hide under 1100px |
| 2 | Hero | `.carousel`: image + info panel (label, name, red button) | Stacked → 63% image / 37% panel, next slide peeks in at 12% |
| 3 | Featured | `.grid-4` of cards: badge, date, title, chevron | **2 → 4** |
| 4 | Catalogue | `.grid-3` of cards: date, time, title, place, button | 1 → 2 (≥600) → 3 (≥900) |
| 5 | Watch | `.watch`: 16:9 video + playlist (active clip outlined red) | Stacked, playlist scrolls sideways → video + vertical list |
| 6 | List | `.rows`: 128px thumb, name, chevron | 1 → 3 |
| 7 | Dates | `.rows` with `.row-text`: name, red CAPS date, detail | 1 → 3 |
| 8 | Banner | `.banner`: full-width photo with parallax, 50% veil, centred title, lede, sign-up form | |
| 9 | Statement | `.statement`: centred lede | |
| 10 | Footer | `.site-footer`: 4 link columns + a wide column (select, socials), wordmark + © under a divider | 2 → 5 |

## 2. Spacing (warmnfuzzy)

| Token | Phone → tablet (≥768) → desktop (≥1280) | Use |
|---|---|---|
| `--space` | **70 → 120 → 180px** | Between sections, around the banner and statement |
| `--head-gap` | **24 → 32 → 40px** | Under a section head |
| label → title | 16px, fluid | Inside the section head |
| `--card-gap` | 24px (12px for 4-up on phones) | Between cards |
| `--grid-gap` | 16px | Between rows and playlist clips |

All spacing grows gently above each anchor width with the same formula as the type.

## 3. Typography (Noto Sans, warmnfuzzy sizes)

Formula: **size = max(base × 0.8 + 100vw × base ÷ W × 0.2, base)**, with W = 375 / 768 / 1280 / 1600.

| Role | Class | Phone → tablet → desktop | Use |
|---|---|---|---|
| Title | `.t-title` | 32 → 64 → **96px**, 700 | Section titles, banner title |
| Slide name | `.t-slide` | title size, max 4.4vw on desktop | Hero carousel names |
| Lede | `.t-lede` | 21 → 21 → **32px**, 700 | Statement, banner text (400), video title |
| Name | `.t-name` | 24 → 24 → **46px**, 700 | Big names (18px fluid inside rows) |
| Card title | `.t-card-title` | 20 → **24px** (≥640) | Cards (17px in 4-up on phones) |
| Card meta | `.t-meta` / `.t-place` | 16 → **18px** | Red-light bold dates / dim places |
| Body | `.t-body` | 14 → 14 → **16px**, 400 | Copy, footer links |
| Label | `.t-label` | 12 → 12 → **16px**, 700 CAPS, +0.4px | Section labels, nav, buttons, dates in rows, footer heads |
| Wordmark | `.t-mark` | 900 italic CAPS | Header and footer logo |

- **Must:** One font only. 700 for headings, names and labels; 400 for body copy.
- **Must:** Long names in rows and playlist clips truncate (`.clamp-1`, `.clamp-2`).

## 4. Colour (Live Nation)

| Token | Value | Use |
|---|---|---|
| `--black` | `#000000` | Page |
| `--paper` | `#202020` | Cards, rows, carousel panel, playlist clips (`#2a2a2a` on hover) |
| `--footer-bg` | `#121212` | Footer band |
| `--white` | `#f9f9f9` | Text |
| `--red` | `#e21836` | **The only action colour**: buttons, chevrons, active dot, active clip, card borders and glow, wordmark |
| `--red-dark` | `#9e1025` | Button hover |
| `--red-light` | `#e7465e` | Red text on charcoal (dates) |
| `--yellow` | `#ffe600` | Card badges only |

## 5. Components

| Component | Classes | Spec |
|---|---|---|
| Button | `.btn`, `.btn--outline` | Red, **6px corners**, 40px tall, CAPS label that rolls on hover, darkens to `#9e1025` (0.3s) |
| Chevron | `.chevron` | 20px red `›`, nudges 3px right on hover |
| Carousel | `.carousel` | Inactive slides at `brightness(0.35)`; white round arrows; white dots, active red; autoplay 6s, pauses on hover |
| Card | `.card > .card-inner` | Charcoal, **3px red border at 50%**, **16px corners**, red glow. Hover (≥640px): **scale 1.03, lift 3px**, border 80%, image zooms 1.05 over 0.7s, title turns red-light. 0.5s `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |
| Card foot | `.card-foot` | Bottom row: detail left, chevron or button right |
| Row | `.row` | 80px min, 8px corners, 128px thumb flush left, chevron right |
| Video | `.watch` | 16:9 video with title and round play button; playlist clips with a 2px red outline when active |
| Banner | `.banner` | Photo drifts with scroll (`data-scroll="shift"`), 50% black veil, centred content |
| Footer | `.site-footer` | CAPS heads, body-size links (underline on hover), outlined select, socials, wordmark + © row |

## 6. Motion (warmnfuzzy, cards from Next Stop Comedy)

| What | Spec |
|---|---|
| Signature ease | `cubic-bezier(0.26, 1, 0.48, 1)`, 0.5s |
| Page load (from 0.75s) | Header slides down, first hero name rises out of a mask, its button pops in |
| Hero | `data-scroll="persist"`: sinks 25svh as it scrolls away, under the page |
| Sections | `data-scroll="reveal"`: each section rises 25svh into place as it enters |
| Banner photo | `data-scroll="shift"`: ±5svh parallax |
| Smooth scroll | Lenis, lerp 0.1 |
| Carousel | 0.6s slide and dimming |
| Hovers | Rolling labels 0.5s; background hovers 0.15–0.3s Material ease |

- **Must:** Everything stops for `prefers-reduced-motion: reduce`, including carousel autoplay.

## 7. Do and don't

- **Do** keep every section to one label, one title and one grid or row list.
- **Do** keep cards in a row the same height; put the button or chevron in `.card-foot`.
- **Don't** use colours other than red for actions, or yellow for anything but badges.
- **Don't** let content leave the 1256px container except the hero, banner and footer band.
- **Don't** centre section titles. Only the banner and statement are centred.

## 8. Make it yours

Change `--red` / `--red-dark` / `--red-light` (and the card border and glow values) in `tokens.css`, replace the wordmark text, and swap the `.ph` placeholders for photos: 16:9 for cards, rows and video, 2.5:1 for the desktop hero.
