'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { authorize, isLoopbackOrPrivateHost } = require('../core/policy');

const local = { id: 'echo', locality: 'LOCAL' };
const ext = { id: 'claude', locality: 'EXTERNAL' };
const cfg = (o = {}) => ({ allowExternal: false, externalAllowlist: [], ...o });

test('LOCAL providers are allowed by default', () => {
  assert.equal(authorize({ provider: local }, cfg()).allowed, true);
});
test('EXTERNAL is denied by default', () => {
  assert.equal(authorize({ provider: ext, sensitivity: 'PUBLIC', approvedExternal: true }, cfg()).reason, 'external-disabled');
});
test('EXTERNAL needs allowlist', () => {
  assert.equal(authorize({ provider: ext, sensitivity: 'PUBLIC', approvedExternal: true }, cfg({ allowExternal: true })).reason, 'provider-not-allowlisted');
});
test('PRIVILEGED data never goes external, even if everything is enabled', () => {
  const c = cfg({ allowExternal: true, externalAllowlist: ['claude'] });
  assert.equal(authorize({ provider: ext, sensitivity: 'PRIVILEGED', approvedExternal: true }, c).reason, 'privileged-data-never-external');
  assert.equal(authorize({ provider: ext, approvedExternal: true }, c).allowed, false, 'sensitivity defaults to PRIVILEGED');
});
test('EXTERNAL requires per-request human approval', () => {
  const c = cfg({ allowExternal: true, externalAllowlist: ['claude'] });
  assert.equal(authorize({ provider: ext, sensitivity: 'PUBLIC' }, c).reason, 'human-approval-required');
  assert.equal(authorize({ provider: ext, sensitivity: 'PUBLIC', approvedExternal: true }, c).allowed, true);
});
test('unknown locality fails closed', () => {
  assert.equal(authorize({ provider: { id: 'x', locality: 'WEIRD' } }, cfg()).allowed, false);
});
test('loopback/private host detection', () => {
  for (const h of ['127.0.0.1', 'localhost', '[::1]', '10.1.2.3', '192.168.1.5', '172.20.0.1']) assert.equal(isLoopbackOrPrivateHost(h), true, h);
  for (const h of ['8.8.8.8', 'api.example.com', '172.32.0.1', '']) assert.equal(isLoopbackOrPrivateHost(h), false, h);
});
