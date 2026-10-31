# Verification and submission readiness

This file distinguishes implemented behavior from external proof. Do not convert a replay result into a live-integration claim.

| Requirement | Implementation / verification |
|---|---|
| Working prototype | Node/SQLite local app, Worker/D1 hosting adapter, and public browser/IndexedDB replay on GitHub Pages. Sites internet publishing is disabled for this workspace. |
| PayPal purchases/refunds | Real sandbox $77 capture and merchant-approved $59 partial refund completed and reconciled. The $18 cable remains paid. Signed webhook delivery still needs hosted verification. |
| Meaningful AI | Real Gemini image extraction and source-grounded notice extraction verified with Flash-Lite. Exact matching and refund arithmetic remain code-only. |
| Human authority | Separate source verification, merchant reason/confirmation, expiring approval and persisted refund reservation. |
| Substantive AG Grid | Response and audit grids, custom customer/status renderers, filtering/sorting, keyboard review, linked exposure widgets and completion dashboard. No AG Studio claim. |
| Automated tests | 132 passing domain, API, service, AI validation and persistence tests, plus 12 deterministic matching regression cases. Provider transports are test doubles unless explicitly live. See [validation](VALIDATION.md). |
| Edge-case demo | Labelled replay covers mixed-item refund, ambiguity, old payment, duplicate claim, uncertain response recovery and forged webhook rejection. |
| Real sandbox proof | On October 31, buyer approved the purchase, PayPal captured $77, the human merchant verified evidence and recorded $59 approval, then the app issued and reconciled a COMPLETED $59 refund. See [redacted verification](evidence/live-verification.json). |
| Real model proof | Live image extraction read N65 / N65-2408-8001 for the captured case. All three live synthetic-image regression checks passed, including null serial/abstention for an unclear label. Live notice extraction returned three source-grounded quotations. See [actual evaluation](evidence/live-ai-evaluation.json). |
| Public source/license | [Public GitHub repository](https://github.com/vmbarathviswam/recallrelay) pushed; GitHub reports public visibility and detected MIT license. |
| Demo video | Six-scenario 2:45 script and shot list prepared. A recorded public YouTube URL is a remaining submission task. |
| Judging availability | Static-hosted replay with browser-local persistence and clean local server run path, no trial-only dependency; operations calendar and daily health workflow through judging. Future account availability must be maintained. |

The full-server [Cloudflare deployment path](CLOUDFLARE.md) is prepared. Hosting authorization, actual deployment, signed webhook delivery, hosted live-provider verification and the recorded submission video still need completion. The local app now has real provider proof; the public Pages URL remains a labelled replay until the full server is deployed.

## Proof standards

- Unit tests prove application invariants under controlled inputs.
- Recorded sample extraction is not a model call.
- Replay purchase/refund IDs are prefixed `REPLAY`; they are not PayPal evidence.
- A created PayPal order is not an approved or captured payment.
- A refund request is not a completed refund. Only verified provider status counts.
- A genuine sandbox refund demonstrates integration, not production approval or a guaranteed remedy.
- A scripted lost-response scenario demonstrates application recovery; a live fault-injection exercise is separate.
- A public repository is not a submitted hackathon entry. Registration, eligibility declarations and final submission must also be completed.
