'use strict';
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

function loadConfig(env = process.env) {
  return Object.freeze({
    root: ROOT,
    host: env.FPW_HOST || '127.0.0.1',
    port: Number(env.FPW_PORT || 3000),
    allowExternal: env.FPW_ALLOW_EXTERNAL === 'true',
    externalAllowlist: (env.FPW_EXTERNAL_ALLOWLIST || '').split(',').map((s) => s.trim()).filter(Boolean),
    ollamaUrl: env.FPW_OLLAMA_URL || 'http://127.0.0.1:11434',
    ollamaModel: env.FPW_OLLAMA_MODEL || 'llama3.1',
    defaultProvider: env.FPW_DEFAULT_PROVIDER || 'echo',
    auditFile: path.resolve(ROOT, env.FPW_AUDIT_FILE || 'storage/audit/audit.jsonl'),
    anthropicKeyPresent: Boolean(env.ANTHROPIC_API_KEY),
  });
}

module.exports = { loadConfig, ROOT };
