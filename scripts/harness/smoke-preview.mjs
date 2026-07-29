// Smoke basico de un Preview protegido. Uso: smoke-preview.mjs <baseURL> <shareToken>
// Nota: el diagnostico completo requiere navegador real con cookie del token;
// este script cubre la via rapida por query param.
const BASE = process.argv[2];
const TOKEN = process.argv[3];
if (!BASE || !TOKEN) { console.error('Uso: smoke-preview.mjs <baseURL> <shareToken>'); process.exit(1); }
const diag = await fetch(BASE + '/api/diagnostico-preview?_vercel_share=' + TOKEN, { redirect: 'follow' });
console.log('diagnostico HTTP ' + diag.status);
try {
  const j = await diag.json();
  console.log(JSON.stringify(j));
  if (j?.supabase?.esProduccionConocida) { console.error('X PREVIEW APUNTA A PRODUCCION'); process.exit(1); }
  if (j?.supabase?.esStagingEsperado !== true) { console.error('X ref de staging no confirmado'); process.exit(1); }
  console.log('OK Preview apunta a staging; PayPal clientId presente=' + Boolean(j?.paypal?.clientIdPresente));
} catch {
  console.log('(cuerpo no-JSON: usar navegador real con cookie para el diagnostico)');
}
