'use strict';
// Provider abstraction. Contract: { id, locality, describe(), complete({system, prompt}) -> {text, model} }
// No agent imports a concrete provider; everything goes through the registry. Swapping vendors = new adapter.
const { LOCALITY, isLoopbackOrPrivateHost } = require('../policy');

const echoProvider = {
  id: 'echo',
  locality: LOCALITY.LOCAL,
  describe: () => ({ id: 'echo', locality: LOCALITY.LOCAL, available: true, note: 'Offline deterministic stub for tests/demo.' }),
  async complete({ system, prompt }) {
    return { model: 'echo', text: `[echo] ${system.split('\n')[0]}\n> ${prompt}` };
  },
};

function makeOllamaProvider(config, fetchImpl = globalThis.fetch) {
  let hostname = '';
  try { hostname = new URL(config.ollamaUrl).hostname; } catch { /* invalid URL => treated as external */ }
  // Locality is DERIVED from the URL: a remote "Ollama" is EXTERNAL and subject to policy.
  const locality = isLoopbackOrPrivateHost(hostname) ? LOCALITY.LOCAL : LOCALITY.EXTERNAL;
  return {
    id: 'ollama',
    locality,
    describe: () => ({ id: 'ollama', locality, available: true, model: config.ollamaModel, note: 'Requires a running Ollama server.' }),
    async complete({ system, prompt }) {
      const res = await fetchImpl(new URL('/api/chat', config.ollamaUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: config.ollamaModel,
          stream: false,
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`ollama-http-${res.status}`);
      const data = await res.json();
      return { model: config.ollamaModel, text: data.message?.content ?? '' };
    },
  };
}

// Registered to prove the abstraction and exercise the policy gate. Intentionally not implemented in Phase 0.
const claudeProvider = {
  id: 'claude',
  locality: LOCALITY.EXTERNAL,
  describe: () => ({ id: 'claude', locality: LOCALITY.EXTERNAL, available: false, note: 'Adapter not implemented (Phase 3, needs approval — see DECISIONS.md D-04).' }),
  async complete() { throw new Error('provider-not-implemented'); },
};

function createRegistry(config, opts = {}) {
  const providers = new Map(
    [echoProvider, makeOllamaProvider(config, opts.fetch), claudeProvider].map((p) => [p.id, p]),
  );
  return {
    get: (id) => providers.get(id),
    list: () => [...providers.values()].map((p) => p.describe()),
  };
}

module.exports = { createRegistry };
