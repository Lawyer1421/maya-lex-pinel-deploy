'use strict';
// Data-locality policy. Single choke point: nothing reaches a provider without authorize().

const LOCALITY = Object.freeze({ LOCAL: 'LOCAL', EXTERNAL: 'EXTERNAL' });
const SENSITIVITY = Object.freeze({ PUBLIC: 'PUBLIC', INTERNAL: 'INTERNAL', PRIVILEGED: 'PRIVILEGED' });

function isLoopbackOrPrivateHost(hostname) {
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h === '::1') return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/**
 * Decide whether `provider` may receive data of `sensitivity`.
 * Returns { allowed, reason }. Default deny for anything not explicitly LOCAL.
 */
function authorize({ provider, sensitivity = SENSITIVITY.PRIVILEGED, approvedExternal = false }, config) {
  if (!provider) return { allowed: false, reason: 'no-provider' };
  if (provider.locality === LOCALITY.LOCAL) return { allowed: true, reason: 'local' };
  if (provider.locality !== LOCALITY.EXTERNAL) return { allowed: false, reason: 'unknown-locality' };

  if (!config.allowExternal) return { allowed: false, reason: 'external-disabled' };
  if (!config.externalAllowlist.includes(provider.id)) return { allowed: false, reason: 'provider-not-allowlisted' };
  if (sensitivity === SENSITIVITY.PRIVILEGED) return { allowed: false, reason: 'privileged-data-never-external' };
  if (!approvedExternal) return { allowed: false, reason: 'human-approval-required' };
  return { allowed: true, reason: 'external-approved' };
}

module.exports = { LOCALITY, SENSITIVITY, authorize, isLoopbackOrPrivateHost };
