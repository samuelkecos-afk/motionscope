# Encore design system (Headliner remix with the Live Nation layout)

- **Layout** from **livenation.com.au**: centred 1256px page, sticky header with search, hero carousel, 4-up and 3-up card grids, video + playlist, list rows, photo banner, 5-column footer.
- **Colour and font** from **livenation.com.au**: black and charcoal, red buttons and chevrons, bold Noto Sans, italic wordmark.
- **Text sizes, hierarchy, spacing and scroll** from **warmnfuzzy.tv**: the fluid type scale, CAPS label above each big title, 70 → 180px between sections, scroll reveals and smooth scrolling.
- **Cards** from **nextstopcomedy.com**: badge, 3px border, 16px corners, lift and glow on hover. Recoloured red.

Open **`components.html`** to see the pieces, and **`templates/landing.html`** for a full landing page.

## What's in the folder

| File | What it is |
|---|---|
| `DESIGN.md` | **The rules**: which part came from where, section order, spacing, type scale, colour, components, motion |
| `tokens.css` | Colours, font, fluid type and spacing, layout, card values, motion |
| `encore.css` | All components: header, carousel, cards, rows, watch, banner, statement, footer, scroll effects |
| `encore.js` | Carousel, smooth scroll (Lenis), film grain, sign-up form helper |
| `tokens.json` | Tokens in W3C DTCG format for Figma (Tokens Studio) or Style Dictionary |
| `components.html` | Reference page |
| `templates/landing.html` | Starter landing page (online school example) |

## Start a new project

1. Copy this folder into your project (for example as `design/`).
2. Copy `templates/landing.html` to your project root and change `../` to `design/` in its links.
3. Change the red set in `tokens.css` if you want another brand colour, and the wordmark text.
4. Replace the `.ph` placeholders with photos.

In `<head>`:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,900&display=swap">
<link rel="stylesheet" href="design/tokens.css">
<link rel="stylesheet" href="design/encore.css">
```

Before `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"></script>
<script src="design/encore.js"></script>
```

## Building with an AI tool

Attach `DESIGN.md`, `tokens.css` and `encore.css`, then:

> Build [page] using the Encore design system. Follow every "Must" in DESIGN.md. Use only the classes in encore.css and the tokens in tokens.css. Keep the Live Nation section order: header, hero carousel, card grids, video, rows, banner, statement, footer.

## Notes

- Checked in a browser from 360 to 1600px wide: sizes follow the warmnfuzzy scale and nothing spills off the page.
- The hero name size is held to 4.4vw on desktop so it fits Live Nation's carousel panel; elsewhere titles use the full warmnfuzzy size.
- Placeholder images are CSS gradients, so the folder contains no third-party photos or logos.
