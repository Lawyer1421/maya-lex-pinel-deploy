'use strict';
// Append-only, hash-chained audit log (JSONL). Records WHAT happened, never prompt/document content.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const digest = (text) => ({ sha256: sha256(String(text)).slice(0, 16), length: String(text).length });

function entryHash(e) {
  const { hash, ...rest } = e;
  return sha256(JSON.stringify(rest));
}

class AuditLog {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const last = this._readAll().at(-1);
    this.seq = last ? last.seq : 0;
    this.prev = last ? last.hash : 'GENESIS';
  }

  _readAll() {
    if (!fs.existsSync(this.file)) return [];
    return fs.readFileSync(this.file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  }

  record({ actor, action, target = null, outcome, meta = {} }) {
    const e = { seq: this.seq + 1, ts: new Date().toISOString(), actor, action, target, outcome, meta, prev: this.prev };
    e.hash = entryHash(e);
    fs.appendFileSync(this.file, JSON.stringify(e) + '\n', { mode: 0o600 });
    this.seq = e.seq;
    this.prev = e.hash;
    return e;
  }

  tail(n = 20) { return this._readAll().slice(-n); }

  verify() {
    let prev = 'GENESIS';
    const all = this._readAll();
    for (const e of all) {
      if (e.prev !== prev || e.hash !== entryHash(e)) return { ok: false, brokenAt: e.seq, count: all.length };
      prev = e.hash;
    }
    return { ok: true, count: all.length };
  }
}

module.exports = { AuditLog, digest };
