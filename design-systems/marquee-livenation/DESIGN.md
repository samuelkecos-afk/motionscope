# Marquee: design rules

A content-dense ticketing system: a black page, **charcoal cards with 8px corners**, **red ticket buttons and red chevrons**, and **bold Noto Sans** for every heading and name. Built to show many artists, events and dates at once. Measured from **livenation.com.au** with MotionScope and its live stylesheets (October 2026). Change the red and the wordmark to make it yours.

These rules are written so a person or an AI builder can follow them exactly. Follow every **Must**.

---

## 1. Page structure

- **Must:** The page is black (`--bg #000`), and all content sits on **charcoal `#202020` cards or rows** with 8px corners. There are no borders on cards.
- **Must:** Content lives in a centred container **1256px wide** (side padding 16px on phones, 24px from 600px). Only the hero carousel and the photo banner run full width.
- **Must:** Sections are separated by **40px (phones) / 56px (≥900px)**. Each section starts with a **left-aligned bold title**, 24px above its content.
- Recommended order:

| # | Section | Component | Columns (phone → desktop) |
|---|---|---|---|
| 1 | Header | Red wordmark, bold nav, pill search, sign-in | Nav and search collapse to icons under 1100px |
| 2 | Hero | Carousel: image + info panel (name, status, red button), neighbours dimmed | Stacked → side by side (63% / 37%) |
| 3 | Just announced | Artist cards: image, bold name, red chevron | 2 → 4 |
| 4 | What's on | Event cards: image, bigger title, **Buy Tickets** button | 1 → 3 |
| 5 | Watch | Video + playlist (active clip outlined red) | Stacked, playlist scrolls sideways → video + vertical list |
| 6 | Category rows | More artist cards ("For laughs", "From our friends") | 2 → 4 |
| 7 | On sale now | List rows: 16:9 thumb, name, chevron | 1 → 3 |
| 8 | Touring now | Tour rows: thumb, name, DATE, venue, chevron | 1 → 3 |
| 9 | Banner | Full-width crowd photo, dark veil, centred title + paragraph + red button | |
| 10 | Statement | Centred paragraph (acknowledgement, mission) | |
| 11 | Footer | 4 link columns + location select + socials, centred note | 2 → 5 |

## 2. Typography

One free Google Font: **Noto Sans**, 400 and 700. Every heading and name is **bold (700)**. Letter spacing is **0.15px** on everything (0.4px on small bold labels and buttons).

| Role | Class | Phone → ≥600 → ≥900 (size / line height) | Use |
|---|---|---|---|
| Display | `.t-display` | 28/36 → 28/36 → **38/44** | Hero names, banner title |
| Section title | `.t-section` | 21/28 → 21/28 → **28/36** | Every section title, left-aligned, 24px gap below |
| Title | `.t-title` | 19/26 → 19/26 → **21/28** | Event card titles, hero status line |
| Header 4 | `.t-h4` | 16/24 | Nav links, footer column heads |
| Name | `.t-name` | 14/20, +0.4px | Artist card names, list row names |
| Large paragraph | `.t-large` | 19/26 → 20/29 → 21/28 (regular) | Banner text, video titles |
| Paragraph | `.t-p` | 16/25 (regular) | Statements, footer note |
| Small | `.t-small` | 14/20 | Footer links, sign-in |
| Date | `.t-date` | 14/20, CAPS | Tour dates ("20 NOV 2026") |
| Tiny | `.t-tiny` | 12/16 | Venues, playlist titles |

- **Must:** Long names truncate with an ellipsis (`.clamp-1`, `.clamp-2`, `.clamp-3`) instead of wrapping rows to new heights.

## 3. Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#000000` | Page |
| `--paper` | `#202020` | Cards, rows, panels (`#2a2a2a` on hover) |
| `--fg` | `#f9f9f9` | Text |
| `--red` | `#e21836` | **The only action colour**: buttons, chevrons, active dot, active clip outline, wordmark |
| `--red-dark` | `#9e1025` | Button hover |
| `--fg-dim` | white 50% | Icons, input borders |
| `--divider` | white 12% | Footer rule, header border |
| `--yellow` `#ffe600`, `--ice` `#d6e7f9` | | Rare accents (badges, highlights) |

## 4. Components

| Component | Classes | Spec |
|---|---|---|
| Button | `.btn` | Red, **6px radius**, 36px min height, 6×16px padding, 14px bold. Hover darkens to `#9e1025` (0.3s). Click ripple (0.55s) |
| Chevron | `.chevron` | 20px red `›`, bottom-right of cards and right end of rows; nudges 3px right on hover |
| Artist card | `.card` | 16:9 image, then 16px padding with bold 14px name and the chevron, min 80px tall |
| Event card | `.card.event` | Same card, 19 → 21px title, **Buy Tickets** button bottom-right |
| List row | `.row` | 72px tall, 128px 16:9 thumbnail flush left, name, chevron |
| Tour row | `.row > .row-text` | Name, CAPS date, tiny venue line |
| Hero carousel | `.carousel` | Image (16:9 phone, 2.5:1 desktop) + info panel; inactive slides at `brightness(0.35)`, 0.6s ease; next slide peeks in on desktop; white round arrows; white dots, active red; autoplay 6s, pauses on hover |
| Watch | `.watch` | 16:9 video with title overlay and play button; playlist of clips, active clip has a 2px red outline |
| Banner | `.banner` | Full-bleed photo, 50% black veil, centred display title, large paragraph, red button |
| Footer | `.site-footer` | Lifted dark band, bold 16px heads, 14px links (underline on hover), outlined location select, social icons, centred note under a divider |

## 5. Motion

Material-style and quick. Almost everything uses **`cubic-bezier(0.4, 0, 0.2, 1)`**.

| What | Duration |
|---|---|
| Nav and icon hover backgrounds (white 8%) | 0.15s |
| Card shadow on hover | 0.25s |
| Buttons, row and card background, chevron nudge | 0.3s |
| Carousel slide and dimming | 0.6s (`ease` for the dimming) |
| Click ripple | 0.55s |

- **Must:** All motion stops for `prefers-reduced-motion: reduce`, and the carousel stops autoplaying.

## 6. Do and don't

- **Do** pack the page: many short sections of cards and rows, each with one bold title.
- **Do** keep every card the same height in a row, and truncate long names.
- **Don't** use colour other than red for actions.
- **Don't** add borders or outlines to cards; contrast comes from charcoal on black.
- **Don't** centre section titles. Only the banner and statement are centred.

## 7. Make it yours

Change `--red` / `--red-dark` / `--red-light` together, replace the `.wordmark` text, and swap the `.ph` placeholders for photos (16:9 for cards and rows, 2.5:1 for the desktop hero).
