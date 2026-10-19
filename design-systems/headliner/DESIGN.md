# Headliner: design rules

A combination of three measured websites:

| Part | Taken from | What that means here |
|---|---|---|
| **Colour and font** | livenation.com.au (Marquee) | Black, charcoal `#202020`, white `#f9f9f9`, **red `#e21836`** for actions; yellow and ice as rare accents. **Noto Sans** 700 / 400, italic 900 wordmark |
| **Layout, text sizes, hierarchy, spacing, scroll** | warmnfuzzy.tv (Blocks) | Full-width colour blocks, CAPS label left + big type right, the fluid type scale, 70 → 180px section spacing, native scroll reveals, Lenis smooth scroll, page-load sequence |
| **Cards** | nextstopcomedy.com (Spotlight) | 16:9 image with a pill badge, 3px border, 16px corners, glow; on hover the card lifts and grows, the image zooms and the title turns red |

These rules are written so a person or an AI builder can follow them exactly. Follow every **Must**.

---

## 1. Page structure (warmnfuzzy)

- **Must:** The page is a stack of **full-width colour blocks** (`.block` with `data-theme`). Neighbouring blocks are separated by a 1px hairline.
- **Must:** Every section opens with a **small CAPS label** (`.t-label`) at the top-left, 16px from the block's top edge.
- **Must:** Use the **split layout** (`.split`) for text sections: label in the left column (5 of 16 columns on tablet, 8 of 24 on desktop), big content on the right. On phones it stacks with 50px under the label.
- **Must:** Space under every section is `--space`: **70px (phone) → 120px (tablet) → 180px (desktop)**. Between a label and its big headline: `--label-gap` **75 → 120 → 170px**. Above a closing link: `--link-gap` **70 → 100 → 160px**.
- **Must:** Side margins are 16px at every size (`.wrap`). Grid: 8 / 16 / 24 columns, gaps 10px / 16px.
- Block themes:

| `data-theme` | Background | Text | Use |
|---|---|---|---|
| `black` | `#000` | white | Hero, cards, pricing (the default) |
| `paper` | `#202020` | white | A quieter dark band (schedules, tiles) |
| `red` | `#e21836` | white | **One** loud statement section, and the footer |
| `yellow` | `#ffe600` | black | One intro or highlight section |
| `white` | `#f9f9f9` | black | FAQ / long reading |
| `ice` | `#d6e7f9` | black | Optional calm section |

- **Must:** Never put two blocks with the same bright theme next to each other. Use red and yellow once each in the body (plus a red footer).
- Recommended order: black hero → yellow intro → black cards → ticker → red statement + list → charcoal tiles → black rows (pricing) → white FAQ → red footer.

## 2. Typography (Noto Sans, warmnfuzzy sizes)

Every size uses one fluid formula: **size = max(base × 0.8 + 100vw × base ÷ W × 0.2, base)**, where W is 375 / 768 / 1280 / 1600. So text is exactly the base size at those widths and grows gently beyond them. Use the classes; never set raw px.

| Role | Class | Phone → tablet (≥768) → desktop (≥1280) | Weight · case |
|---|---|---|---|
| Hero | `.t-hero` | 64 → 164 → **320px** (max 23vw) | 700 CAPS, −0.03em |
| Display | `.t-display` | 48 → 48 → **132px** | 700 CAPS, −0.03em |
| Title | `.t-title` | 32 → 64 → **96px** | 700, sentence case |
| Name | `.t-name` | 24 → 24 → **46px** | 700 |
| Lede | `.t-lede` | 21 → 21 → **32px** | 700 |
| Body | `.t-body` | 14 → 14 → **16px** | 400 |
| Label | `.t-label` | 12 → 12 → **16px** | 700 CAPS, +0.4px |
| Wordmark | `.t-mark` / `.wordmark` | logo size / 12.6vw | **900 italic** CAPS (Live Nation style) |
| Card title | `.t-card-title` | 20 → **24px** (≥640) | 700 |
| Card meta | `.t-meta`, `.t-place` | 16 → **18px** (≥640) | 700 red-light / 400 dim |

- **Must:** One font only: Noto Sans. Headings, labels, names and ledes are **700**; body copy is **400**.
- **Must:** Letter spacing is **0.15px** on text, **0.4px** on labels and buttons, **−0.03em** on hero, display, ticker and wordmark.
- Hierarchy per section: CAPS label → one big headline (title or display) → names / ledes → body.

## 3. Colour (Live Nation)

