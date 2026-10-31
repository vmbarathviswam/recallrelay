# Security, privacy and limits

## Authority

Only the merchant approves a campaign or refund. In replay, the visitor plays that role using synthetic data. In sandbox, all workspace actions require the configured admin token, or a Sites-injected identity exactly equal to `MERCHANT_USER_ID`. No admin token is stored in localStorage, URLs, logs or source. The local server strips platform identity headers. Do not expose the server directly to untrusted proxies that can manufacture trusted identity metadata.

The UI asks the merchant to inspect source evidence, record a remedy reason, then execute a separately approved amount. The model cannot set `humanVerified`, approve legal entitlement, choose a refund amount or call a financial tool. It receives evidence only. This separation limits the consequence of prompt injection even when extraction is misleading.

## Money and external state

- Server-defined prices, item allocations, capture identifiers and operation IDs.
- USD only, integer cents, conservative 180-day boundary, explicit unsupported/manual states.
- Prior attributed refunds reduce eligibility; unknown external refunds block.
- Durable capture reservation and stable request ID before the external write.
- Uncertain writes never become automatic fresh refunds. Pending is not completed.
- Sandbox-only hard-coded origin; no arbitrary endpoint or production mode.
- Provider error messages exposed to users are reduced to error codes and debug identifiers; no secrets or raw payment payloads are logged.

The prototype blocks a **known** dispute flag and routes associated mismatches manually. Verified dispute notifications link `seller_transaction_id` to the capture, set a hold and invalidate existing approvals; later notifications never automatically clear it. It does not claim a complete historical Disputes API ingestion service. Register relevant dispute notifications and add historical dispute ingestion before operating a real recall program. PayPal may refuse refunds for additional account, funding, dispute or instrument constraints; those negative responses do not bypass approval.

## HTTP and uploads

Same-origin writes require JSON; mismatched Origin and cross-site Fetch Metadata are refused. Public replay uses an unguessable HttpOnly, SameSite=Strict workspace cookie. Mutations are limited per workspace to 60/minute. Request bodies are bounded at 3 MB, original uploads at 2 MB, and retained label images at 180 KB. MIME and magic-byte checks reject SVG/script uploads and obvious type mismatches. Do not treat these checks as malware scanning.

Images are downsampled by the browser; transcripts and a thumbnail can persist in the workspace. PDF originals are sent to Gemini but not retained in the aggregate. The merchant must keep the original available for review. Evidence can contain confidential information: use synthetic data for the public demo and obtain appropriate consent before any real deployment.

Source text is escaped before rendering; grid renderers use textContent. The browser bundle contains no runtime secrets. The page uses a self-only content policy except inline styles needed by the grid. There is no arbitrary HTML or remote document URL fetch endpoint.

## Webhooks

Unsigned/failed signatures are refused. The verifier requires the configured webhook ID and expected PayPal certificate hosts, then asks the sandbox verification API to validate. A verified event is inserted durably before HTTP 200. The inbox deduplicates event IDs and reconciliation obtains amounts/statuses from PayPal. Unrelated events are journaled as ignored. Worker background failures remain pending for the next explicit reconciliation.

There is no scheduled worker in this prototype. Merchant reconciliation drains the inbox; add a durable queue/cron for unattended operations. A valid provider signature is authentication of a notification, not authorization to invent a refund.

## Deployment

The public Pages build executes domain rules in the browser and stores only synthetic data in IndexedDB. Anyone can modify their own browser state; its approval/audit controls are illustrative, not a security boundary. No provider secrets or live payment calls exist in that build. Use the authenticated server application for live sandbox verification.

The hosted public demo stays in replay with fictional data. Never switch that shared audience to real merchant operations without authenticated merchant authorization, isolation, retention controls and a separate credential configuration. Do not publish `.env`, database files, uploaded evidence, admin tokens, API keys, buyer passwords or raw account data. Keep credentials in the hosting secret manager and redeploy after changes.

The operational journal is bounded and not cryptographically tamper-proof. Database administrators can modify records. No fraud-detection guarantee, certified product-safety assessment, legal advice, full tenant IAM, incident response service or production compliance claim is made.
