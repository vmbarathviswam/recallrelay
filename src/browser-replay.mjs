// Public demo only. This adapter never receives provider keys or calls providers.
// The exact server handler/domain logic runs against a browser-local repository.
import { createHandler } from './http.mjs';

class BrowserRepository {
  constructor() {
    this.db = new Promise((resolve, reject) => {
      const request = indexedDB.open('recallrelay-replay-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('workspaces', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Browser storage is unavailable. Use the local Node application.'));
    });
  }
  async transaction(mode, action) {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workspaces', mode);
      let result;
      action(transaction.objectStore('workspaces'), value => { result = value; });
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('Browser storage transaction failed'));
    });
  }
  // There is exactly one synthetic workspace per browser origin. Ignore the
  // server session identifier; no browser cookie or network API is required.
  read() {
    return this.transaction('readonly', (store, done) => {
      const request = store.get('local'); request.onsuccess = () => done(request.result);
    });
  }
  insert(_id, snapshot) {
    return this.transaction('readwrite', store => {
      const request = store.get('local');
      request.onsuccess = () => { if (!request.result) store.put({ id: 'local', revision: 1, snapshot: structuredClone(snapshot) }); };
    });
  }
  cas(_id, revision, snapshot) {
    return this.transaction('readwrite', (store, done) => {
      const request = store.get('local');
      request.onsuccess = () => {
        if (request.result?.revision !== revision) return done(false);
        store.put({ id: 'local', revision: revision + 1, snapshot: structuredClone(snapshot) }); done(true);
      };
    });
  }
}

const handle = createHandler({ repository: new BrowserRepository() });
export async function browserRequest(path, init = {}) {
  if (!path.startsWith('/api/')) throw new Error('Browser replay only supports the application API.');
  // No fetch: all replay data stays in this browser. Live mode is unavailable.
  const response = await handle(new Request(new URL(path, location.origin), init), { PAYPAL_MODE: 'replay' });
  if (path === '/api/config' || path === '/api/state') {
    const value = await response.json();
    const config = value.config || value;
    config.database = 'Browser IndexedDB'; config.browserReplay = true;
    return Response.json(value, { status: response.status });
  }
  return response;
}
