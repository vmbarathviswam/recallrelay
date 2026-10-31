# Visual product redesign — October 31, 2026

The document-like layout has been replaced with a sidebar application shell, a dimensional animated hero, icon-based metric cards, real-state donut and exposure charts, custom AG Grid customer/status/amount cells, and a connected seven-node workflow with illustrated mini-previews. Light and dark modes share semantic color tokens. No provider, database, or domain logic changed.

Evidence review is now a two-column workspace. The actual uploaded image is the main surface, with extracted model and serial cards alongside the image boundary. Extraction does not obscure, distort, or fabricate source pixels. Recorded replay labels are explicitly illustrative; an absent source image gets an illustrated upload state. Refunds use an itemized receipt, the existing merchant verification and approval controls, a new native confirmation dialog showing the approved plan amount, and a provider-status result card. Only a completed operation gets the animated success check.

The earlier palakonweb.in research informed typography and spacing. This pass prioritizes visual product components over the earlier editorial layout. Long explanations are disclosed through details panels; payment safeguards and test/replay labels remain visible. Financial amounts stay exact and static rather than counting through misleading intermediate values.

## Source ownership

36 Lucide SVG icons are vendored from release 0.468.0 (ISC). The pointer-light treatment is adapted from React Bits SpotlightCard at MIT-licensed commit `5da2b94789dc3f4d53ff6716606ceaa3bd1edb90`. Current React Bits main had a more restrictive license; its source was not used. Both pinned licenses and original CSS are retained in [web/vendor](../web/vendor/README.md). All other glass, ambient-orb, beam, preview, chart and motion patterns are original native CSS/SVG/JavaScript implementations informed by the catalog research below. No new runtime UI packages were added.

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

Accordingly, `web/visuals.mjs`, `web/premium.mjs` and `web/style.css` implement the selected patterns natively, with the pinned SpotlightCard adaptation and Lucide assets described above. They are **not installed React versions of those libraries**. No shadcn initialization, React migration, Base UI package, paid component, third-party animation runtime, CDN, font request or WebGL was added. The project MIT license covers original implementation; vendored notices retain their upstream terms. This is an intentional deviation from the Base UI/CLI request to preserve the stricter dependency and UI-only constraints.

## Interaction and accessibility

- All seven workflow cards are keyboard-operable buttons navigating to existing workspaces. Navigation only; no financial operation or evidence verification is triggered.
- Appearance toggles light/dark colors, including AG Grid, and persists only the theme locally. Provider credentials remain in existing page memory.
- Native dialogs preserve modal focus trapping and Escape. Closing restores the opener, or the cases navigation if a render replaced it. Evidence updates preserve focus on the current control. Refund confirmation defaults focus to cancel; cancel does not call the payment API.
- Native selects retain platform keyboard behavior. Search focus has a visible outline. Active navigation exposes `aria-current` and icon-only mobile controls retain accessible names.
- Toasts stack up to three, announce through the existing live region, allow dismissal, and pause expiry on hover/focus. A manual native popover keeps them visible above modal dialogs without stealing focus.
- Reduced-motion styles show all reveal content immediately, disable decorative transitions, and suppress JS press/spotlight motion. An additional pause button stops decorative motion. Reduced transparency and forced-colors fallbacks are included.
- Amounts are never count-up animations. Uncertainty, approval gates and simulated/live indicators retain their existing meaning.

## Performance and scope

No heavy animation modules exist to lazy-load. One delegated pointer handler schedules at most one measurement/write per frame. ResizeObserver measures workflow connections only when their layout changes. IntersectionObserver reveals cards on approach. Observers disconnect before each rerender. CSS handles ambient motion and feedback; there is no continuous JavaScript animation loop. SVG dash offsets animate only decorative connections. The existing backend, database, provider adapters and domain rules are unchanged.

## Validation

- 142 tests pass, including five new visual safety checks: empty chart honesty, reconciliation versus completion, hostile text escaping, absent-source handling, and exact approved-plan amount in confirmation.
- Both the browser replay and Worker builds succeed; ESM artifact validation and all 12 deterministic matching cases pass.
- Browser checked: light/dark appearance, seven connected nodes, search, mobile containment at 390px, icon navigation, ambiguous label with disabled approval, native dialog dismissal, cancel restoring focus, and an isolated replay verification → approval → confirmation → completed $59 refund.
- Motion pause was checked against computed animation state. Reduced-motion, reduced-transparency and forced-colors styles are present; this is not a full assistive-technology certification or a measured 60fps guarantee.
- Hosted cases and payment records remain preserved; UI verification does not require another real provider transaction.
