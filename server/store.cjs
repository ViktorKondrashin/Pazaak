const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

function emptyState() {
  return {
    revision: 0,
    profiles: {},
    lobby: { players: {}, invitations: {} },
    presence: {},
    rooms: {},
  };
}

class Store {
  constructor(filename) {
    if (filename !== ':memory:')
      mkdirSync(path.dirname(path.resolve(filename)), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS runtime (id INTEGER PRIMARY KEY CHECK(id=1), state_json TEXT NOT NULL);`);
    // Sessions are temporary. A process restart starts a fresh game service.
    this.state = emptyState();
    this.db
      .prepare('INSERT OR REPLACE INTO runtime(id,state_json) VALUES(1,?)')
      .run(JSON.stringify(this.state));
  }

  update(fn) {
    const next = structuredClone(this.state);
    const result = fn(next);
    next.revision++;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('UPDATE runtime SET state_json=? WHERE id=1').run(JSON.stringify(next));
      this.db.exec('COMMIT');
      this.state = next;
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.db.close();
  }
}

module.exports = { Store };
