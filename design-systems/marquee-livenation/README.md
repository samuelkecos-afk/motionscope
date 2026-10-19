# Marquee design system (from livenation.com.au)

A content-dense ticketing system: black page, charcoal cards and rows with 8px corners, **red ticket buttons and chevrons**, bold **Noto Sans**, a hero carousel, video playlist, list rows and a photo banner. Measured from livenation.com.au with MotionScope.

Open **`components.html`** to see every style and component, and **`templates/landing.html`** for a full landing page.

## What's in the folder

| File | What it is |
|---|---|
| `DESIGN.md` | **The rules**: page structure, section order, type scale, colour, components, motion, do/don't |
| `tokens.css` | Colours, font, responsive type sizes, layout, radii, shadows, motion |
| `marquee.css` | All components: header, carousel, artist and event cards, list and tour rows, watch, banner, statement, footer |
| `marquee.js` | Carousel (arrows, dots, autoplay, dimmed neighbours) and button ripple |
| `tokens.json` | Tokens in W3C DTCG format for Figma (Tokens Studio) or Style Dictionary |
| `components.html` | Reference page |
| `templates/landing.html` | Starter landing page |

## Start a new project

1. Copy this folder into your project (for example as `design/`).
2. Copy `templates/landing.html` to your project root and point the paths at `design/tokens.css`, `design/marquee.css` and `design/marquee.js`.
3. Change the red set in `tokens.css` and the `.wordmark` text.
4. Replace the `.ph` placeholders with photos.

In `<head>`:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;0,900;1,900&display=swap">
<link rel="stylesheet" href="design/tokens.css">
<link rel="stylesheet" href="design/marquee.css">
```

## Building with an AI tool

Attach `DESIGN.md`, `tokens.css` and `marquee.css`, then:

> Build [page] using the Marquee design system. Follow every "Must" in DESIGN.md. Use only the classes in marquee.css and the tokens in tokens.css. Every section gets a left-aligned bold title and content on #202020 cards or rows.

## Notes

- Noto Sans is free on Google Fonts: this is the site's real typeface.
- The footer band colour (`#121212`) is approximated from screenshots; everything else comes from the site's stylesheets.
- The red is the reference site's brand colour. Change it for your own brand.
- Placeholder images are CSS gradients, so the folder contains no third-party photos or logos.
