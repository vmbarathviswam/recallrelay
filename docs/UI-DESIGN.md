# Interface upgrade — October 31, 2026

## Editorial refinement

The subsequent design pass reviewed [palakonweb.in](https://palakonweb.in/) in a live browser, including its typography and actual rendered layout. The reference combines an off-white canvas, narrow content framing, generous space, fine dividers, neutral pill controls and restrained accent details. Its display headings use Instrument Serif; RecallRelay deliberately retains a modern system sans-serif for the requested SaaS type scale rather than copying the portfolio's assets or identity.

RecallRelay now uses a horizontal navigation bar, warm neutrals with one emerald accent, lighter metrics, and a working queue before the seven-step showcase. Hover/press/reveal transitions are 260–280ms. Notice extraction is shown as labeled fields and quotations. The activity journal shows readable summaries with expandable details; its complete JSON download remains available. Payment request identifiers are also expandable. Test-payment and replay disclosures remain explicit.

The React Bits Spotlight Card, Aceternity catalog and Framekit Product UI catalog were rechecked for this pass. The dependency/CLI constraint described below still applies: this remains a native frontend with locally owned implementations, not an installed React component library.

Validation after refinement: 137 tests pass, including four presentation checks for escaping hostile AI content, preserving zero/false values, quotations and missing fields. No payment, AI, database or business-rule source files changed.

The visual layer uses emerald glass, quiet gradients, consistent rounded surfaces and a seven-step interactive workflow. Financial values remain static and readable. Workflow previews are illustrative navigation, not transaction progress or automatic approval.

## Catalog research and selection

All six catalogs were reviewed. Component counts and free/pro availability change; do not assume every advertised component is open source.

| Reference | Reviewed patterns | Decision |
|---|---|---|
| [React Bits Spotlight Card](https://reactbits.dev/components/spotlight-card), [installation](https://reactbits.dev/get-started/installation) | Pointer-following radial illumination; source variants for JS/TS and CSS/Tailwind | Local pointer spotlight for workflow and metric cards; one frame-scheduled update, no pointer-following text. |
| [Aceternity catalog](https://ui.aceternity.com/components), [Glowing Effect](https://ui.aceternity.com/components/glowing-effect) | Border light, 3D cards, liquid glass, aurora, background gradients | Native CSS layered glass and gradients. Avoid shader-based glass and distortion of product evidence. |
| [MagicUI Animated Beam](https://magicui.design/docs/components/animated-beam), [installation](https://magicui.design/docs/installation) | Measured connections between nodes; animated light paths; animated lists | Repo-owned SVG connections sized on layout changes; short staggered feed entrances. |
| [Framekit Product UI](https://www.framekitui.live/docs/category/product-ui) | Glass controls, dynamic status, sortable tables, deployment timeline, feedback panels | Press/rebound feedback, clear work-in-progress feedback and status-aware table treatment. Retain substantive AG Grid functionality. |
| [Enchantr catalog and install section](https://enchantr.dev/#install) | Inspected catalog and Animated Beam JSX code panel in browser: gradient SVG paths, source delivery, orb field, liquid glass, toast | Lightweight CSS ambient gradient and SVG beam pattern. Aurora and several spotlight examples are marked Pro in the catalog; no premium source copied. |
| [Wensity primitives](https://ui.wensity.com/docs/primitives), [theming](https://ui.wensity.com/docs/theming) | Semantic tokens, source ownership, Base UI accessibility, theme layers | Shared semantic color tokens; retain native dialog/select/input semantics and explicit focus restoration. |

### Dependency constraint

This application is native JavaScript, not React. The requested no-new-runtime-dependencies rule conflicts with directly installing React/Base UI/Motion components: Wensity explicitly documents those as normal npm dependencies even when its own wrapper is copied as source. React Bits also requires its listed dependencies after copying.

Accordingly, `web/premium.mjs` and the glass system in `web/style.css` are original native implementations of selected visual patterns, **not installed versions of those React libraries**. No shadcn initialization, React migration, Base UI package, paid component, third-party animation runtime, CDN, font request or WebGL was added. The project MIT license covers the original implementation. This is an intentional deviation from the Base UI/CLI request to preserve the stricter dependency and UI-only constraints.

## Interaction and accessibility

- All seven workflow cards are keyboard-operable buttons navigating to existing workspaces. Navigation only; no financial operation or evidence verification is triggered.
- Appearance toggles light/dark colors, including AG Grid, and persists only the theme locally. Provider credentials remain in existing page memory.
- Native dialogs preserve modal focus trapping and Escape. Closing restores the opener, or the cases navigation if a render replaced it.
- Native selects retain platform keyboard behavior. Search focus has a visible outline. Active navigation exposes `aria-current` and icon-only mobile controls retain accessible names.
- Toasts stack up to three, announce through the existing live region, allow dismissal, and pause expiry on hover/focus.
- Reduced-motion styles show all reveal content immediately, disable decorative transitions, and suppress JS press/spotlight motion. An additional pause button stops decorative motion. Reduced transparency and forced-colors fallbacks are included.
- Amounts are never count-up animations. Uncertainty, approval gates and simulated/live indicators retain their existing meaning.

## Performance and scope

No heavy animation modules exist to lazy-load. One delegated pointer handler schedules at most one measurement/write per frame. ResizeObserver measures workflow connections only when their layout changes. IntersectionObserver reveals cards on approach. Observers disconnect before each rerender. CSS handles ambient motion and feedback; there is no continuous JavaScript animation loop. SVG dash offsets animate only decorative connections. The existing backend, database, provider adapters and domain rules are unchanged.

## Validation

- 133 existing tests pass; both browser replay and full Worker builds succeed; Worker artifact validation passes.
- Browser checked: theme switching, workflow navigation, case search, ambiguous-label drawer with disabled approval, Escape dismissal with restored focus, and 390px mobile layout.
- This is focused browser verification, not a full screen-reader certification or a measured 60fps guarantee.
