'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AuditLog } = require('../core/audit');

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fpw-')), 'a.jsonl');

test('chain verifies and survives reopen', () => {
  const f = tmp();
  const a = new AuditLog(f);
  a.record({ actor: 'u', action: 'x', outcome: 'ok' });
  a.record({ actor: 'u', action: 'y', outcome: 'ok' });
  const b = new AuditLog(f);
  b.record({ actor: 'u', action: 'z', outcome: 'ok' });
  assert.deepEqual(b.verify(), { ok: true, count: 3 });
});
test('tampering is detected', () => {
  const f = tmp();
  const a = new AuditLog(f);
  a.record({ actor: 'u', action: 'x', outcome: 'denied' });
  a.record({ actor: 'u', action: 'y', outcome: 'ok' });
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('denied', 'ok'));
  assert.equal(new AuditLog(f).verify().ok, false);
});
