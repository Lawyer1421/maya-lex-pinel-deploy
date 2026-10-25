'use strict';
const $ = (id) => document.getElementById(id);
const get = (u) => fetch(u).then((r) => r.json());
let providers = [];

function refreshApprove() {
  const p = providers.find((x) => x.id === $('provider').value);
  const external = p && p.locality === 'EXTERNAL';
  $('approve-row').hidden = !external;
  if (!external) $('approve').checked = false;
}

async function init() {
  const [policy, provs, agents] = await Promise.all([get('/api/policy'), get('/api/providers'), get('/api/agents')]);
  providers = provs;
  $('net').textContent = policy.allowExternal ? 'EXTERNAL AI: enabled' : 'LOCAL ONLY';
  $('net').className = 'badge ' + (policy.allowExternal ? 'external' : 'local');
  $('agent').innerHTML = '<option value="auto">auto (Master)</option>' + agents.map((a) => `<option value="${a.id}">${a.name}</option>`).join('');
  $('provider').innerHTML = provs.map((p) => `<option value="${p.id}" ${p.id === policy.defaultProvider ? 'selected' : ''}>${p.id} · ${p.locality}${p.available ? '' : ' (n/a)'}</option>`).join('');
  const ul = $('agents');
  for (const a of agents) { const li = document.createElement('li'); li.textContent = `${a.name} — ${a.status}`; li.title = a.role; ul.appendChild(li); }
  refreshApprove();
  loadAudit();
}

async function loadAudit() {
  const a = await get('/api/audit');
  $('chain').textContent = a.verify.ok ? `chain OK (${a.verify.count})` : `BROKEN @${a.verify.brokenAt}`;
  $('chain').className = 'badge ' + (a.verify.ok ? 'local' : 'bad');
  $('audit').textContent = a.tail.map((e) => `${e.seq} ${e.action} ${e.target || ''} ${e.outcome}`).join('\n');
}

async function send() {
  $('answer').textContent = '…';
  const res = await fetch('/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: $('prompt').value, agent: $('agent').value, provider: $('provider').value, sensitivity: $('sensitivity').value, approvedExternal: $('approve').checked }),
  });
  const d = await res.json();
  $('answer').textContent = res.ok ? `[${d.agent} · ${d.provider} · ${d.locality}]\n\n${d.text}` : `Bloqueado/Blocked: ${d.error}${d.reason ? ' — ' + d.reason : ''}`;
  loadAudit();
}

$('provider').addEventListener('change', refreshApprove);
$('send').addEventListener('click', send);
init();
