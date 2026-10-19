# Spotlight design system (from nextstopcomedy.com)

A dark neon nightlife system for live events: pure black, **neon cyan** accents, **condensed CAPS headlines** (Anton) over Inter, a full-screen hero with a two-tone headline, glowing deep-teal event cards, blurred-photo bands and a glass FAQ. Measured from nextstopcomedy.com with MotionScope.

Open **`components.html`** to see every style and component, and **`templates/landing.html`** for a full landing page.

## What's in the folder

| File | What it is |
|---|---|
| `DESIGN.md` | **The rules**: page structure, centred section heads, type scale, colour, components, motion, do/don't |
| `tokens.css` | Colours, fonts, responsive type sizes, layout, radii, shadows, motion |
| `spotlight.css` | All components: header, hero, strip, cards, steps, photo bands, form, FAQ, footer, bottom bar |
| `spotlight.js` | Sign-up form helper |
| `tokens.json` | Tokens in W3C DTCG format for Figma (Tokens Studio) or Style Dictionary |
| `components.html` | Reference page |
| `templates/landing.html` | Starter landing page |

## Start a new project

1. Copy this folder into your project (for example as `design/`).
2. Copy `templates/landing.html` to your project root and point the paths at `design/tokens.css`, `design/spotlight.css` and `design/spotlight.js`.
3. Change the accent colour set in `tokens.css` (`--primary`, `--gradient`, `--card-bg`, `--card-border`).
4. Replace the `.ph` placeholder blocks with your photos (`<img>` or `<video>` with the same class positions).

In `<head>`:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="design/tokens.css">
<link rel="stylesheet" href="design/spotlight.css">
```

## Building with an AI tool

Attach `DESIGN.md`, `tokens.css` and `spotlight.css`, then:

> Build [page] using the Spotlight design system. Follow every "Must" in DESIGN.md. Use only the classes in spotlight.css and the tokens in tokens.css. Centre every section head with an eyebrow above a CAPS Anton title.

## Notes

- Both fonts (Anton, Inter) are free on Google Fonts: this is the site's real typography.
- The cyan and teal are the reference site's brand colours. Change them for your own brand.
- Placeholder images are CSS gradients, so the folder contains no third-party photos.
