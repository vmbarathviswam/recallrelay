import { applyRefund, approve, reserve, journal, insist, findClaim, findOrder, cents, uid } from './domain.mjs';
import { mutate } from './store.mjs';
import { PayPalError, validateCapture } from './paypal.mjs';
import { catalog } from './seed.mjs';
export class Service {
  constructor(repo, workspace, paypal, mode, now = () => Date.now()) { Object.assign(this, { repo, workspace, paypal, mode, now }); }
  async state() { return (await this.repo.read(this.workspace)).snapshot; }
  update(fn) { return mutate(this.repo, this.workspace, fn); }
  async refreshCapture(orderId) {
    if (this.mode !== 'sandbox') return;
    const before = findOrder(await this.state(), orderId);
    insist(!before.fixture, 'FIXTURE_REFUSED', 'A replay purchase cannot reach PayPal.');
    const [capture, order] = await Promise.all([this.paypal.capture(before.captureId), this.paypal.order(before.paypalOrderId)]);
    const summaries = order.purchase_units?.flatMap(x => x.payments?.refunds || []) || [];
    insist(summaries.length <= 40, 'REFUND_HISTORY_LIMIT', 'This payment needs manual review because its refund history exceeds the prototype limit.');
    const refunds = await Promise.all(summaries.map(r => this.paypal.getRefund(r.id)));
    await this.update(s => {
      const o = findOrder(s, orderId);
      o.captureStatus = capture.status;
      o.capturedAt = capture.create_time;
      o.providerMismatch = capture.id !== o.captureId || capture.amount?.currency_code !== o.currency || cents(capture.amount?.value) !== o.totalCents || order.id !== o.paypalOrderId || !order.purchase_units?.some(u => u.custom_id === o.id && u.payments?.captures?.some(c => c.id === o.captureId));
      const known = new Set(s.operations.filter(x => x.captureId === o.captureId && x.refundId).map(x => x.refundId));
      // Recovered operations are matched by operation custom_id, never by amount alone.
      for (const r of refunds) {
        const op = s.operations.find(x => x.captureId === o.captureId && (x.refundId === r.id || x.id === r.custom_id));
        if (op) { applyRefund(s, op.id, r, this.now()); known.add(r.id); }
      }
      o.externalRefundCents = refunds.filter(r => !known.has(r.id) && ['COMPLETED','PENDING'].includes(r.status)).reduce((n,r) => n + cents(r.amount.value), 0);
      const providerTotal = capture.seller_receivable_breakdown?.total_refunded_amount;
      const attributed = s.operations.filter(x => x.captureId === o.captureId && x.status === 'COMPLETED').reduce((n,x) => n + x.amountCents, 0);
      if (providerTotal && providerTotal.currency_code === o.currency && cents(providerTotal.value) > attributed) o.externalRefundCents = Math.max(o.externalRefundCents, cents(providerTotal.value) - attributed);
      journal(s, 'payment.reconciled', { orderId, debugId: capture.debugId }, this.now());
    });
  }
  async approve(id, args) { const c = findClaim(await this.state(), id); await this.refreshCapture(c.orderId); return this.update(s => approve(s, id, args, this.now())); }
  async execute(id, { loseResponse = false } = {}) {
    const c = findClaim(await this.state(), id); await this.refreshCapture(c.orderId);
    const op = await this.update(s => reserve(s, id, this.now()));
    try {
      let r;
      if (this.mode === 'sandbox') r = await this.paypal.refund(op);
      else {
        r = { id: 'REPLAY-REF-' + uid().slice(0,8), custom_id: op.id, status: 'COMPLETED', amount: { currency_code: 'USD', value: (op.amountCents / 100).toFixed(2) }, debugId: 'replay-only' };
        await this.update(s => { s.providerRefunds.push(r); });
        if (loseResponse) throw new TypeError('Demonstrated lost response');
      }
      return await this.update(s => applyRefund(s, op.id, r, this.now()));
    } catch (e) {
      const uncertain = !(e instanceof PayPalError) || e.uncertain || e.status === 409;
      const issue = e instanceof PayPalError ? e.details?.find(x => typeof x === 'string' && /^[A-Z0-9_]{1,100}$/.test(x)) || e.code : 'RESPONSE_UNCERTAIN';
      await this.update(s => { const x = s.operations.find(x => x.id === op.id); if (!['COMPLETED','PENDING'].includes(x.status)) x.status = uncertain ? 'UNKNOWN' : 'REJECTED'; x.error = issue; x.debugId = e.debugId ?? null; if (!uncertain && ['REFUND_NOT_ALLOWED_AFTER_180_DAYS','CAPTURE_FULLY_REFUNDED','REFUND_AMOUNT_EXCEEDED'].includes(issue)) findOrder(s,op.orderId).providerHold = issue; journal(s, uncertain ? 'refund.response_uncertain' : 'refund.rejected', { operationId: op.id, error: x.error, debugId: x.debugId }, this.now()); });
      return { ...op, status: uncertain ? 'UNKNOWN' : 'REJECTED', message: uncertain ? 'The response is uncertain. Reconcile; do not issue another refund.' : 'PayPal rejected the refund. Review the payment before approving again.' };
    }
  }
  async reconcile(id) {
    const c = findClaim(await this.state(), id);
    if (this.mode === 'sandbox') {
      await this.refreshCapture(c.orderId);
      const ops = (await this.state()).operations.filter(x => x.claimId === id && x.refundId && ['PENDING','UNKNOWN','SUBMITTING'].includes(x.status));
      for (const op of ops) { const r = await this.paypal.getRefund(op.refundId); await this.update(s => applyRefund(s, op.id, r, this.now())); }
    } else await this.update(s => { for (const op of s.operations.filter(x => x.claimId === id && ['UNKNOWN','SUBMITTING','PENDING'].includes(x.status))) { const r = s.providerRefunds.find(x => x.custom_id === op.id); if (r) applyRefund(s, op.id, r, this.now()); } journal(s, 'payment.reconciled', { claimId: id, mode: 'replay' }, this.now()); });
    return findClaim(await this.state(), id);
  }
  async createPurchase(key, mixed) {
    const p = await this.update(s => {
      const existing = s.purchases.find(x => x.key === key); if (existing) return existing;
      insist(s.purchases.length < 20, 'DEMO_LIMIT', 'This workspace reached its demonstration purchase limit.', 429);
      const items = structuredClone(mixed ? catalog : [catalog[0]]); items[0].serial = 'N65-2408-' + String(s.purchases.length + 8000);
      const x = { id: uid(), key, requestId: uid(), captureRequestId: uid(), items, totalCents: items.reduce((n,i) => n + i.grossCents,0), currency: 'USD', status: 'CREATING', customer: 'Sandbox visitor' }; s.purchases.push(x); return x;
    });
    if (p.paypalOrderId) return p;
    let response;
    if (this.mode === 'sandbox') response = await this.paypal.createOrder(p);
    else response = { id: 'REPLAY-ORDER-' + p.id.slice(0,8), links: [] };
    insist(response.id, 'ORDER_ERROR', 'PayPal did not return an order identifier.', 502);
    const link = response.links?.find(x => ['approve','payer-action'].includes(x.rel))?.href;
    if (this.mode === 'sandbox') insist(link && new URL(link).hostname === 'www.sandbox.paypal.com' && new URL(link).protocol === 'https:', 'CHECKOUT_URL', 'PayPal returned an unexpected approval URL.', 502);
    return this.update(s => { const x = s.purchases.find(x => x.id === p.id); x.paypalOrderId = response.id; x.approvalUrl = link ?? null; x.status = 'AWAITING_BUYER'; journal(s, 'purchase.created', { purchaseId: x.id, paypalOrderId: x.paypalOrderId }, this.now()); return x; });
  }
  async capturePurchase(id) {
    const p = (await this.state()).purchases.find(x => x.id === id); insist(p?.paypalOrderId, 'NOT_FOUND', 'Purchase not found.', 404);
    if (p.status === 'COMPLETED') return p;
    let r;
    if (this.mode === 'sandbox') {
      const existing = await this.paypal.order(p.paypalOrderId);
      r = existing.status === 'COMPLETED' ? existing : await this.paypal.captureOrder(p.paypalOrderId, p.captureRequestId);
    } else r = { id: p.paypalOrderId, purchase_units: [{ custom_id: p.id, payments: { captures: [{ id: 'REPLAY-CAP-' + p.id.slice(0,8), status: 'COMPLETED', create_time: new Date(this.now()).toISOString(), amount: { currency_code: 'USD', value: (p.totalCents / 100).toFixed(2) } }] } }] };
    const cap = validateCapture(p, r);
    return this.update(s => { const x = s.purchases.find(x => x.id === id); if (x.status === 'COMPLETED') return x; x.status = 'COMPLETED'; x.captureId = cap.id; s.orders.push({ ...x, capturedAt: cap.create_time, captureStatus: cap.status, externalRefundCents: 0, priorRefundCents: 0, fixture: this.mode === 'replay' }); journal(s, 'purchase.captured', { purchaseId: id, captureId: cap.id, debugId: r.debugId }, this.now()); return x; });
  }
}
