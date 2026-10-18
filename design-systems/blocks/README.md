# Blocks design system

A reusable editorial **colour-block** design system: a black page of full-width colour blocks, small CAPS labels on the left, big heavy type on the right, generous spacing, and quiet, precise motion. Its type scale, spacing and motion were measured from warmnfuzzy.tv with MotionScope.

**Open `components.html`** to see every type role and component, and **`templates/landing.html`** for a complete landing page built with it. Resize the window: everything scales.

## What's in the folder

| File | What it is |
|---|---|
| `DESIGN.md` | **The rules**: blocks, layout, spacing, the 7 type roles, footer, components, motion, do/don't. Give this to any designer or AI builder |
| `tokens.css` | Colours, font, grid, motion and the fluid type formula as CSS variables |
| `blocks.css` | All components: blocks, split layout, header, buttons, cards, lists, tiles, rows, accordion, ticker, footer, motion |
| `blocks.js` | Smooth scrolling (Lenis), film grain, sign-up form helper |
| `tokens.json` | The same tokens in W3C DTCG format, for Figma (Tokens Studio) or Style Dictionary |
| `components.html` | Reference page showing every role and component |
| `templates/landing.html` | Starter landing page (the Lumen School example) |

## Start a new project

1. Copy this whole folder into your project (for example as `design/`).
2. Copy `templates/landing.html` to your project root and fix the three paths to point at your copy (`design/tokens.css`, `design/blocks.css`, `design/blocks.js`).
3. In `tokens.css`, set your three brand colours (`--blue`, `--yellow`, `--orange`) and, if you have one, your font (`--font`).
4. Replace the content. Keep the section structure from `DESIGN.md`.

Every page needs, in its `<head>`:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@500;600&display=swap">
<link rel="stylesheet" href="design/tokens.css">
<link rel="stylesheet" href="design/blocks.css">
```

and before `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"></script>
<script src="design/blocks.js"></script>
```

## Building with an AI tool (Claude, Cursor, Lovable, v0…)

Attach `DESIGN.md`, `tokens.css` and `blocks.css`, then use a prompt like:

> Build [page] using the Blocks design system. Follow every "Must" in DESIGN.md. Use only the classes in blocks.css and the tokens in tokens.css. Never set font sizes or colours by hand. Structure the page as full-width colour blocks, each opening with a small CAPS label on the left.

## Notes

- The original font (Suisse Int'l) is commercial; **Geist** is the free stand-in. If you license a font, change `--font`.
- The colours are the reference site's. For your own brand, change at least one of them so your site doesn't look like a copy.
- The sign-up form only validates and shows a message. Connect it to your email tool (Mailchimp, Brevo, ConvertKit…) in `blocks.js` before launch.
- Scroll effects use native CSS scroll timelines (Chrome, Edge, Safari 26+). Other browsers show the page without them.
