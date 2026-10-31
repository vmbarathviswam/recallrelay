import { clone, DomainError } from './domain.mjs';
export class MemoryRepository {
  data = new Map(); inbox = new Map();
  async read(id) { return clone(this.data.get(id)); }
  async insert(id, snapshot) { if (!this.data.has(id)) this.data.set(id, { revision: 1, snapshot: clone(snapshot) }); }
  async cas(id, revision, snapshot) { if (this.data.get(id)?.revision !== revision) return false; this.data.set(id, { revision: revision + 1, snapshot: clone(snapshot) }); return true; }
  async enqueue(id, payload) { if (!this.inbox.has(id)) this.inbox.set(id, { id, payload, status: 'received' }); }
  async pending() { return [...this.inbox.values()].filter(x => x.status === 'received').slice(0, 25); }
  async finish(id) { if (this.inbox.has(id)) this.inbox.get(id).status = 'processed'; }
}
export class D1Repository {
  constructor(db) { this.db = db; }
  async read(id) { const r = await this.db.prepare('SELECT revision, snapshot FROM workspaces WHERE id = ?').bind(id).first(); return r ? { revision: r.revision, snapshot: JSON.parse(r.snapshot) } : undefined; }
  async insert(id, s) { await this.db.prepare('INSERT OR IGNORE INTO workspaces (id,revision,snapshot,updated_at) VALUES (?,1,?,?)').bind(id, JSON.stringify(s), Date.now()).run(); }
  async cas(id, v, s) { const r = await this.db.prepare('UPDATE workspaces SET revision = revision + 1, snapshot = ?, updated_at = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(s), Date.now(), id, v).run(); return r.meta.changes === 1; }
  async enqueue(id, p) { await this.db.prepare("INSERT OR IGNORE INTO webhook_inbox (id,payload,status,received_at) VALUES (?,?,'received',?)").bind(id, JSON.stringify(p), Date.now()).run(); }
  async pending() { const r = await this.db.prepare("SELECT id,payload FROM webhook_inbox WHERE status='received' ORDER BY received_at LIMIT 25").all(); return r.results.map(x => ({ ...x, payload: JSON.parse(x.payload) })); }
  async finish(id) { await this.db.prepare("UPDATE webhook_inbox SET status='processed' WHERE id=?").bind(id).run(); }
}
export async function mutate(repo, id, fn) {
  for (let i = 0; i < 12; i++) {
    const row = await repo.read(id); if (!row) throw new DomainError('NOT_FOUND', 'Workspace not found.', 404);
    // fn must have no external side effects: CAS retries it on contention.
    const next = clone(row.snapshot), result = await fn(next);
    if (new TextEncoder().encode(JSON.stringify(next)).length > 900000) throw new DomainError('WORKSPACE_LIMIT', 'This demonstration workspace reached its storage limit. Use smaller label images or a new replay workspace.', 413);
    if (await repo.cas(id, row.revision, next)) return clone(result);
  }
  throw new DomainError('BUSY', 'Another operation is updating this workspace. Try again.', 409);
}
