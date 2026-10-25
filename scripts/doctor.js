'use strict';
// Environment inspection: what can this machine run today? Read-only, no network.
const { execFileSync } = require('node:child_process');
const os = require('node:os');

const probe = (cmd, args = ['--version']) => {
  try { return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString().split('\n')[0].trim(); } catch { return null; }
};
const rows = [
  ['node', process.version, true],
  ['git', probe('git'), true],
  ['docker', probe('docker'), false],
  ['docker daemon', probe('docker', ['info', '--format', '{{.ServerVersion}}']), false],
  ['supabase CLI', probe('supabase'), false],
  ['ollama', probe('ollama'), false],
  ['psql', probe('psql'), false],
];
console.log(`Host: ${os.platform()} ${os.arch()} · ${os.cpus().length} CPU · ${(os.totalmem() / 2 ** 30).toFixed(0)} GiB RAM\n`);
let missingRequired = false;
for (const [name, val, required] of rows) {
  console.log(`${val ? 'OK     ' : required ? 'MISSING' : 'absent '} ${name.padEnd(14)} ${val || ''}`);
  if (required && !val) missingRequired = true;
}
console.log('\n"absent" items are optional for Phase 0; they unlock Phase 1 (Docker/Supabase) and Phase 2 (local models).');
process.exit(missingRequired ? 1 : 0);
