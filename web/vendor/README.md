# Vendored visual assets

These assets ship with the application; there is no CDN or added UI runtime dependency.

- `lucide-icons.json`: 36 SVGs from [Lucide 0.468.0](https://github.com/lucide-icons/lucide/tree/0.468.0/icons). ISC license, retained in `LUCIDE-LICENSE`. SVG markup is bundled locally and decorative icons are hidden from assistive technology.
- `spotlight-card.css`: original [React Bits SpotlightCard stylesheet](https://github.com/DavidHDev/react-bits/blob/5da2b94789dc3f4d53ff6716606ceaa3bd1edb90/src/content/Components/SpotlightCard/SpotlightCard.css), pinned to commit `5da2b94789dc3f4d53ff6716606ceaa3bd1edb90` (2025-05-31). MIT license, retained in `REACT-BITS-LICENSE` from that same commit. The radial pointer light is adapted in `../style.css` and `../premium.mjs`; this file preserves its source provenance.

React Bits' current main branch had a different, restrictive license when checked on 2026-10-31. This project uses the pinned MIT version above, not the current component or its license. No paid or restricted component source is included.

Aceternity, MagicUI, Framekit and Enchantr were design references for the original CSS/SVG patterns, not imported React packages. See `docs/UI-DESIGN.md` for the catalog review and dependency decision.
