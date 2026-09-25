export const APP_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Balise</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#0d1117; color:#e6edf3; }
    * { box-sizing:border-box; }
    body { margin:0; }
    main { max-width:1100px; margin:0 auto; padding:32px 20px 64px; }
    header { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; margin-bottom:28px; }
    h1 { margin:0; font-size:32px; letter-spacing:-.03em; }
    h2 { margin:28px 0 12px; font-size:18px; }
    .muted { color:#8b949e; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
    .card { background:#161b22; border:1px solid #30363d; border-radius:12px; padding:14px; }
    .probe strong { display:block; margin-bottom:7px; }
    .ok { color:#3fb950; } .bad { color:#f85149; }
    button,input,textarea { font:inherit; }
    button { background:#238636; color:white; border:0; border-radius:8px; padding:10px 14px; cursor:pointer; font-weight:650; }
    button.secondary { background:#21262d; border:1px solid #30363d; }
    .danger { background:#da3633; }
    .row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
    .incident { padding:12px 0; border-bottom:1px solid #21262d; }
    .incident:last-child { border:0; }
    .tag { font-size:12px; padding:3px 7px; border-radius:999px; background:#21262d; border:1px solid #30363d; }
    .status { font-weight:700; }
    .hero { display:flex; gap:14px; align-items:center; }
    .pulse { width:12px; height:12px; border-radius:50%; background:#3fb950; box-shadow:0 0 0 5px rgba(63,185,80,.12); }
    .pulse.bad { background:#f85149; box-shadow:0 0 0 5px rgba(248,81,73,.12); }
    form { display:grid; gap:8px; }
    input,textarea { width:100%; color:#e6edf3; background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:10px; }
    small { color:#8b949e; }
  </style>
</head>
<body><main>
  <header>
    <div><h1>📡 Balise</h1><div class="muted">Observer avant de modifier.</div></div>
    <button class="danger" id="phoneLoss">Mon téléphone vient de perdre Internet</button>
  </header>

  <section class="card">
    <div class="hero"><span id="pulse" class="pulse"></span><div><div id="summary" class="status">Initialisation…</div><small id="capturedAt"></small></div></div>
    <div id="context" class="muted" style="margin-top:10px"></div>
  </section>

  <h2>Contrôles</h2>
  <div id="probes" class="grid"></div>

  <h2>Ajouter une observation</h2>
  <section class="card">
    <form id="observationForm">
      <input id="device" placeholder="Appareil (ex. PS5, téléphone)" />
      <textarea id="note" rows="3" placeholder="Ce que tu as observé…"></textarea>
      <div><button type="submit" class="secondary">Enregistrer</button></div>
    </form>
  </section>

  <h2>Incidents récents</h2>
  <section id="incidents" class="card"><span class="muted">Chargement…</span></section>

<script>
const names = {gateway:'Passerelle',ipv4:'Internet IPv4',ipv6:'Internet IPv6',dnsSystem:'DNS système',dnsExternal:'DNS externe',http:'HTTPS'};
const fmt = (iso) => iso ? new Date(iso).toLocaleString('fr-FR') : '—';
async function refresh() {
  const [statusRes, incidentsRes] = await Promise.all([fetch('/api/status'), fetch('/api/incidents?limit=20')]);
  const status = await statusRes.json();
  const incidents = await incidentsRes.json();

  if (status.sample) {
    const s = status.sample;
    document.querySelector('#summary').textContent = s.diagnosis.summary;
    document.querySelector('#capturedAt').textContent = 'Dernière mesure : ' + fmt(s.capturedAt);
    document.querySelector('#pulse').className = 'pulse' + (s.diagnosis.isIncident ? ' bad' : '');
    document.querySelector('#context').textContent = [
      s.context.interfaceAlias,
      s.context.ssid,
      s.context.localAddress,
      s.context.gateway ? 'passerelle ' + s.context.gateway : null
    ].filter(Boolean).join(' · ');

    document.querySelector('#probes').innerHTML = Object.entries(s.results).map(([key,p]) =>
      '<div class="card probe"><strong>'+names[key]+'</strong><span class="'+(p.ok?'ok':'bad')+'">'+
      (p.ok?'OK':'ÉCHEC')+'</span><div class="muted">'+p.target+'</div><small>'+
      (p.latencyMs ?? '—')+' ms</small></div>'
    ).join('');
  }

  document.querySelector('#incidents').innerHTML = incidents.length
    ? incidents.map(i => '<div class="incident"><div class="row"><strong>#'+i.id+'</strong><span class="tag">'+
      i.classification+'</span><span class="tag">'+i.trigger+'</span></div><div style="margin-top:6px">'+
      i.summary+'</div><small>'+fmt(i.startedAt)+(i.endedAt ? ' → '+fmt(i.endedAt) : ' · en cours')+
      '</small></div>').join('')
    : '<span class="muted">Aucun incident enregistré.</span>';
}

document.querySelector('#phoneLoss').addEventListener('click', async () => {
  await fetch('/api/observations/phone-loss', {method:'POST'});
  await refresh();
});

document.querySelector('#observationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  await fetch('/api/observations', {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      device:document.querySelector('#device').value,
      note:document.querySelector('#note').value,
      kind:'manual'
    })
  });
  document.querySelector('#note').value='';
  await refresh();
});

refresh();
setInterval(refresh, 5000);
</script>
</main></body></html>`;
