export class DomainError extends Error {
  constructor(code, message, status = 409) { super(message); this.code = code; this.status = status; }
}
export function insist(ok, code, message, status) { if (!ok) throw new DomainError(code, message, status); }
export const DAY = 86400000;
export const clone = x => structuredClone(x);
export const uid = () => crypto.randomUUID();
export const normalize = value => String(value ?? '').trim().toUpperCase();
export function cents(value) {
  insist(typeof value === 'string' && /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(value), 'INVALID_MONEY', 'Expected a positive USD decimal string.', 400);
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function money(n) { insist(Number.isSafeInteger(n) && n >= 0, 'INVALID_CENTS', 'Invalid money value.', 400); return (n / 100).toFixed(2); }
export const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))))].map(x => x.toString(16).padStart(2, '0')).join('');
export function journal(state, action, details = {}, now = Date.now()) {
  state.audit.push({ id: uid(), at: new Date(now).toISOString(), actor: details.actor ?? 'system', action, details });
  if (state.audit.length > 500) state.audit.shift();
}
export function findClaim(s, id) { const c = s.claims.find(x => x.id === id); insist(c, 'NOT_FOUND', 'Claim not found.', 404); return c; }
export function findOrder(s, id) { const o = s.orders.find(x => x.id === id); insist(o, 'NOT_FOUND', 'Purchase not found.', 404); return o; }
export function matchLabel(campaign, label) {
  if (!campaign.approved) return { state: 'manual', reason: 'The merchant has not approved this campaign.' };
  if (!label || label.ambiguous || !label.model || !label.serial) return { state: 'clarification', reason: 'Please upload a clear model and serial label. Missing information is never guessed.' };
  if (normalize(label.model) !== campaign.model) return { state: 'unaffected', reason: 'The confirmed model does not match this campaign. This does not certify product safety.' };
  if (!new RegExp(campaign.serialPattern).test(normalize(label.serial))) return { state: 'unaffected', reason: 'The confirmed serial is outside the merchant-approved affected range.' };
  return { state: 'matched', reason: 'Model and serial satisfy the approved campaign restrictions.' };
}
export function refundPlan(state, claim, now = Date.now(), ignoreOperationId) {
  const order = findOrder(state, claim.orderId), item = order.items.find(x => x.sku === claim.sku), campaign = state.campaign;
  insist(item && campaign, 'INVALID_ITEM', 'Purchase item is missing.');
  const label = matchLabel(campaign, claim.evidence);
  if (label.state !== 'matched') return { eligible: false, route: label.state, reason: label.reason, amountCents: 0 };
  if (!claim.evidence?.humanVerified) return { eligible: false, route: 'review', reason: 'A merchant must verify the extracted label against its source.', amountCents: 0 };
  if (item.model !== campaign.model || normalize(claim.evidence.serial) !== item.serial) return { eligible: false, route: 'manual', reason: 'Evidence does not match the serial registered to this purchase.', amountCents: 0 };
  if (!order.captureId || !['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.captureStatus)) return { eligible: false, route: 'manual', reason: 'No eligible completed capture is available.', amountCents: 0 };
  if (order.currency !== 'USD') return { eligible: false, route: 'manual', reason: 'This prototype supports USD remedies only.', amountCents: 0 };
  const time = Date.parse(order.capturedAt);
  if (!Number.isFinite(time) || time > now) return { eligible: false, route: 'manual', reason: 'The capture date cannot be verified.', amountCents: 0 };
  if (now - time >= 180 * DAY) return { eligible: false, route: 'manual', reason: 'The 180-day refund window has closed. Arrange the approved remedy manually.', amountCents: 0 };
  if (order.openDispute || order.externalRefundCents > 0 || order.providerMismatch || order.providerHold) return { eligible: false, route: 'manual', reason: order.providerHold ? 'PayPal refused refund eligibility (' + order.providerHold + '). Handle this remedy manually.' : 'A dispute, unattributed external refund, or payment mismatch requires reconciliation.', amountCents: 0 };
  if (state.operations.some(x => x.captureId === order.captureId && x.id !== ignoreOperationId && ['SUBMITTING', 'UNKNOWN', 'PENDING'].includes(x.status))) return { eligible: false, route: 'reconcile', reason: 'This capture has an unresolved refund. Reconcile it before another approval.', amountCents: 0 };
  const applied = state.operations.filter(x => x.orderId === order.id && x.sku === item.sku && ['COMPLETED', 'PENDING'].includes(x.status)).reduce((a, x) => a + x.amountCents, 0);
  const captureRefunded = state.operations.filter(x => x.captureId === order.captureId && ['COMPLETED', 'PENDING'].includes(x.status)).reduce((a, x) => a + x.amountCents, 0);
  // Item allocations are fixed at purchase creation, including any tax/shipping.
  const amountCents = Math.min(item.grossCents - (item.priorRefundCents ?? 0) - applied, order.totalCents - (order.priorRefundCents ?? 0) - captureRefunded);
  if (amountCents <= 0) return { eligible: false, route: 'completed', reason: 'The eligible item has already been fully refunded.', amountCents: 0 };
  if (order.captureStatus === 'REFUNDED' || order.captureStatus === 'PARTIALLY_REFUNDED' && !(order.priorRefundCents + captureRefunded > 0)) return { eligible: false, route: 'manual', reason: 'PayPal reports a refund but item-level history is incomplete. Reconcile the existing remedy manually.', amountCents: 0 };
  return { eligible: true, route: 'approval', reason: 'Verified affected item; merchant approval required.', amountCents, currency: 'USD', captureId: order.captureId, orderId: order.id, sku: item.sku, campaignRevision: campaign.revision, evidenceRevision: claim.evidenceRevision, totalCents: order.totalCents, priorCents: item.priorRefundCents ?? 0 };
}
export function newClaim(s, { orderId, sku }, now = Date.now()) {
  const order = findOrder(s, orderId);
  insist(order.items.some(x => x.sku === sku), 'INVALID_ITEM', 'Item is not in this purchase.', 400);
  insist(!s.claims.some(x => x.orderId === orderId && x.sku === sku), 'DUPLICATE_CLAIM', 'A case already exists for this purchase item. Open that case instead.');
  const c = { id: uid(), orderId, sku, customer: order.customer, evidence: null, evidenceRevision: 0, approval: null, createdAt: new Date(now).toISOString() };
  s.claims.push(c); journal(s, 'claim.created', { claimId: c.id }, now); return c;
}
export function setEvidence(s, id, evidence, now = Date.now()) {
  const c = findClaim(s, id);
  insist(!s.operations.some(x => x.claimId === id && ['SUBMITTING', 'UNKNOWN', 'PENDING', 'COMPLETED'].includes(x.status)), 'CASE_LOCKED', 'A financial operation is already in progress or completed.');
  c.evidence = { ...evidence, humanVerified: false }; c.evidenceRevision++; c.approval = null;
  journal(s, 'evidence.extracted', { claimId: id, mode: evidence.mode, ambiguous: evidence.ambiguous }, now); return c;
}
export async function approve(s, id, { revision, note, confirmed }, now = Date.now()) {
  const c = findClaim(s, id);
  insist(confirmed === true, 'HUMAN_REQUIRED', 'Explicit merchant confirmation is required.', 400);
  insist(typeof note === 'string' && note.trim().length >= 8 && note.length <= 500, 'REASON_REQUIRED', 'Record a merchant remedy approval reason (8–500 characters).', 400);
  insist(revision === c.evidenceRevision, 'STALE_EVIDENCE', 'Evidence changed. Review it again.');
  const plan = refundPlan(s, c, now); insist(plan.eligible, 'INELIGIBLE', plan.reason);
  c.approval = { id: uid(), hash: await digest(plan), plan, at: now, expiresAt: now + 600000, note: note.trim(), used: false, actor: 'merchant' };
  journal(s, 'remedy.approved', { actor: 'merchant', claimId: id, amountCents: plan.amountCents, approvalId: c.approval.id, reason: note.trim() }, now);
  return c.approval;
}
export async function reserve(s, id, now = Date.now()) {
  const c = findClaim(s, id), a = c.approval;
  insist(a && !a.used, 'APPROVAL_REQUIRED', 'An unused merchant approval is required.');
  insist(now < a.expiresAt, 'APPROVAL_EXPIRED', 'Approval expired. Review and approve again.');
  const plan = refundPlan(s, c, now);
  insist(plan.eligible && await digest(plan) === a.hash, 'STALE_APPROVAL', 'Payment, campaign or evidence changed. Review and approve again.');
  const op = { id: uid(), requestId: uid(), claimId: id, orderId: plan.orderId, captureId: plan.captureId, sku: plan.sku, amountCents: plan.amountCents, currency: 'USD', status: 'SUBMITTING', createdAt: now, approvalId: a.id, refundId: null };
  a.used = true; s.operations.push(op); journal(s, 'refund.reserved', { actor: 'merchant', operationId: op.id, amountCents: op.amountCents }, now); return op;
}
export function applyRefund(s, id, result, now = Date.now()) {
  const op = s.operations.find(x => x.id === id); insist(op, 'NOT_FOUND', 'Operation not found.', 404);
  insist(typeof result.id === 'string' && result.id.length > 0 && (!result.custom_id || result.custom_id === op.id) && result.amount?.currency_code === op.currency && cents(result.amount.value) === op.amountCents && ['COMPLETED', 'PENDING', 'FAILED', 'CANCELLED'].includes(result.status), 'REFUND_MISMATCH', 'PayPal refund identity, status or amount did not match the approved operation.');
  insist(!op.refundId || op.refundId === result.id, 'REFUND_MISMATCH', 'PayPal returned a different refund identifier.');
  insist(op.status !== 'COMPLETED' || result.status === 'COMPLETED', 'STATE_REGRESSION', 'A completed refund cannot regress.');
  op.refundId = result.id; op.status = result.status; op.updatedAt = now; op.debugId = result.debugId ?? null;
  journal(s, 'refund.' + result.status.toLowerCase(), { operationId: op.id, refundId: result.id, amountCents: op.amountCents, debugId: op.debugId }, now); return op;
}
export function summarize(s, now = Date.now()) {
  const rows = s.claims.map(c => { const o = findOrder(s, c.orderId), p = refundPlan(s, c, now), op = [...s.operations].reverse().find(x => x.claimId === c.id); const status = op && ['COMPLETED', 'PENDING', 'UNKNOWN', 'SUBMITTING'].includes(op.status) ? (op.status === 'COMPLETED' ? 'completed' : 'reconcile') : p.route; return { ...c, customer: o.customer, item: o.items.find(x => x.sku === c.sku)?.name, order: o, plan: p, status, operation: op, approval: c.approval ? { ...c.approval, hash: undefined } : null }; });
  return { ...s, claims: rows, metrics: { cases: rows.length, review: rows.filter(x => ['review', 'approval', 'clarification'].includes(x.status)).length, completed: rows.filter(x => x.status === 'completed').length, refundedCents: s.operations.filter(x => x.status === 'COMPLETED').reduce((a, x) => a + x.amountCents, 0), exposureCents: rows.reduce((a, x) => a + (x.plan.eligible ? x.plan.amountCents : 0), 0), reconciliation: rows.filter(x => x.status === 'reconcile').length } };
}
