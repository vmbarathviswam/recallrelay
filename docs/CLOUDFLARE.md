# Deploy the full sandbox application

This deploys the real server handler with durable D1 storage. The GitHub Pages replay is a separate build and never receives these keys.

The full application is deployed at https://recallrelay-sandbox.recallrelay-vmbarathviswam.workers.dev/ with D1, server-side secrets and merchant authentication. A hosted purchase, live Gemini label/notice extraction, human-approved partial refund and genuine signed capture/refund notifications were verified. See [redacted evidence](evidence/hosted-verification.json). The steps below reproduce this deployment in the owner's account; template files alone are not deployment proof.

1. Run `npx wrangler login --device --scopes account:read user:read workers_scripts:write d1:write` and complete the authorization in your own browser. The script permission is needed for Worker code and its public subdomain. Device authorization avoids a short-lived localhost callback. Do not share OAuth tokens in chat.
2. Create a dedicated database with `npx wrangler d1 create recallrelay-sandbox`. Retain the actual database identifier returned by Cloudflare.
3. Copy `wrangler.example.jsonc` to ignored `wrangler.local.jsonc`. Replace its database identifier and HTTPS application origin with the real values for this account. Choose a new Worker name if that name already belongs to an unrelated application. Use the account's actual Workers subdomain, not an invented URL.
4. Run `npm run build`, then `npx wrangler d1 migrations apply DB --remote --config wrangler.local.jsonc`. This database must be dedicated to RecallRelay.
5. Upload only the required runtime secrets using `node --env-file=.env scripts/cloudflare-secrets.mjs`. This sends the values from the ignored `.env` directly to Cloudflare's secret store through stdin; it does not print or commit their values.
6. Publish with `npx wrangler deploy --config wrangler.local.jsonc`. Open the returned HTTPS URL. Verify `/api/config` reports sandbox mode, provider configuration and D1. The merchant workspace must return 401 without its admin bearer token.
7. Register the returned HTTPS origin plus `/api/webhooks/paypal` on the same PayPal sandbox app with `node --env-file=.env scripts/configure-paypal-webhook.mjs`. This stores the returned listener ID in the ignored local `.env`. Rerun the secret uploader and verify a real payment event. Do not confuse PayPal's mock simulator with a signed real transaction event.
8. Complete a buyer-approved purchase, source verification, explicit merchant remedy approval and partial refund on the hosted app. Reconcile the provider result and preserve redacted evidence. Recheck forged webhook rejection and unauthenticated workspace denial against the deployed URL.

Never set `MERCHANT_USER_ID` on this direct Cloudflare deployment: the Sites identity-header feature is specific to the Sites proxy. Use the admin bearer token here. No production PayPal mode is supported.

To transfer an existing sandbox case, obtain the owner's explicit permission for its transaction records, image and approval note first. `node --env-file=.env scripts/migrate-sandbox-to-d1.mjs` reads the local sandbox snapshot, refuses in-flight refunds and replay orders, invalidates unused approvals, and refuses to overwrite a hosted workspace that already has financial records. Credentials are excluded and the local original remains. Do not run a data transfer merely because hosting was authorized.

Keep the Worker, database and provider access available through December 15, 2026. Monitor the full server health and transaction flow separately from the public Pages replay. Confirm account quotas and plan terms before publishing; this guide does not guarantee future uptime.
