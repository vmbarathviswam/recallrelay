import { DomainError, insist, uid, findClaim, newClaim, setEvidence, journal, summarize, normalize } from './domain.mjs';
import { seed } from './seed.mjs';
import { mutate, D1Repository } from './store.mjs';
import { PayPal } from './paypal.mjs';
import { Service } from './service.mjs';
import { extractLabel, extractNotice } from './ai.mjs';

const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const parseCookie = (request, name) => request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1);
export async function secretEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const h = async x => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)));
  const [x,y] = await Promise.all([h(a),h(b)]); let different = 0; for (let i = 0; i < x.length; i++) different |= x[i] ^ y[i]; return different === 0;
}
export function configuration(env) {
  const mode = env.PAYPAL_MODE || 'replay';
  insist(['replay','sandbox'].includes(mode), 'LIVE_MODE_REFUSED', 'Only replay and PayPal sandbox are supported.', 503);
  insist(mode !== 'sandbox' || env.ADMIN_TOKEN?.length >= 32, 'ADMIN_NOT_CONFIGURED', 'Sandbox requires a strong merchant admin secret.', 503);
  return { mode, ai: !!env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite', paypalConfigured: !!env.PAYPAL_CLIENT_ID && !!env.PAYPAL_CLIENT_SECRET, webhookConfigured: !!env.PAYPAL_WEBHOOK_ID, judgingThrough: '2026-12-15', database: env.DB ? 'D1' : 'SQLite/local adapter' };
}
async function merchantAllowed(req, env) {
  // Platform headers are accepted only on hosted deployments; the local server strips them.
  if (env.DB && env.MERCHANT_USER_ID && req.headers.get('oai-authenticated-user-id') === env.MERCHANT_USER_ID) return true;
  return secretEqual(req.headers.get('authorization')?.replace(/^Bearer /,''), env.ADMIN_TOKEN);
}
async function body(req) {
  insist(Number(req.headers.get('content-length') || 0) <= 3000000, 'BODY_TOO_LARGE', 'Request exceeds 3 MB.', 413);
  const t = await req.text(); insist(t.length <= 3000000, 'BODY_TOO_LARGE', 'Request exceeds 3 MB.', 413);
  try { const x = JSON.parse(t); insist(x && typeof x === 'object' && !Array.isArray(x), 'INVALID_JSON', 'Expected a JSON object.', 400); return x; } catch (e) { if (e instanceof DomainError) throw e; throw new DomainError('INVALID_JSON', 'Expected a JSON object.', 400); }
}
function sameOrigin(req, url) {
  const origin = req.headers.get('origin');
  insist(!origin || origin === url.origin, 'CROSS_ORIGIN', 'Cross-origin actions are refused.', 403);
  insist(req.headers.get('sec-fetch-site') !== 'cross-site', 'CROSS_ORIGIN', 'Cross-site actions are refused.', 403);
  insist(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() === 'application/json', 'CONTENT_TYPE', 'Use application/json.', 415);
}
export async function drainWebhooks(repo, paypal, now = Date.now) {
  const row = await repo.read('merchant-sandbox'); if (!row) return;
  const service = new Service(repo, 'merchant-sandbox', paypal, 'sandbox', now);
  for (const event of await repo.pending()) {
    const state = await service.state(), e = event.payload;
    const capture = e.resource?.supplementary_data?.related_ids?.capture_id || e.resource?.id;
    const orderId = e.resource?.supplementary_data?.related_ids?.order_id;
    const disputed = e.event_type?.startsWith('CUSTOMER.DISPUTE.') ? e.resource?.disputed_transactions?.map(t => t.seller_transaction_id) || [] : [];
    const relevant = state.orders.filter(o => o.captureId === capture || o.paypalOrderId === orderId || disputed.includes(o.captureId) || state.operations.some(op => op.orderId === o.id && (op.refundId === e.resource?.id || op.id === e.resource?.custom_id)));
    // A verified dispute notification puts the capture on hold. Resolution never
    // silently releases this hold: a merchant must handle it outside this prototype.
    if (disputed.length) await service.update(s => { for (const o of s.orders.filter(o => disputed.includes(o.captureId))) { o.openDispute = true; s.claims.filter(c => c.orderId === o.id).forEach(c => c.approval = null); } });
    for (const order of relevant) await service.refreshCapture(order.id);
    await service.update(s => { if (!s.audit.some(x => x.details?.eventId === e.id)) journal(s, relevant.length ? 'webhook.reconciled' : 'webhook.ignored', { eventId: e.id, type: e.event_type, related: relevant.length }, now()); });
    await repo.finish(event.id);
  }
}
export function createHandler({ repository, assets = {}, transport = fetch, now = () => Date.now() } = {}) {
  return async function handle(req, env = {}, ctx = {}) {
    let response, cookie;
    try {
      const url = new URL(req.url), config = configuration(env);
      const repo = repository || new D1Repository(env.DB);
      if (url.pathname === '/health') return json({ status: 'ok', ...config });
      if (url.pathname === '/api/config') return json(config);
      if (!url.pathname.startsWith('/api/')) {
        const file = url.pathname === '/' ? '/index.html' : url.pathname;
        const asset = assets[file];
        if (!asset) return new Response('Not found', { status: 404 });
        return new Response(asset.body, { headers: { 'Content-Type': asset.type, 'Cache-Control': 'no-cache', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com; base-uri 'none'; form-action 'self'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
      }
      const pp = new PayPal(env, transport);
      if (url.pathname === '/api/webhooks/paypal') {
        insist(req.method === 'POST', 'METHOD', 'POST required.', 405);
        const event = await body(req);
        insist(typeof event.id === 'string' && event.id.length <= 100 && typeof event.event_type === 'string', 'INVALID_WEBHOOK', 'Malformed webhook event.', 400);
        insist(config.mode === 'sandbox' && await pp.verifyWebhook(req.headers, event), 'FORGED_WEBHOOK', 'Webhook signature was not verified. No state changed.', 403);
        await repo.enqueue(event.id, event);
        if (ctx.waitUntil) ctx.waitUntil(drainWebhooks(repo, pp, now).catch(() => {}));
        return json({ accepted: true, eventId: event.id });
      }
      if (config.mode === 'sandbox') insist(await merchantAllowed(req, env), 'MERCHANT_AUTH_REQUIRED', 'Merchant authentication is required for this sandbox workspace.', 401);
      let workspace = config.mode === 'sandbox' ? 'merchant-sandbox' : parseCookie(req, 'rr_workspace');
      if (!workspace || !/^[a-f0-9-]{36}$/.test(workspace) && config.mode === 'replay') { workspace = uid(); cookie = 'rr_workspace=' + workspace + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=5184000' + (url.protocol === 'https:' ? '; Secure' : ''); }
      await repo.insert(workspace, seed(now(), config.mode));
      const service = new Service(repo, workspace, pp, config.mode, now);
      if (req.method === 'GET' && url.pathname === '/api/state') response = json({ ...summarize(await service.state(), now()), config, serverTime: now() });
      else if (req.method === 'GET' && url.pathname === '/api/audit/export') response = new Response(JSON.stringify((await service.state()).audit, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="recallrelay-audit.json"', 'Cache-Control': 'no-store' } });
      else {
        insist(req.method === 'POST', 'NOT_FOUND', 'Route not found.', 404); sameOrigin(req, url);
        const input = await body(req);
        await service.update(s => { const minute = Math.floor(now()/60000); if (s.rate.minute !== minute) s.rate = { minute, count: 0 }; insist(s.rate.count++ < 60, 'RATE_LIMIT', 'Too many actions. Try again in one minute.', 429); });
        const claimRoute = url.pathname.match(/^\/api\/claims\/([^/]+)\/(extract|sample|verify|approve|execute|reconcile)$/);
        if (claimRoute) {
          const [, id, action] = claimRoute;
          if (action === 'extract') {
            const evidence = await extractLabel(env, input, transport);
            response = json(await service.update(s => setEvidence(s, id, evidence, now())));
          } else if (action === 'sample') {
            insist(config.mode === 'replay', 'FIXTURE_REFUSED', 'Sample evidence is available only in replay mode.', 403);
            response = json(await service.update(s => { const c = findClaim(s,id), o = s.orders.find(x => x.id === c.orderId), item = o.items.find(x => x.sku === c.sku); return setEvidence(s,id,{ model: item.model, serial: input.ambiguous ? null : item.serial, ambiguous: !!input.ambiguous, confidence: input.ambiguous ? .44 : .99, sourceText: 'MODEL ' + item.model + ' / SERIAL ' + (input.ambiguous ? '[unreadable]' : item.serial), mode: 'recorded fixture', image: null },now()); }));
          } else if (action === 'verify') response = json(await service.update(s => { const c = findClaim(s,id); insist(input.confirmed === true && input.revision === c.evidenceRevision && c.evidence, 'VERIFY_REQUIRED', 'Confirm the source evidence and current revision.', 400); insist(!s.operations.some(x => x.claimId === id && ['SUBMITTING','UNKNOWN','PENDING','COMPLETED'].includes(x.status)), 'CASE_LOCKED', 'A financial operation exists.'); c.evidence.humanVerified = true; c.approval = null; journal(s,'evidence.human_verified',{ actor:'merchant', claimId:id, revision:c.evidenceRevision },now()); return c; }));
          else if (action === 'approve') response = json(await service.approve(id,input));
          else if (action === 'execute') response = json(await service.execute(id,{ loseResponse: config.mode === 'replay' && input.loseResponse === true }));
          else response = json(await service.reconcile(id));
        } else if (url.pathname === '/api/claims') response = json(await service.update(s => newClaim(s,input,now())),201);
        else if (url.pathname === '/api/purchases') {
          insist(typeof input.key === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(input.key) && typeof input.mixed === 'boolean', 'PURCHASE_INPUT', 'Provide a stable purchase key and mixed boolean.',400);
          response = json(await service.createPurchase(input.key,input.mixed),201);
        } else if (/^\/api\/purchases\/[^/]+\/capture$/.test(url.pathname)) response = json(await service.capturePurchase(url.pathname.split('/')[3]));
        else if (url.pathname === '/api/notice/extract') {
          const source = (await service.state()).campaign.source;
          insist(input.text === source, 'NOTICE_NOT_SAVED', 'Save the notice before extraction so the source and campaign remain aligned.');
          const extracted = await extractNotice(env,input,transport);
          response = json(await service.update(s => { insist(s.campaign.source === source,'STALE_NOTICE','The notice changed during extraction. Run it again.'); s.campaign.extracted = extracted; journal(s,'notice.extracted',{ mode:'Gemini', groundedQuotes:extracted.quotes.length },now()); return extracted; }));
        }
        else if (url.pathname === '/api/notice/save') {
          insist(typeof input.source === 'string' && input.source.length >= 30 && input.source.length <= 16000, 'INVALID_NOTICE', 'Notice text is required.',400);
          response = json(await service.update(s => { insist(!s.operations.some(x => ['SUBMITTING','UNKNOWN','PENDING'].includes(x.status)), 'PAYMENT_PENDING', 'Resolve financial operations before changing campaign terms.'); s.campaign.source = input.source; s.campaign.extracted = null; s.campaign.approved = false; s.campaign.revision++; s.claims.forEach(c => c.approval = null); journal(s,'notice.changed',{ actor:'merchant' },now()); return s.campaign; }));
        } else if (url.pathname === '/api/campaign/approve') {
          insist(input.confirmed === true && input.model === 'N65' && typeof input.serialPrefix === 'string' && /^N65-[0-9]{4}-$/.test(input.serialPrefix) && typeof input.remedy === 'string' && input.remedy.length >= 10 && input.remedy.length <= 1000, 'CAMPAIGN_REVIEW', 'Confirm model N65, a serial prefix like N65-2408-, and merchant remedy wording.',400);
          response = json(await service.update(s => { insist(input.revision === s.campaign.revision,'STALE_CAMPAIGN','Campaign changed.'); s.campaign.model = normalize(input.model); s.campaign.serialPattern = '^' + input.serialPrefix + '[0-9]{4}$'; s.campaign.remedy = input.remedy; s.campaign.approved = true; s.campaign.approvedBy = 'merchant'; s.campaign.revision++; s.claims.forEach(c => c.approval = null); journal(s,'campaign.approved',{ actor:'merchant', revision:s.campaign.revision },now()); return s.campaign; }));
        } else if (url.pathname === '/api/reconcile') { if (config.mode === 'sandbox') await drainWebhooks(repo, pp, now); for (const c of (await service.state()).claims) await service.reconcile(c.id); response = json({ reconciled: true }); }
        else if (url.pathname === '/api/demo/reset') { insist(config.mode === 'replay','FIXTURE_REFUSED','Replay reset is unavailable in sandbox.',403); response = json(await service.update(s => { Object.assign(s,seed(now(),'replay')); return { reset:true }; })); }
        else if (url.pathname === '/api/demo/duplicate') { const c = (await service.state()).claims[0]; response = json(await service.update(s => newClaim(s,{orderId:c.orderId,sku:c.sku},now()))); }
        else if (url.pathname === '/api/demo/forged') response = json({ rejected: true, code:'FORGED_WEBHOOK', message:'Use the webhook endpoint to verify rejection; this control never alters a case.' });
        else throw new DomainError('NOT_FOUND','Route not found.',404);
      }
    } catch(e) {
      response = json({ error: e.code || 'INTERNAL_ERROR', message: e instanceof DomainError ? e.message : e.code ? 'External service returned ' + e.code + '. No unapproved refund was issued.' : 'The operation could not be completed. Reconcile pending payments before retrying.', debugId: e.debugId || undefined }, e instanceof DomainError ? e.status : 503);
    }
    if (cookie) response.headers.append('Set-Cookie',cookie);
    response.headers.set('X-Content-Type-Options','nosniff'); response.headers.set('Referrer-Policy','no-referrer');
    return response;
  };
}
