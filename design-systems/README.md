# Design systems

Reusable design systems measured from real websites with MotionScope. Each folder has the same structure:
`DESIGN.md` (rules), `tokens.css`, a components stylesheet, a small script, `tokens.json` (Figma), `components.html` (reference page) and `templates/landing.html` (starter page).

| Folder | Source | Look |
|---|---|---|
| `blocks/` | warmnfuzzy.tv | Black page of full-width colour blocks, CAPS label left + giant type right, fluid scale, editorial motion |
| `spotlight-nextstopcomedy/` | nextstopcomedy.com | Black + neon cyan, condensed Anton CAPS headlines, glowing teal event cards, blurred photo bands |
| `marquee-livenation/` | livenation.com.au | Dense ticketing layout: charcoal cards on black, red buttons and chevrons, bold Noto Sans, hero carousel |
| `headliner/` | **Combination** | Live Nation colour + Noto Sans, warmnfuzzy layout / type sizes / spacing / scroll, Next Stop Comedy cards in red |
| `encore/` | **Combination** | Headliner remix with the **Live Nation layout** (centred page, hero carousel, card grids, rows, video, banner, 5-column footer); warmnfuzzy type and scroll; Next Stop Comedy cards |

To start a project: copy a folder, open its `README.md`, and build from `templates/landing.html`.
