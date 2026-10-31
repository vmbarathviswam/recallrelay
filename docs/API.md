# HTTP API

All responses are JSON unless noted. Errors contain `error`, `message` and optionally PayPal `debugId`. POST bodies require `Content-Type: application/json`. Browser writes must be same-origin. Sandbox calls require `Authorization: Bearer <ADMIN_TOKEN>` or the configured Sites merchant identity. Replay uses the HttpOnly workspace cookie; keep a cookie jar across calls.

Base URL: `http://127.0.0.1:4173` locally. The public deployment is replay only.

| Method and route | Input / behavior |
|---|---|
| `GET /health` | Nonsecret mode/configuration and readiness for HTTP requests. It does not prove PayPal or Gemini connectivity. |
| `GET /api/config` | Payment mode, AI configured flag, model name, webhook configured flag. No credentials. |
| `GET /api/state` | Isolated workspace, cases, exact refund plans, operations, journal and metrics. |
| `POST /api/purchases` | `{ "key":"unique-stable-key", "mixed":true }`. Server selects catalog prices. Returns order and PayPal approval URL (sandbox) or explicit replay order. Stable key prevents duplicate application purchases. |
| `POST /api/purchases/:id/capture` | `{}` after buyer approval. Validates original PayPal order and capture. |
| `POST /api/claims` | `{ "orderId":"<application purchase id>", "sku":"NOVA-65" }`. Unique per order/item. |
| `POST /api/claims/:id/extract` | `{ "text":"optional transcription", "image":"base64 bytes", "mimeType":"image/jpeg" }`. Live Gemini, strict output schema, never verification. Image or text required. |
| `POST /api/claims/:id/sample` | `{ "ambiguous":false }`. Replay-only, clearly recorded sample evidence. |
| `POST /api/claims/:id/verify` | `{ "confirmed":true, "revision":1 }`. Merchant confirms original source against purchase. Never called by AI. |
| `POST /api/claims/:id/approve` | `{ "confirmed":true, "revision":1, "note":"Verified label and approved merchant remedy." }`. Creates expiring, single-use approval for the exact server plan. |
| `POST /api/claims/:id/execute` | `{}`. Atomically reserves and issues that approval. Replay may use `{ "loseResponse":true }` to demonstrate recovery; sandbox ignores fault injection. |
| `POST /api/claims/:id/reconcile` | `{}`. Reads provider records. Does not send a new refund. |
| `POST /api/notice/save` | `{ "source":"source notice text, at least 30 characters" }`. Invalidates campaign approval and pending case approvals. Refused while unresolved money operations exist. |
| `POST /api/notice/extract` | `{ "text":"exact saved source", "image":"optional base64", "mimeType":"application/pdf" }`. Source-grounded Gemini proposal. Quotes must match the saved text. |
| `POST /api/campaign/approve` | `{ "confirmed":true, "revision":1, "model":"N65", "serialPrefix":"N65-2408-", "remedy":"merchant-approved terms" }`. Constrained prototype campaign review; arbitrary regex rejected. |
| `POST /api/reconcile` | `{}`. Drains verified inbox and re-reads cases. |
| `POST /api/webhooks/paypal` | Raw provider event plus PayPal signature headers. Uses configured webhook ID and postback verification; forged requests return 403. No merchant token required. |
| `GET /api/audit/export` | JSON attachment of bounded operational journal. |
| `POST /api/demo/reset` | `{}`; resets this visitor's replay only. Sandbox refuses it. |
| `POST /api/demo/duplicate` | `{}`; attempts duplicate seeded claim, expected 409 in replay. |

## Important error codes

- `HUMAN_REQUIRED`, `VERIFY_REQUIRED`, `APPROVAL_REQUIRED`: cannot bypass merchant review.
- `STALE_EVIDENCE`, `STALE_APPROVAL`, `STALE_CAMPAIGN`, `APPROVAL_EXPIRED`: reread and review; never automatically reapprove.
- `DUPLICATE_CLAIM`, `CASE_LOCKED`: reuse the existing case and reconcile its operation.
- `INELIGIBLE`: plan is outside the automated refund route; inspect the reason.
- `AI_NOT_CONFIGURED`, `AI_UNAVAILABLE`, `INVALID_EXTRACTION`, `UNGROUNDED_NOTICE`: no pretend AI fallback.
- `FORGED_WEBHOOK`: notification rejected, no inbox/payment mutation.
- `CROSS_ORIGIN`, `MERCHANT_AUTH_REQUIRED`, `CONTENT_TYPE`: request authorization/format failure.
- `WORKSPACE_LIMIT`, `DEMO_LIMIT`, `RATE_LIMIT`: bounded demonstration resource use.

## External PayPal APIs

The adapter calls only `https://api-m.sandbox.paypal.com`:

```text
POST /v1/oauth2/token
POST /v2/checkout/orders
GET  /v2/checkout/orders/{id}
POST /v2/checkout/orders/{id}/capture
GET  /v2/payments/captures/{id}
POST /v2/payments/captures/{id}/refund
GET  /v2/payments/refunds/{id}
POST /v1/notifications/verify-webhook-signature
```

Each payment write uses its persisted `PayPal-Request-Id`. Refunds include the application's operation ID as `custom_id`, enabling correlation after an interrupted response. All currency, amount and status checks run in code.

Use the checked-in Postman collection for examples, assertions and cookie handling. Actual sandbox capture requires buyer approval on PayPal before the capture call; a collection cannot manufacture that consent.
