'use strict';
// Fredy Private AI Workspace — local HTTP server (zero dependencies).
// Binds to loopback only. Every provider call passes through core/policy and is audited.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { loadConfig } = require('../../core/config');
const { authorize, SENSITIVITY } = require('../../core/policy');
const { AuditLog, digest } = require('../../core/audit');
const { createRegistry } = require('../../core/providers');
const { loadAgents, route, systemPrompt } = require('../../core/agents');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const MAX_BODY = 64 * 1024;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function createApp(config = loadConfig(), opts = {}) {
  const audit = new AuditLog(config.auditFile);
  const providers = createRegistry(config, opts);
  const agents = loadAgents(config.root);

  const send = (res, code, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(code, {
      'content-type': type,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'",
    });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  const readJson = (req) => new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('too-large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { reject(Object.assign(new Error('bad-json'), { code: 400 })); } });
  });

  async function chat(body) {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return [400, { error: 'prompt-required' }];
    const agentId = body.agent && body.agent !== 'auto' ? body.agent : route(prompt, agents);
    const agent = agents.get(agentId);
    if (!agent) return [400, { error: 'unknown-agent' }];
    const provider = providers.get(body.provider || config.defaultProvider);
    if (!provider) return [400, { error: 'unknown-provider' }];

    // Default sensitivity is PRIVILEGED: callers must opt DOWN explicitly; never the reverse.
    const sensitivity = Object.values(SENSITIVITY).includes(body.sensitivity) ? body.sensitivity : SENSITIVITY.PRIVILEGED;
    const decision = authorize({ provider, sensitivity, approvedExternal: body.approvedExternal === true }, config);
    const meta = { agent: agent.id, provider: provider.id, locality: provider.locality, sensitivity, reason: decision.reason, prompt: digest(prompt) };

    if (!decision.allowed) {
      audit.record({ actor: 'user', action: 'chat.request', target: agent.id, outcome: 'denied', meta });
      return [403, { error: 'policy-denied', reason: decision.reason, locality: provider.locality }];
    }
    try {
      const out = await provider.complete({ system: systemPrompt(agent), prompt });
      audit.record({ actor: 'user', action: 'chat.request', target: agent.id, outcome: 'ok', meta: { ...meta, response: digest(out.text), model: out.model } });
      return [200, { agent: agent.id, provider: provider.id, locality: provider.locality, model: out.model, text: out.text }];
    } catch (err) {
      audit.record({ actor: 'user', action: 'chat.request', target: agent.id, outcome: 'error', meta: { ...meta, error: String(err.message).slice(0, 120) } });
      return [502, { error: 'provider-error', detail: String(err.message).slice(0, 120) }];
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      // DNS-rebinding defense: only accept loopback Host headers.
      const host = (req.headers.host || '').replace(/:\d+$/, '');
      if (!LOOPBACK.has(host) && process.env.FPW_ALLOW_NON_LOOPBACK !== 'true') return send(res, 421, { error: 'bad-host' });

      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'POST') {
        // CSRF defense: same-origin JSON only.
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'bad-origin' });
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: 'json-required' });
      }

      if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, version: '0.1.0', phase: 0 });
      if (req.method === 'GET' && url.pathname === '/api/policy') {
        return send(res, 200, { allowExternal: config.allowExternal, externalAllowlist: config.externalAllowlist, defaultProvider: config.defaultProvider, host: config.host });
      }
      if (req.method === 'GET' && url.pathname === '/api/providers') return send(res, 200, providers.list());
      if (req.method === 'GET' && url.pathname === '/api/agents') {
        return send(res, 200, [...agents.values()].map(({ id, name, status, role, permissions }) => ({ id, name, status, role, permissions })));
      }
      if (req.method === 'GET' && url.pathname === '/api/audit') return send(res, 200, { verify: audit.verify(), tail: audit.tail(15) });
      if (req.method === 'POST' && url.pathname === '/api/chat') {
        const [code, payload] = await chat(await readJson(req));
        return send(res, code, payload);
      }

      if (req.method === 'GET') {
        const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        const file = path.resolve(PUBLIC_DIR, rel);
        if (file.startsWith(PUBLIC_DIR + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
          return send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
        }
      }
      return send(res, 404, { error: 'not-found' });
    } catch (err) {
      return send(res, err.code === 413 || err.code === 400 ? err.code : 500, { error: err.message === 'too-large' || err.message === 'bad-json' ? err.message : 'internal' });
    }
  });

  return { server, audit, agents, providers, config };
}

function start() {
  const config = loadConfig();
  const loopback = LOOPBACK.has(config.host);
  if (!loopback && process.env.FPW_ALLOW_NON_LOOPBACK !== 'true') {
    console.error(`Refusing to bind to non-loopback host "${config.host}". Set FPW_ALLOW_NON_LOOPBACK=true to override (see SECURITY.md §4).`);
    process.exit(1);
  }
  const app = createApp(config);
  app.audit.record({ actor: 'system', action: 'server.start', outcome: 'ok', meta: { host: config.host, port: config.port, allowExternal: config.allowExternal } });
  app.server.listen(config.port, config.host, () => console.log(`Fredy Private AI Workspace → http://${config.host}:${config.port}  (external AI: ${config.allowExternal ? 'ENABLED' : 'disabled'})`));
}

if (require.main === module) start();
module.exports = { createApp };
