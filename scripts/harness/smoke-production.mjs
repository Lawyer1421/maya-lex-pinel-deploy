// Smoke test productivo de mayalexhn.com.
const BASE = 'https://mayalexhn.com';
const RUTAS_200 = ['/', '/demo', '/pricing', '/producto', '/herramientas', '/cobertura-juridica',
  '/seguridad', '/fundador', '/recursos', '/soluciones/abogados', '/soluciones/notarios',
  '/soluciones/estudiantes', '/soluciones/docentes', '/soluciones/bufetes',
  '/soluciones/universidades', '/soluciones/empresas', '/login', '/leyes/11'];
let fallos = 0;
const f = (u) => fetch(u, { redirect: 'manual' });
for (const r of RUTAS_200) {
  const res = await f(BASE + r);
  if (res.status !== 200) { console.error('X ' + r + ' -> ' + res.status); fallos++; } else console.log('OK ' + r + ' 200');
}
for (const r of ['/chat', '/cuenta']) {
  const res = await f(BASE + r);
  if (![307, 308, 302].includes(res.status)) { console.error('X ' + r + ' esperaba redirect auth, dio ' + res.status); fallos++; }
  else console.log('OK ' + r + ' redirect ' + res.status);
}
const version = await (await f(BASE + '/api/version')).json();
console.log('OK /api/version commit=' + (version.commitSha || '').slice(0, 7) + ' env=' + version.environment);
const sitemap = await (await f(BASE + '/sitemap.xml')).text();
const locs = (sitemap.match(/<loc>/g) || []).length;
if (locs < 3) { console.error('X sitemap con ' + locs + ' URLs'); fallos++; } else console.log('OK sitemap ' + locs + ' URLs');
const leyes = await (await f(BASE + '/leyes/11')).text();
if (!/norma verificada/.test(leyes)) { console.error('X /leyes/11 sin contenido verificado'); fallos++; }
else console.log('OK /leyes/11 sirve norma verificada');
process.exit(fallos ? 1 : 0);
