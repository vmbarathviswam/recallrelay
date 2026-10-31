import { DAY, journal, newClaim } from './domain.mjs';
export const catalog = [
  { sku: 'NOVA-65', name: 'Nova 65W travel charger', model: 'N65', serial: 'N65-2408-0182', grossCents: 5900 },
  { sku: 'CABLE-2', name: 'Braided USB-C cable', model: 'C2', serial: 'C2-0086', grossCents: 1800 },
];
export const notice = `DEMONSTRATION RECALL — fictional merchant campaign, not a real safety notice.
Northstar Goods is recalling Nova 65W travel chargers, model N65, serials beginning N65-2408- followed by four digits.
Customers should stop using affected products and provide a clear photograph of the model and serial label.
The merchant offers a refund of the affected item amount paid after verifying purchase and label evidence.
USB-C cables and model N66 are not part of this campaign. Contact the merchant for older purchases or uncertain identity.`;
export function seed(now = Date.now(), mode = 'replay') {
  const state = { mode, campaign: { id: 'nova-2026', title: 'Nova charger remedy', model: 'N65', serialPattern: '^N65-2408-[0-9]{4}$', revision: 1, approved: true, approvedBy: 'demo merchant', source: notice, sourceUrl: null, remedy: 'Refund the affected item amount paid; merchant verification required.', extracted: null }, orders: [], claims: [], operations: [], audit: [], providerRefunds: [], purchases: [], rate: {} };
  if (mode === 'sandbox') { journal(state, 'workspace.created', { mode }); return state; }
  const scenarios = [
    ['RR-1042', 'Maya Chen', 12, 'N65-2408-0182', false],
    ['RR-1043', 'Alex Rivera', 20, 'N65-2408-0421', true],
    ['RR-1044', 'Sam Okafor', 201, 'N65-2408-0770', false],
    ['RR-1045', 'Jordan Lee', 7, 'N65-2408-1108', false],
    ['RR-1046', 'Priya Shah', 30, 'N65-2408-2061', false],
  ];
  for (const [id, customer, age, serial, ambiguous] of scenarios) {
    const items = structuredClone(catalog); items[0].serial = serial;
    const o = { id, paypalOrderId: 'REPLAY-ORDER-' + id, customer, currency: 'USD', totalCents: 7700, items, captureId: 'REPLAY-CAP-' + id, captureStatus: 'COMPLETED', capturedAt: new Date(now - age * DAY).toISOString(), priorRefundCents: 0, externalRefundCents: 0, fixture: true };
    state.orders.push(o); const c = newClaim(state, { orderId: id, sku: 'NOVA-65' }, now);
    c.id = 'case-' + id; state.audit[state.audit.length-1].details.claimId = c.id; c.evidenceRevision = 1; c.evidence = { model: 'N65', serial: ambiguous ? null : serial, ambiguous, confidence: ambiguous ? 0.44 : 0.98, sourceText: ambiguous ? 'MODEL N65 / SERIAL [unreadable]' : 'MODEL N65 / SERIAL ' + serial, humanVerified: false, mode: 'recorded fixture', image: null };
    if (id === 'RR-1046') { o.items[0].priorRefundCents = 1500; o.priorRefundCents = 1500; }
  }
  journal(state, 'campaign.demo_loaded', { source: 'Fictional campaign; simulated PayPal data' }, now);
  return state;
}
