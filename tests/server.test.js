'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../apps/workspace/server');
const { loadConfig } = require('../core/config');

async function boot(env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fpw-srv-'));
  const config = loadConfig({ FPW_AUDIT_FILE: path.join(dir, 'audit.jsonl'), ...env });
  const app = createApp({ ...config, auditFile: path.join(dir, 'audit.jsonl') });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return { app, base, close: () => new Promise((r) => app.server.close(r)) };
}
const post = (base, body, headers = {}) => fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('health, UI and security headers', async () => {
  const s = await boot();
  try {
    const h = await fetch(`${s.base}/api/health`);
    assert.equal((await h.json()).ok, true);
    assert.match(h.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal((await fetch(`${s.base}/`)).status, 200);
    assert.equal((await fetch(`${s.base}/..%2f..%2fpackage.json`)).status, 404);
  } finally { await s.close(); }
});

test('local chat works, is routed, and is audited without content', async () => {
  const s = await boot();
  try {
    const r = await post(s.base, { prompt: 'Redacta una escritura de compraventa secreta' });
    const d = await r.json();
    assert.equal(r.status, 200);
    assert.equal(d.agent, 'notarial');
    assert.equal(d.locality, 'LOCAL');
    const log = fs.readFileSync(s.app.config.auditFile, 'utf8');
    assert.ok(!log.includes('secreta'), 'prompt text must never reach the audit log');
    assert.equal(s.app.audit.verify().ok, true);
  } finally { await s.close(); }
});

test('external provider is blocked by default and the denial is audited', async () => {
  const s = await boot();
  try {
    const r = await post(s.base, { prompt: 'hola', provider: 'claude', sensitivity: 'PUBLIC', approvedExternal: true });
    assert.equal(r.status, 403);
    assert.equal((await r.json()).reason, 'external-disabled');
    assert.equal(s.app.audit.tail(1)[0].outcome, 'denied');
  } finally { await s.close(); }
});

test('rejects foreign Host, foreign Origin and non-JSON posts', async () => {
  const s = await boot();
  try {
    const port = s.app.server.address().port;
    const rebinding = await new Promise((resolve) => {
      require('node:http').get({ host: '127.0.0.1', port, path: '/api/health', headers: { host: 'evil.example.com' } }, (res) => resolve(res.statusCode));
    });
    assert.equal(rebinding, 421);
    assert.equal((await post(s.base, { prompt: 'x' }, { origin: 'https://evil.example.com' })).status, 403);
    const nonJson = await fetch(`${s.base}/api/chat`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' });
    assert.equal(nonJson.status, 415);
  } finally { await s.close(); }
});

test('oversized body is rejected', async () => {
  const s = await boot();
  try {
    const r = await post(s.base, { prompt: 'a'.repeat(70 * 1024) }).catch(() => ({ status: 413 }));
    assert.equal(r.status, 413);
  } finally { await s.close(); }
});

test('remote Ollama URL is classified EXTERNAL and blocked', async () => {
  const s = await boot({ FPW_OLLAMA_URL: 'https://llm.example.com' });
  try {
    const r = await post(s.base, { prompt: 'hola', provider: 'ollama' });
    assert.equal(r.status, 403);
  } finally { await s.close(); }
});
