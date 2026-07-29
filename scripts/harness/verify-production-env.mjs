// Verificacion redactada del entorno productivo tras un deploy.
const v = await (await fetch('https://mayalexhn.com/api/version')).json();
if (v.environment !== 'production') { console.error('X environment=' + v.environment); process.exit(1); }
console.log('OK produccion activa commit=' + (v.commitSha || '').slice(0, 7) + ' buildTime=' + v.buildTime);
const diag = await fetch('https://mayalexhn.com/api/diagnostico-preview');
if (diag.status !== 404) { console.error('X /api/diagnostico-preview deberia dar 404 en produccion, dio ' + diag.status); process.exit(1); }
console.log('OK ruta de diagnostico desactivada en produccion (404)');
