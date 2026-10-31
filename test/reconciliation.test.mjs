import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, consent, refund, NOW, ready } from './helpers.mjs';
import { reserve, refundPlan } from '../src/domain.mjs';
import { validateCapture } from '../src/paypal.mjs';
import { PayPalError } from '../src/paypal.mjs';
import { MemoryRepository } from '../src/store.mjs';
import { drainWebhooks } from '../src/http.mjs';

function provider(order, refunds = []) {
  return {
    capture: async () => ({ id: order.captureId, status: 'COMPLETED', create_time: order.capturedAt, amount: { currency_code: 'USD', value: '77.00' } }),
    order: async () => ({ id: order.paypalOrderId, purchase_units: [{ custom_id: order.id, payments: { captures: [{ id: order.captureId }], refunds: refunds.map(r => ({ id: r.id })) } }] }),
    getRefund: async id => refunds.find(r => r.id === id),
    refund: async () => { throw new Error('Reconciliation must never POST a refund'); }
  };
}

test('sandbox read reconciliation recovers an unknown operation by exact custom ID', async () => {
  const { service, id } = await fixture('sandbox');
  const order = (await service.state()).orders[0];
  service.paypal = provider(order);
  await service.approve(id, consent((await service.state()).claims[0]));
  const op = await service.update(s => reserve(s, id, NOW));
  await service.update(s => { s.operations[0].status = 'UNKNOWN'; });
  service.paypal = provider(order, [refund(op)]);
  await service.reconcile(id);
  await service.reconcile(id);
  const state = await service.state();
  assert.equal(state.operations.length, 1);
  assert.equal(state.operations[0].status, 'COMPLETED');
  assert.equal(state.operations[0].refundId, 'REFUND-1');
  assert.equal(state.orders[0].externalRefundCents, 0);
});

test('same amount with unrelated custom ID is external money, never a recovered refund', async () => {
  const { service, id } = await fixture('sandbox');
  const order = (await service.state()).orders[0];
  service.paypal = provider(order, [{ id: 'EXTERNAL', custom_id: 'someone-else', status: 'COMPLETED', amount: { currency_code: 'USD', value: '59.00' } }]);
  await service.refreshCapture(order.id);
  const state = await service.state();
  assert.equal(state.operations.length, 0);
  assert.equal(state.orders[0].externalRefundCents, 5900);
  assert.equal(refundPlan(state, state.claims.find(c => c.id === id), NOW).route, 'manual');
});

test('wrong PayPal order linkage blocks approval after reconciliation', async () => {
  const { service, id } = await fixture('sandbox');
  const order = (await service.state()).orders[0];
  service.paypal = { ...provider(order), order: async () => ({ id: 'UNRELATED', purchase_units: [] }) };
  await assert.rejects(service.approve(id, consent((await service.state()).claims[0])), { code: 'INELIGIBLE' });
  assert.equal((await service.state()).orders[0].providerMismatch, true);
});

test('verified dispute inbox holds its capture and clears old approval', async () => {
  const repo = new MemoryRepository(), state = ready();
  state.orders.forEach(o => o.fixture = false);
  state.claims[0].approval = { id: 'stale' };
  await repo.insert('merchant-sandbox', state);
  await repo.enqueue('event-dispute', { id: 'event-dispute', event_type: 'CUSTOMER.DISPUTE.CREATED', resource: { disputed_transactions: [{ seller_transaction_id: state.orders[0].captureId }] } });
  await drainWebhooks(repo, provider(state.orders[0]), () => NOW);
  const after = (await repo.read('merchant-sandbox')).snapshot;
  assert.equal(after.orders[0].openDispute, true);
  assert.equal(after.claims[0].approval, null);
  assert.equal((await repo.pending()).length, 0);
  assert.equal(refundPlan(after, after.claims[0], NOW).route, 'manual');
});

test('verified inbox stays pending on provider outage', async () => {
  const repo = new MemoryRepository(), state = ready();
  state.orders.forEach(o => o.fixture = false);
  await repo.insert('merchant-sandbox', state);
  await repo.enqueue('retry-event', { id: 'retry-event', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: state.orders[0].captureId } });
  await assert.rejects(drainWebhooks(repo, { ...provider(state.orders[0]), capture: async () => { throw new Error('outage'); } }, () => NOW));
  assert.equal((await repo.pending()).length, 1);
});

for (const invalid of ['missing-id', 'bad-date', 'multiple-captures']) test('capture rejects ' + invalid, () => {
  const cap = { id: 'CAP', create_time: new Date(NOW).toISOString(), status: 'COMPLETED', amount: { currency_code: 'USD', value: '77.00' } };
  if (invalid === 'missing-id') delete cap.id;
  if (invalid === 'bad-date') cap.create_time = 'not-a-date';
  const captures = invalid === 'multiple-captures' ? [cap, cap] : [cap];
  assert.throws(() => validateCapture({ id: 'local', paypalOrderId: 'ORDER', totalCents: 7700 }, { id: 'ORDER', purchase_units: [{ custom_id: 'local', payments: { captures } }] }), { code: 'CAPTURE_MISMATCH' });
});

for (const status of ['REFUNDED', 'PARTIALLY_REFUNDED']) test('provider ' + status + ' without attributed history requires manual handling', () => {
  const state = ready(); state.orders[0].captureStatus = status;
  assert.equal(refundPlan(state, state.claims[0], NOW).route, 'manual');
});

test('real PayPal 422 issue shape records permanent manual hold', async () => {
  const { service, id } = await fixture();
  service.mode = 'sandbox'; service.refreshCapture = async () => {};
  service.paypal = { refund: async () => { throw new PayPalError(422, 'UNPROCESSABLE_ENTITY', 'debug', ['CAPTURE_FULLY_REFUNDED']); } };
  await service.approve(id, consent((await service.state()).claims[0]));
  assert.equal((await service.execute(id)).status, 'REJECTED');
  const state = await service.state();
  assert.equal(state.operations[0].error, 'CAPTURE_FULLY_REFUNDED');
  assert.equal(refundPlan(state, state.claims[0], NOW).route, 'manual');
  await assert.rejects(service.approve(id, consent(state.claims[0])), { code: 'INELIGIBLE' });
});
