#!/usr/bin/env node
/**
 * crear-planes-paypal.js
 * Crea el Producto y los 2 Planes de Suscripción en PayPal via REST API.
 *
 * ── USO EN POWERSHELL (Windows) ─────────────────────────────────────────────
 *   $env:PAYPAL_CLIENT_ID="AXxxxxxxxx"
 *   $env:PAYPAL_CLIENT_SECRET="EKxxxxxxxx"
 *   $env:PAYPAL_MODE="sandbox"        ← cambiar a "live" cuando esté listo
 *   node scripts/crear-planes-paypal.js
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Al terminar imprime los Plan IDs para agregar en Vercel.
 * Requiere Node.js 18+ (fetch nativo incluido).
 */

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const MODE          = process.env.PAYPAL_MODE ?? 'sandbox';
const BASE          = MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌  Credenciales faltantes. Ejecute en PowerShell:\n');
  console.error('  $env:PAYPAL_CLIENT_ID="AX..."');
  console.error('  $env:PAYPAL_CLIENT_SECRET="EK..."');
  console.error('  node scripts/crear-planes-paypal.js\n');
  process.exit(1);
}

async function token() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`Auth falló: ${await r.text()}`);
  return (await r.json()).access_token;
}

async function crearProducto(tk) {
  const r = await fetch(`${BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tk}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `maya-lex-prod-${Date.now()}`,
    },
    body: JSON.stringify({
      name:        'Maya Lex IA Pinel HN',
      description: 'Asistente jurídico inteligente para abogados hondureños',
      type:        'SERVICE',
      category:    'SOFTWARE',
    }),
  });
  if (!r.ok) throw new Error(`Producto: ${JSON.stringify(await r.json())}`);
  const d = await r.json();
  return d.id;
}

async function crearPlan(tk, productId, { nombre, descripcion, precio }) {
  const r = await fetch(`${BASE}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tk}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `maya-plan-${nombre.replace(/\s+/g,'-')}-${Date.now()}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      product_id:  productId,
      name:        nombre,
      description: descripcion,
      status:      'ACTIVE',
      billing_cycles: [{
        frequency:      { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type:    'REGULAR',
        sequence:       1,
        total_cycles:   0,
        pricing_scheme: { fixed_price: { value: precio, currency_code: 'USD' } },
      }],
      payment_preferences: {
        auto_bill_outstanding:     true,
        setup_fee_failure_action:  'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  });
  if (!r.ok) throw new Error(`Plan ${nombre}: ${JSON.stringify(await r.json())}`);
  return (await r.json()).id;
}

async function main() {
  console.log(`\n🚀  Conectando a PayPal ${MODE.toUpperCase()}...\n`);

  const tk = await token();
  console.log('✓  Token obtenido\n');

  console.log('📦  Creando producto "Maya Lex IA Pinel HN"...');
  const productId = await crearProducto(tk);
  console.log(`✓  Producto: ${productId}\n`);

  console.log('💼  Creando Plan Pro ($15.00/mes)...');
  const proPlanId = await crearPlan(tk, productId, {
    nombre:      'Maya Lex Pro - Abogados y Notarios',
    descripcion: 'Consultas ilimitadas. Analisis penal con Claude Opus. Redaccion de escritos procesales.',
    precio:      '15.00',
  });
  console.log(`✓  Plan Pro: ${proPlanId}\n`);

  console.log('🎓  Creando Plan Académico ($9.00/mes)...');
  const academicoPlanId = await crearPlan(tk, productId, {
    nombre:      'Maya Lex Academico - Estudiantes',
    descripcion: '20 consultas por dia. Ideal para estudiantes y docentes de Derecho hondureno.',
    precio:      '9.00',
  });
  console.log(`✓  Plan Académico: ${academicoPlanId}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✅  PLANES CREADOS — Agregar en Vercel → Environment Variables');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  PAYPAL_PRO_PLAN_ID       = ${proPlanId}`);
  console.log(`  PAYPAL_ACADEMICO_PLAN_ID = ${academicoPlanId}\n`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Luego: Vercel → Deployments → Redeploy');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('\n❌ ', e.message); process.exit(1); });
