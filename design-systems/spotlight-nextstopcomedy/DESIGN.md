# Spotlight: design rules

A dark, neon nightlife system for live events: a black page, **cyan neon** accents, **condensed CAPS headlines** (Anton) over a clean sans (Inter), and glowing deep-teal cards. Measured from **nextstopcomedy.com** with MotionScope and its live stylesheets (October 2026). Use it as a starting point; change the accent colour and copy to make it your own.

These rules are written so a person or an AI builder can follow them exactly. Follow every **Must**.

---

## 1. Page structure

- **Must:** The page background is pure black (`--bg #000`). Text is near-white (`--fg #f2f2f2`).
- Content sits in a centred container, **max 1280px**, with side padding 16 → 24 (≥640px) → 32px (≥1024px).
- Sections are separated by faint hairlines (white at about 9%).
- Recommended order for a landing page:

| # | Section | Look | Content |
|---|---|---|---|
| 1 | Header | Sticky, translucent black, blurred | Logo (two-tone wordmark), nav links, search, sign-in |
| 2 | Hero | Full-screen video or photo, dark gradient from the bottom | Two-line CAPS headline (**white line, then cyan gradient line**), search field + button, anchored to the **bottom** |
| 3 | Strip | **Yellow** (`#ffd700`) full-width bar | One bold sentence of social proof, centred, black text |
| 4 | Cards | Black | Centred head + subtitle, cards 1 / 2 / 3 columns, "More shows →" button |
| 5 | Sign-up band | **Blurred photo** under an 85% black veil + soft cyan glow | Eyebrow, CAPS headline, subtitle, narrow form |
| 6 | Steps | Black | Eyebrow + "How it works", 4 numbered steps (1 / 2 / 4 columns) |
| 7 | FAQ band | Blurred photo band | Eyebrow + "FAQ", glass accordion, "View all FAQs →" |
| 8 | Footer | Black | Brand + 3 link columns, centred copyright |

## 2. Section heads are centred

- **Must:** Every section head is **centred**: an optional **eyebrow** (tiny CAPS, cyan, letter spacing 0.3em), then the **CAPS condensed headline**, then an optional grey subtitle.
- Space under a head: 40px on phones, 56px from 640px.
- Section padding: 48px on phones, 80px from 640px. Photo bands use 64 → 96px.

## 3. Typography

Two free Google Fonts: **Anton** (display, CAPS only) and **Inter** (everything else).

| Role | Class | Font | Phone → ≥640 → ≥768 → ≥1024 → ≥1280 | Line height | Style |
|---|---|---|---|---|---|
| Hero | `.t-hero` | Anton | 48 → 60 → 72 → 96 → 128px | 0.9 | CAPS, −0.025em. Second line uses `.text-gradient` |
| Section title | `.t-section` | Anton | 30 → 36 → 48 → 60px | 1.0 (0.95 for two-line titles) | CAPS, −0.025em |
| Eyebrow | `.t-eyebrow` | Inter 600 | 12 → 14px | 1.43 | CAPS, **+0.3em**, cyan |
| Subtitle | `.t-sub` | Inter 400 | 14 → 16px | 1.5 | Grey `#aeaeae` |
| Card title | `.t-card-title` | Inter 700 | 20 → 24px | 1.25 | Turns cyan on card hover |
| Card date / time | `.t-meta` | Inter 700 | 16 → 18px | 1.5 | **Cyan**, with a 16px outline icon |
| Card place | `.t-place` | Inter 600 | 16 → 18px | 1.5 | 80% white, cyan pin icon |
| Step title | `.t-step` | Inter 700 | 18px | 1.4 | −0.025em |
| Body / answers | `.t-body` | Inter 400 | 16px | 28px | |
| Small (nav, buttons, footer) | `.t-small` | Inter | 14px | 20px | |
| Footer column head | `.t-col-head` | Inter 600 | 14px | 20px | CAPS, +0.05em, grey |
| Legal | `.t-tiny` | Inter | 10 → 12px | | 60% grey |