| Token | Value | Use |
|---|---|---|
| `--black` | `#000000` | Page, default block |
| `--paper` | `#202020` | Charcoal block, **card fill** |
| `--white` | `#f9f9f9` | Text on dark, white block |
| `--red` | `#e21836` | **The action colour**: buttons, logo, ticker dots, card borders and glow, red block |
| `--red-dark` | `#9e1025` | Button hover |
| `--red-light` | `#e7465e` | Red text on charcoal (card dates, hovered card titles) |
| `--yellow` | `#ffe600` | Card badges, the yellow block |
| `--ice` | `#d6e7f9` | Rare calm accent |

- **Must:** Red is the only action colour. On a red block, buttons turn black automatically.

## 4. Components

| Component | Classes | Spec |
|---|---|---|
| Header | `.site-header > .bar` | Sticky black bar, CAPS labels, red dot + italic wordmark, nav links roll on hover |
| Button | `.btn` (`--black`, `--light`) | Red, **6px corners**, CAPS label, hover darkens to `#9e1025` (0.3s); label rolls up on hover |
| Rolling label | `.roll` | Text slides up, a copy slides in (0.5s, signature ease) |
| Hero | `.hero` | Giant CAPS headline revealed line by line (`.mask`), name + buttons under a hairline |
| **Card** | `.cards > li > a.card > .card-inner` | See below |
| Name list | `.list` | Big names stacked, body under each |
| Tiles | `.tiles` | Outlined squares / circle with a display word, label + count under |
| Rows | `.rows > .row` | Name left, value right, body under (pricing) |
| Accordion | `.accordion` | Questions at name size, `+` turns to `×` |
| Ticker | `.ticker` | Display CAPS marquee, red dots, 60s loop, pauses on hover |
| Footer | `.footer` | Contact row, title + sign-up, **giant red-block italic wordmark**, underlined links |

### The card (Next Stop Comedy, recoloured)

```html
<ul class="cards">
  <li><a class="card" href="#"><div class="card-inner">
    <div class="card-media"><img src="photo.jpg" alt=""><span class="badge">Beginner</span></div>
    <div class="card-body">
      <span class="meta-row"><span class="t-meta"><svg class="icon"><use href="#i-cal"/></svg>12 Jan</span>
        <span class="t-meta"><svg class="icon"><use href="#i-clock"/></svg>6 PM</span></span>
      <h3 class="t-card-title">Course title</h3>
      <span class="t-place"><svg class="icon"><use href="#i-pin"/></svg>Live online</span>
    </div>
  </div></a></li>
</ul>
```

- Grid: 1 column → 2 (≥640px) → 3 (≥1024px), 24px gap.
- Card: charcoal `#202020`, **3px red border at 50%**, **16px corners**, shadow `0 4px 20px #0006` + red glow `0 0 12px`.
- Image: **16:9**, yellow CAPS pill badge top-left.
- Body: 12px / 16px padding; red-light bold date + time with icons, bold title, dim place line.
- **Hover (≥640px): scale 1.03 and lift 3px**, border to 80%, stronger glow, over **0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)**. The image zooms to 1.05 over 0.7s; the title turns red-light.

## 5. Motion and scroll (warmnfuzzy)

| What | Spec |
|---|---|
| Signature ease | `cubic-bezier(0.26, 1, 0.48, 1)`, 0.5s for transforms, 0.075s linear for fades |
| Page load | Starts at 0.75s: header slides down, hero lines rise out of masks (0.06s stagger), buttons pop from scale 0 |
| `data-scroll="persist"` | Block sinks 25svh as it scrolls away (hero) |
| `data-scroll="reveal"` | Block rises 25svh into place as it enters |
| `data-scroll="shift"` | Gentle ±5svh parallax drift while on screen |
| Smooth scroll | Lenis, lerp 0.1 (load before `headliner.js`) |
| Film grain | `.grain` overlay, 4.5% opacity |
| Card lift | Next Stop Comedy timing (see the card) |

- Scroll effects use native CSS (`animation-timeline: view()`): no JavaScript, and browsers without it simply show the page still.
- **Must:** Everything stops for `prefers-reduced-motion: reduce`.

## 6. Do and don't

- **Do** keep each section to one label, one big headline and one kind of content.
- **Do** use the cards for anything with a picture and a date (courses, events, products).
- **Don't** use colours other than red for buttons and links that act.
- **Don't** add a second font or set sizes in px; use the type classes.
- **Don't** centre text. Everything aligns left, as on warmnfuzzy.

## 7. Make it yours

Change `--red` / `--red-dark` / `--red-light` together in `tokens.css` (and the card border and glow values under "Cards"), replace the wordmark text, and swap the `.ph` placeholders for 16:9 photos.
