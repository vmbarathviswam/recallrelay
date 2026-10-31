# Verification and submission readiness

This file distinguishes implemented behavior from external proof. Do not convert a replay result into a live-integration claim.

| Requirement | Implementation / verification |
|---|---|
| Working prototype | Node/SQLite local app, Worker/D1 hosting adapter, and public browser/IndexedDB replay on GitHub Pages. Sites internet publishing is disabled for this workspace. |
| PayPal purchases/refunds | Sandbox-only REST adapter, server pricing, buyer approval URL, capture, partial refund, status reads and signature verification implemented. Live credential verification remains required. |
| Meaningful AI | Gemini multimodal label and notice extraction with structured validation and quotation grounding implemented. Live API execution requires a Gemini key. |
| Human authority | Separate source verification, merchant reason/confirmation, expiring approval and persisted refund reservation. |
| Substantive AG Grid | Response and audit grids, custom customer/status renderers, filtering/sorting, keyboard review, linked exposure widgets and completion dashboard. No AG Studio claim. |
| Automated tests | 131 passing domain, API, service, AI validation and persistence tests, plus 12 deterministic matching regression cases. Provider transports are test doubles unless explicitly live. See [validation](VALIDATION.md). |
| Edge-case demo | Labelled replay covers mixed-item refund, ambiguity, old payment, duplicate claim, uncertain response recovery and forged webhook rejection. |
| Real sandbox proof | NOT YET VERIFIED at implementation time: no PayPal client credentials/buyer account supplied in the session. Run `verify:sandbox` and record actual identifiers after setup. |
| Real model proof | NOT YET VERIFIED at implementation time: no Gemini API key supplied in the session. Run live extraction and `npm run eval -- --live`. |
| Public source/license | [Public GitHub repository](https://github.com/vmbarathviswam/recallrelay) pushed; GitHub reports public visibility and detected MIT license. |
| Demo video | Six-scenario 2:45 script and shot list prepared. A recorded public YouTube URL is a remaining submission task. |
| Judging availability | Static-hosted replay with browser-local persistence and clean local server run path, no trial-only dependency; operations calendar and daily health workflow through judging. Future account availability must be maintained. |

## Proof standards

- Unit tests prove application invariants under controlled inputs.
- Recorded sample extraction is not a model call.
- Replay purchase/refund IDs are prefixed `REPLAY`; they are not PayPal evidence.
- A created PayPal order is not an approved or captured payment.
- A refund request is not a completed refund. Only verified provider status counts.
- A genuine sandbox refund demonstrates integration, not production approval or a guaranteed remedy.
- A scripted lost-response scenario demonstrates application recovery; a live fault-injection exercise is separate.
- A public repository is not a submitted hackathon entry. Registration, eligibility declarations and final submission must also be completed.
