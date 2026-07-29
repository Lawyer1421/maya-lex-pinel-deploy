// Gate: delega en la verificacion dura de conteo del build (postbuild oficial).
import { spawnSync } from 'node:child_process';
const r = spawnSync('node', ['scripts/verificar-conteo-build.mjs'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
