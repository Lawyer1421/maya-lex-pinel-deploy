'use strict';
// Declarative agent registry. Agents are JSON manifests in /agents/<id>/agent.json.
// Manifests are validated at load: unknown/over-broad permissions fail closed.
const fs = require('node:fs');
const path = require('node:path');

const REQUIRED = ['id', 'name', 'status', 'role', 'permissions', 'memory'];
const ALLOWED_NETWORK = new Set(['none', 'allowlist']);

function validate(m, file) {
  for (const k of REQUIRED) if (!(k in m)) throw new Error(`${file}: missing "${k}"`);
  const p = m.permissions;
  if (!Array.isArray(p.knowledge_read) || !Array.isArray(p.tools)) throw new Error(`${file}: permissions malformed`);
  if (!ALLOWED_NETWORK.has(p.network)) throw new Error(`${file}: invalid network "${p.network}"`);
  if (p.external_providers === true) throw new Error(`${file}: agents may not self-grant external providers`);
  return m;
}

function loadAgents(root) {
  const dir = path.join(root, 'agents');
  const agents = new Map();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(dir, entry.name, 'agent.json');
    if (!fs.existsSync(file)) continue;
    const m = validate(JSON.parse(fs.readFileSync(file, 'utf8')), file);
    agents.set(m.id, Object.freeze(m));
  }
  return agents;
}

// Master Agent routing (v0): transparent keyword scoring. Replaced by a model-based router in Phase 2.
function route(text, agents) {
  const t = text.toLowerCase();
  let best = { id: 'master', score: 0 };
  for (const a of agents.values()) {
    if (a.id === 'master') continue;
    const score = (a.routing_keywords || []).reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0);
    if (score > best.score) best = { id: a.id, score };
  }
  return best.id;
}

function systemPrompt(agent) {
  return [
    `Eres ${agent.name} de Fredy Private AI Workspace. ${agent.role}`,
    'Reglas: trabajas solo con el contexto entregado; no inventes citas legales; indica incertidumbre; responde en español y luego en inglés americano.',
    `Herramientas habilitadas: ${agent.permissions.tools.join(', ') || 'ninguna'}.`,
  ].join('\n');
}

module.exports = { loadAgents, route, systemPrompt };
