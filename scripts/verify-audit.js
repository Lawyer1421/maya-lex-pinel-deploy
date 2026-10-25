'use strict';
const { loadConfig } = require('../core/config');
const { AuditLog } = require('../core/audit');
const r = new AuditLog(loadConfig().auditFile).verify();
console.log(r.ok ? `Audit chain OK (${r.count} entries)` : `Audit chain BROKEN at seq ${r.brokenAt}`);
process.exit(r.ok ? 0 : 1);
