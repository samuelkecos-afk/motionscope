# Headliner design system (combination)

A mix of the three measured systems:

- **Colour and font** from **livenation.com.au**: black and charcoal, red buttons, bold Noto Sans, italic wordmark.
- **Layout, text sizes, hierarchy, spacing and scroll** from **warmnfuzzy.tv**: full-width colour blocks, CAPS label left + big type right, the fluid type scale, scroll reveals and smooth scrolling.
- **Cards** from **nextstopcomedy.com**: 16:9 image, badge, 3px border, 16px corners, lift and glow on hover. Recoloured red.

Open **`components.html`** to see every style and component, and **`templates/landing.html`** for a full landing page.

## What's in the folder

| File | What it is |
|---|---|
| `DESIGN.md` | **The rules**: which part came from which site, page structure, type scale, colour, card spec, motion, do/don't |
| `tokens.css` | Colours, font, fluid type sizes, grid, spacing, card values, motion |
| `headliner.css` | All components: header, buttons, hero, cards, list, tiles, rows, accordion, ticker, footer, scroll effects |
| `headliner.js` | Smooth scroll (Lenis), film grain, sign-up form helper |
| `tokens.json` | Tokens in W3C DTCG format for Figma (Tokens Studio) or Style Dictionary |
| `components.html` | Reference page |
| `templates/landing.html` | Starter landing page (online school example) |

## Start a new project

1. Copy this folder into your project (for example as `design/`).
2. Copy `templates/landing.html` to your project root and change `../` to `design/` in its links.
3. Change the red set in `tokens.css` if you want another brand colour, and the wordmark text.
4. Replace the `.ph` placeholders with 16:9 photos.

In `<head>`:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,900&display=swap">
<link rel="stylesheet" href="design/tokens.css">
<link rel="stylesheet" href="design/headliner.css">
```

Before `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"></script>
<script src="design/headliner.js"></script>
```

## Building with an AI tool

Attach `DESIGN.md`, `tokens.css` and `headliner.css`, then:

> Build [page] using the Headliner design system. Follow every "Must" in DESIGN.md. Use only the classes in headliner.css and the tokens in tokens.css. Every section is a full-width colour block with a CAPS label on the left and big type on the right; anything with a picture uses the card component.

## Notes

- Noto Sans is free on Google Fonts and is Live Nation's real typeface.
- Sizes are the exact warmnfuzzy values (checked in a browser at 360–1600px wide). Spacing under the big names is slightly larger than warmnfuzzy's because Noto Sans has deeper descenders than their font.
- The red is Live Nation's brand colour. Change it for your own brand.
- Placeholder images are CSS gradients, so the folder contains no third-party photos or logos.
