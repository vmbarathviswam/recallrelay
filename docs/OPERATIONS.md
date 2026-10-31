# Judging and submission operations

All planning dates below use Asia/Kolkata unless explicitly marked Pacific. The submission deadline is November 13, 2026, 1:30 a.m. IST (November 12, noon PST). The early-review request says submit by November 5; target **November 4 IST** to avoid ambiguity. Judging ends December 15, 9:30 p.m. IST.

| Date | Reserved work |
|---|---|
| October 31 | Prototype implementation, automated guardrails, source repository and hosted replay. |
| November 1–2 | Configure sandbox and Gemini, complete real buyer capture/partial refund, run live image evaluation, record sanitized provider evidence. |
| November 3 | Test from a clean clone and separate browser; review API collection, accessibility and deployment isolation. |
| November 4 | Prepare first public YouTube video and Devpost submission; request early eligibility review ahead of November 5. |
| November 5–8 | Reserved for organizer feedback, provider differences and observed defects. Add regression tests for any fix. |
| November 9–10 | Final video, README and tool-usage review; verify all public URLs and license detection. |
| November 11 | Freeze a tagged submission build, back up database and release archive, test the exact submission. |
| November 12 | Contingency only; verify submission before noon PST. |
| Through December 15 | Keep source, demo, provider access and database available; review health workflow failures. No post-deadline substantive submission changes without organizer permission. |

## Availability plan

The hosted replay uses bundled browser assets and AG Grid Community. It does not depend on a 14/45-day sponsor trial, an external model quota, a developer laptop, or third-party CDN scripts. D1 stores replay state durably. The public repository also provides an independent local run path.

Retain the hosting account and deployment through judging. Do not delete the Site, database, repository or release. The checked-in GitHub Actions availability workflow requests `/health` daily until the day after judging; inspect failed runs. This is a health check, not a self-healing service or uptime guarantee. Verify the actual browser flow after any platform change.

Keep real sandbox operations on a separate, authenticated configuration. Renew server access tokens automatically using returned expiry; do not distribute expiring access tokens to judges. Maintain merchant credentials, buyer test access and AI quota if the judged live build depends on them. Never place shared secret keys in the public README. Provide access instructions or a hosted authenticated judge workspace.

## Incident runbook

1. Check `/health` and the browser mode banner. An HTTP 200 proves availability only, not payment-provider connectivity.
2. If the UI fails, test a clean clone with `npm ci`, build, test and start. Preserve the submitted release before changing anything.
3. If PayPal times out, inspect the durable operation. `UNKNOWN`/`SUBMITTING` must stay locked. Reconcile using the original order and operation identifier. Do not create a second refund to “fix” a missing response.
4. If Gemini fails, show the explicit extraction error. Use the labelled replay only for demonstration; do not silently present recorded evidence as live AI.
5. If a webhook worker fails, retain its inbox record. Run authenticated reconciliation; failures remain queued for retry. Inspect repeated failures before further financial actions.
6. Back up the SQLite file while stopped, or use database-supported backup tools. For D1, use the hosting platform's database export/backup facility. Never commit a financial database to Git.

## Submission checklist

- [ ] Real PayPal sandbox mixed purchase and $59 partial refund verified.
- [ ] Real Gemini image and notice extraction observed; difficult cases and abstentions documented.
- [ ] Sanitized sandbox evidence reviewed and attached/documented.
- [ ] Public repository contains all source, generated schema, sample assets, lockfile and root MIT license.
- [ ] Fresh-clone instructions and Postman collection verified.
- [ ] Public YouTube video under three minutes added to Devpost.
- [ ] Public/authorized hosted demo accessible to judges without our developer session.
- [ ] PayPal, Gemini and AG Grid usage accurately listed in “Built With.”
- [ ] Existing-project progress and AI assistance disclosed accurately.
- [ ] November 5 early-review target met; November 12 deadline contingency retained.
- [ ] Hosting, database and access retained through December 15.

The checklist is intentionally not prechecked for external actions that have not happened. Preparing files is not submitting to Devpost or uploading a video.
