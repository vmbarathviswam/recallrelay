export class SQLiteRepository {
  constructor(db){this.db=db;}
  async read(id){const r=this.db.prepare('SELECT revision,snapshot FROM workspaces WHERE id=?').get(id);return r?{revision:r.revision,snapshot:JSON.parse(r.snapshot)}:undefined;}
  async insert(id,s){this.db.prepare('INSERT OR IGNORE INTO workspaces (id,revision,snapshot,updated_at) VALUES (?,1,?,?)').run(id,JSON.stringify(s),Date.now());}
  async cas(id,v,s){return this.db.prepare('UPDATE workspaces SET revision=revision+1,snapshot=?,updated_at=? WHERE id=? AND revision=?').run(JSON.stringify(s),Date.now(),id,v).changes===1;}
  async enqueue(id,p){this.db.prepare("INSERT OR IGNORE INTO webhook_inbox (id,payload,status,received_at) VALUES (?,?,'received',?)").run(id,JSON.stringify(p),Date.now());}
  async pending(){return this.db.prepare("SELECT id,payload FROM webhook_inbox WHERE status='received' ORDER BY received_at LIMIT 25").all().map(x=>({...x,payload:JSON.parse(x.payload)}));}
  async finish(id){this.db.prepare("UPDATE webhook_inbox SET status='processed' WHERE id=?").run(id);}
}
