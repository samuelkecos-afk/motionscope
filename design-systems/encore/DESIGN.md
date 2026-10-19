# Encore: design rules

A remix of **Headliner** in which the **layout also follows Live Nation**.

| Part | Taken from | What that means here |
|---|---|---|
| **Layout** | livenation.com.au | Black page, content centred in a **1256px container**, sticky header with nav + pill search + sign in, **hero carousel** (next slide peeks in, dimmed), **4-up and 3-up card grids**, **video + playlist**, **3-column list rows**, full-width **photo banner**, centred **statement**, **5-column footer** on `#121212` |
| **Colour and font** | livenation.com.au | Black, charcoal `#202020`, white `#f9f9f9`, **red `#e21836`** for actions, yellow badges. **Noto Sans** 700 / 400, italic 900 wordmark |
| **Text sizes, hierarchy, spacing, scroll** | warmnfuzzy.tv | Giant CAPS hero headline, the fluid type scale, hairline + CAPS label + big gap + CAPS display heading on every section, 70 → 180px under each section, bold body text, the hero sinking away, the statement and footer rising in, parallax photos, Lenis smooth scroll, page-load sequence, rolling labels, giant footer wordmark |
| **Cards** | nextstopcomedy.com | 16:9 image with a pill badge, 3px border, 16px corners, glow; on hover the card lifts and grows, the image zooms and the title turns red |

Follow every **Must**.

---

## 1. Page structure (Live Nation layout)

- **Must:** Content sits in the centred `.container` (max **1256px**, sides **16px** on phones, **24px** from 600px). Section bands, the carousel, the banner, the footer, its wordmark and its hairlines run full width.
- **Must:** The page opens with the warmnfuzzy **hero** (giant CAPS headline + hero foot) followed directly by the Live Nation **carousel**. Both sit in one `data-scroll="persist"` wrapper; everything after goes in `.page-body` so the hero sinks underneath it.
- Section order:

| # | Section | Component | Columns (phone → desktop) |
|---|---|---|---|
| 1 | Header | Red italic wordmark, CAPS nav, pill search, sign in | Nav and search hide under 1100px |
| 2 | Hero | `.hero`: giant CAPS headline revealed line by line, hairline, name + buttons | |
| 3 | Carousel | `.carousel`: image + info panel (label, name, button) | Stacked → 63% image / 37% panel, next slide peeks in |
| 4 | Featured | `.grid-4` cards: badge, date, title, chevron | **2 → 4** |
| 5 | Catalogue | `.grid-3` cards: date, time, title, place, button | 1 → 2 (≥600) → 3 (≥900) |
| 6 | Watch | `.watch`: 16:9 video + playlist | Stacked → video + vertical list |
| 7 | List | `.rows`: thumb, name, chevron | 1 → 3 |
| 8 | Dates | `.rows` with `.row-text`: name, red CAPS date, detail | 1 → 3 |
| 9 | Banner | `.banner`: photo, veil, CAPS label, centred title, sign-up | |
| 10 | Statement | `.section.statement`: CAPS label, centred title | |
| 11 | Footer | Contact row, 5 link columns, **giant red wordmark**, social links + © | 2 → 5 |

## 2. Hierarchy and spacing (warmnfuzzy)

Every section is built the same way, exactly as on warmnfuzzy:

```html
<section class="section"><div class="container">
  <p class="t-label">Small CAPS label. One line of context.</p>
  <div class="head-row"><h2 class="t-display">Section name</h2><a class="u-link t-label" href="#">See all</a></div>
  … grid / rows / video …
</div></section>
```

| Step | Size: phone → tablet (≥768) → desktop (≥1280) |
|---|---|
| Hairline on top of every section | 1px white 12%, full width |
| CAPS label, from the hairline | **16px** |
| Label → display heading (`--label-gap`) | **75 → 120 → 170px** |
| Heading → content | **16px** |
| Content → next hairline (`--space`) | **70 → 120 → 180px** |
| Above a closing link (`--link-gap`) | **70 → 100 → 160px** |

- **Must:** Section headings are **`.t-display` CAPS**, with any link label on the same baseline. Statement and banner titles are `.t-title` (sentence case).
- **Must:** Body text is **bold (700) with 1.22 line height**; only `.t-body` copy is regular (400).

## 3. Typography (Noto Sans, warmnfuzzy sizes)

Formula: **size = max(base × 0.8 + 100vw × base ÷ W × 0.2, base)**, with W = 375 / 768 / 1280 / 1600.

| Role | Class | Phone → tablet → desktop | Use |
|---|---|---|---|
| Hero | `.t-hero` | 64 → 164 → **320px** (max 23vw), CAPS | The opening headline |
| Display | `.t-display` | 48 → 48 → **132px**, CAPS | Every section heading |
| Title | `.t-title` | 32 → 64 → **96px** | Statement, banner title |
| Name | `.t-name` | 24 → 24 → **46px** | Carousel names, hero foot (CAPS) |
| Lede | `.t-lede` | 21 → 21 → **32px** | Row names, video title |
| Body | `.t-body` | 14 → 14 → **16px**, 400 | Copy, footer links |
| Label | `.t-label` | 12 → 12 → **16px**, CAPS | Labels, nav, buttons, row dates, footer heads |
| Card title / meta | `.t-card-title` / `.t-meta` | 20 → 24 / 16 → 18 | Inside cards (Next Stop Comedy) |
| Wordmark | `.t-mark` | 900 italic CAPS; footer at 12.6vw | Logo |

- **Must:** One font, Noto Sans. Tracking +0.4px on labels, −0.03em on hero and display.

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
| Footer | `.site-footer` | Contact row, CAPS heads, body-size links, outlined select, socials, **giant red italic wordmark**, social links + © under a full-width hairline |

## 6. Motion and scroll (warmnfuzzy)

| What | Spec |
|---|---|
| Signature ease | `cubic-bezier(0.26, 1, 0.48, 1)`, 0.5s transforms, 0.075s linear fades |
| Page load (from 0.75s) | Header slides down, hero lines rise out of masks (0.06s stagger), hero buttons pop from scale 0 |
| `data-scroll="persist"` | Hero + carousel sink 25svh as they scroll away, under the page |
| `data-scroll="reveal"` | Statement band and footer rise 25svh into place as they enter |
| `data-scroll="shift"` | Video and banner photos drift ±5svh while on screen |
| Smooth scroll | Lenis, lerp 0.1 |
| Hover | Rolling CAPS labels (0.5s); card lift from Next Stop Comedy (0.5s) |
| Carousel | Live Nation: 0.6s slide and dimming, autoplay 6s |

- **Must:** Use the scroll effects only where listed. Every other section stays still.
- **Must:** Everything stops for `prefers-reduced-motion: reduce`, including carousel autoplay.

## 7. Do and don't

- **Do** keep every section to one label, one title and one grid or row list.
- **Do** keep cards in a row the same height; put the button or chevron in `.card-foot`.
- **Don't** use colours other than red for actions, or yellow for anything but badges.
- **Don't** let content leave the 1256px container except the hero, banner and footer band.
- **Don't** centre section headings. Only the banner and statement are centred.

## 8. Make it yours

Change `--red` / `--red-dark` / `--red-light` (and the card border and glow values) in `tokens.css`, replace the wordmark text, and swap the `.ph` placeholders for photos: 16:9 for cards, rows and video, 2.5:1 for the desktop hero.
