import { cents, money, insist, DomainError } from './domain.mjs';
const BASE = 'https://api-m.sandbox.paypal.com';
export class PayPalError extends Error {
  constructor(status, name, debugId, details) { super('PayPal: ' + name); this.status = status; this.code = name; this.debugId = debugId; this.details = details; this.uncertain = status >= 500; }
}
export class PayPal {
  constructor(env, transport = fetch) { this.env = env; this.transport = (...args) => transport(...args); this.token = null; }
  async auth(force = false) {
    if (!force && this.token && this.token.expires > Date.now() + 60000) return this.token.value;
    insist(this.env.PAYPAL_CLIENT_ID && this.env.PAYPAL_CLIENT_SECRET, 'PAYPAL_NOT_CONFIGURED', 'Sandbox credentials are not configured.', 503);
    const r = await this.transport(BASE + '/v1/oauth2/token', { method: 'POST', headers: { Authorization: 'Basic ' + btoa(this.env.PAYPAL_CLIENT_ID + ':' + this.env.PAYPAL_CLIENT_SECRET), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials', signal: AbortSignal.timeout(15000) });
    const b = await r.json(); if (!r.ok || !b.access_token) throw new PayPalError(r.status, b.error ?? 'OAUTH_ERROR', r.headers.get('paypal-debug-id'));
    this.token = { value: b.access_token, expires: Date.now() + Number(b.expires_in) * 1000 }; return b.access_token;
  }
  async call(path, { method = 'GET', body, requestId } = {}, retried = false) {
    insist(/^\/v[12]\//.test(path) && !path.includes('..') && !path.includes('://'), 'INVALID_PATH', 'Invalid PayPal API path.', 400);
    const token = await this.auth();
    const r = await this.transport(BASE + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(requestId ? { 'PayPal-Request-Id': requestId } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const b = await r.json().catch(() => ({}));
    if (r.status === 401 && !retried) { await this.auth(true); return this.call(path, { method, body, requestId }, true); }
    if (!r.ok) throw new PayPalError(r.status, b.name ?? 'HTTP_' + r.status, b.debug_id ?? r.headers.get('paypal-debug-id'), b.details?.map(x => x.issue));
    return { ...b, debugId: r.headers.get('paypal-debug-id') };
  }
  async createOrder(purchase) {
    return this.call('/v2/checkout/orders', { method: 'POST', requestId: purchase.requestId, body: { intent: 'CAPTURE', purchase_units: [{ custom_id: purchase.id, invoice_id: purchase.id, amount: { currency_code: 'USD', value: money(purchase.totalCents), breakdown: { item_total: { currency_code: 'USD', value: money(purchase.totalCents) } } }, items: purchase.items.map(x => ({ name: x.name, sku: x.sku, quantity: '1', category: 'PHYSICAL_GOODS', unit_amount: { currency_code: 'USD', value: money(x.grossCents) } })) }], payment_source: { paypal: { experience_context: { return_url: this.env.APP_ORIGIN + '/?purchase=' + purchase.id, cancel_url: this.env.APP_ORIGIN + '/?cancelled=1', user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING' } } } } });
  }
  captureOrder(orderId, requestId) { return this.call('/v2/checkout/orders/' + encodeURIComponent(orderId) + '/capture', { method: 'POST', body: {}, requestId }); }
  order(orderId) { return this.call('/v2/checkout/orders/' + encodeURIComponent(orderId)); }
  capture(captureId) { return this.call('/v2/payments/captures/' + encodeURIComponent(captureId)); }
  refund(op) { return this.call('/v2/payments/captures/' + encodeURIComponent(op.captureId) + '/refund', { method: 'POST', requestId: op.requestId, body: { amount: { currency_code: 'USD', value: money(op.amountCents) }, custom_id: op.id, invoice_id: op.id, note_to_payer: 'Merchant-approved recall remedy for ' + op.sku } }); }
  getRefund(id) { return this.call('/v2/payments/refunds/' + encodeURIComponent(id)); }
  async verifyWebhook(headers, event) {
    const keys = ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time'];
    if (!this.env.PAYPAL_WEBHOOK_ID || keys.some(k => !headers.get(k))) return false;
    let cert; try { cert = new URL(headers.get('paypal-cert-url')); } catch { return false; }
    if (cert.protocol !== 'https:' || cert.port || cert.username || cert.password || !['api.paypal.com', 'api.sandbox.paypal.com', 'api-m.paypal.com', 'api-m.sandbox.paypal.com'].includes(cert.hostname)) return false;
    const r = await this.call('/v1/notifications/verify-webhook-signature', { method: 'POST', body: { auth_algo: headers.get(keys[0]), cert_url: cert.href, transmission_id: headers.get(keys[2]), transmission_sig: headers.get(keys[3]), transmission_time: headers.get(keys[4]), webhook_id: this.env.PAYPAL_WEBHOOK_ID, webhook_event: event } });
    return r.verification_status === 'SUCCESS';
  }
}
export function validateCapture(purchase, response) {
  const u = response.purchase_units?.[0], cap = u?.payments?.captures?.[0];
  insist(response.id === purchase.paypalOrderId && response.purchase_units?.length === 1 && u?.custom_id === purchase.id && u?.payments?.captures?.length === 1 && typeof cap?.id === 'string' && cap.id.length > 0 && Number.isFinite(Date.parse(cap.create_time)) && cap.status === 'COMPLETED' && cap.amount?.currency_code === 'USD' && cents(cap.amount.value) === purchase.totalCents, 'CAPTURE_MISMATCH', 'PayPal capture does not match the registered purchase. Manual reconciliation required.');
  return cap;
}