- **Must:** Anton is only ever used in CAPS, for the hero and section titles. Never for body text.
- Nav links are 16px Inter 600 in grey, turning white on hover.

## 4. Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#000000` | Page |
| `--fg` | `#f2f2f2` | Text |
| `--muted-fg` | `#aeaeae` | Subtitles, nav, captions |
| `--primary` | `#00ece7` | **Neon cyan**: buttons, dates, eyebrows, step numbers, active states |
| `--primary-fg` | `#020202` | Text on cyan |
| `--gradient` | `#8ffaf6 → #00ece7 → #00d1d9` (135°) | Second hero line, wordmark accent |
| `--card-bg` | `#002120` | Show cards (deep teal) |
| `--card-border` | `#00e0d1` at 50% → 80% on hover | 3px card border |
| `--yellow` | `#ffd700` | The one announcement strip only |
| `--border` | white 30% | Inputs, outlines |

- **Must:** Cyan is the only accent. Yellow appears once (the strip).

## 5. Components

| Component | Classes | Spec |
|---|---|---|
| Button | `.btn` | 40px tall, 32px side padding, **6px radius**, 14px Inter 700 **CAPS +0.05em**, cyan fill, black text. `.btn--glow` adds a neon glow |
| Search | `.search` | 48px input with icon, 10px radius, translucent black, 30% white border, cyan button attached |
| Badge | `.badge` | Pill, 12px bold, cyan 90%, top-left of card images |
| Show card | `.card > .card-inner` | **16px radius, 3px teal border, `#002120` fill**, 16:9 image, body 12×16px padding with date, time, title, place |
| Steps | `.steps .step` | 40px cyan circle number with glow, 160px image (12px radius), bold title, all centred |
| Photo band | `.band` | Photo + 85% black veil + `blur(4px)` + a 600×400 cyan blob blurred 120px in the centre |
| Form | `.form` | Max 448px wide, 44px inputs (10px radius, 40% white border), full-width glowing submit |
| FAQ | `.faq details` | 12px radius glass panels (blur, 40% border); **open = cyan border, cyan question, soft glow**, chevron rotates 180° |
| Strip | `.strip` | Yellow bar, 14 → 16px bold, centred |
| Footer | `.site-footer` | Brand + 3 columns (2 on phones), CAPS grey column heads, 70% white links |
| Bottom bar | `.bottom-bar` | Fixed bottom bar that slides up (cookie notice, ticket CTA) |

## 6. Motion

| What | How |
|---|---|
| Card hover | **Lift**: `scale(1.03) translateY(-3px)`, 0.5s `cubic-bezier(0.25, 0.46, 0.45, 0.94)`; border brightens and glow grows. Desktop only (≥640px) |
| Card image | Zooms to 1.05 over 0.7s ease-out |
| Colours (links, titles) | 0.15s `cubic-bezier(0.4, 0, 0.2, 1)` |
| FAQ | Panel border and glow 0.3s; chevron rotates 0.3s |
| Hero media | Video and poster crossfade over 1s |
| Bottom bar / toasts | `slideUp`: 20px rise + fade, 0.6s ease-out |

- **Must:** All motion stops for `prefers-reduced-motion: reduce`.

## 7. Do and don't

- **Do** anchor the hero headline to the bottom of a full-screen photo or video.
- **Do** use real event details on cards: day, date, time, venue, city.
- **Don't** add other accent colours; cyan carries the brand.
- **Don't** use Anton for anything but CAPS headlines.
- **Don't** left-align section heads; they are always centred.

## 8. Make it yours

Change `--primary`, `--gradient`, `--card-bg` and `--card-border` together (keep the card colour a very dark version of the accent), swap the yellow strip colour if needed, and replace the placeholder `.ph` blocks with real photos.
