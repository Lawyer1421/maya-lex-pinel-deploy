'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ROOT } = require('../core/config');
const { loadAgents, route } = require('../core/agents');

test('all 8 designed agents load with least-privilege defaults', () => {
  const agents = loadAgents(ROOT);
  assert.deepEqual([...agents.keys()].sort(), ['academic', 'document', 'editorial', 'legal', 'master', 'notarial', 'research', 'technology']);
  for (const a of agents.values()) {
    assert.equal(a.permissions.external_providers, false, a.id);
    assert.equal(a.permissions.network, 'none', a.id);
    assert.notEqual(a.permissions.destructive_actions, 'allowed', a.id);
  }
});
test('routing', () => {
  const agents = loadAgents(ROOT);
  assert.equal(route('Necesito una escritura de compraventa', agents), 'notarial');
  assert.equal(route('Prepara el sílabo y el examen de la clase', agents), 'academic');
  assert.equal(route('hola', agents), 'master');
});
