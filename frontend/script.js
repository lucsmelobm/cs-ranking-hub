/* ─── CONFIG ──────────────────────────────── */
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://cs-ranking-hub.onrender.com/api';

/* ─── STATE ───────────────────────────────── */
let players = [];
let picked  = [];

/* ─── DEMO DATA (when backend is offline) ─── */
const DEMO = [
  { name:'Johnny Walker', K:25, D:10, A:8,  ADR:120.95, KDR:2.50, KAST:82, stars:3, score:87.3, avatar:null },
  { name:'Nova',          K:23, D:9,  A:10, ADR:115.20, KDR:2.56, KAST:85, stars:3, score:85.1, avatar:null },
  { name:'Apex',          K:22, D:11, A:9,  ADR:105.10, KDR:2.00, KAST:78, stars:3, score:78.9, avatar:null },
  { name:'Lúcida',        K:20, D:12, A:7,  ADR:95.30,  KDR:1.67, KAST:75, stars:2, score:72.1, avatar:null },
  { name:'Shadow',        K:19, D:13, A:8,  ADR:92.70,  KDR:1.46, KAST:72, stars:2, score:68.5, avatar:null },
  { name:'Phoenix',       K:18, D:14, A:6,  ADR:88.20,  KDR:1.29, KAST:70, stars:2, score:65.4, avatar:null },
  { name:'Ghost',         K:16, D:16, A:5,  ADR:75.40,  KDR:1.00, KAST:65, stars:1, score:55.3, avatar:null },
  { name:'Titan',         K:14, D:18, A:4,  ADR:68.90,  KDR:0.78, KAST:60, stars:1, score:48.2, avatar:null },
];

/* ─── INIT ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  await fetchPlayers();
  renderDashboard();
  checkLoginCallback();
  document.getElementById('syncBtn').addEventListener('click', syncNow);
  document.getElementById('gen-btn').addEventListener('click', generateTeams);
  document.getElementById('search').addEventListener('input', e => filterPlayers(e.target.value));
});

/* ─── NAVIGATION ──────────────────────────── */
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const page = document.getElementById(btn.dataset.tab);
      if (page) page.classList.add('active');

      const tab = btn.dataset.tab;
      if (tab === 'ranking') renderRanking();
      if (tab === 'players') renderPlayers(players);
      if (tab === 'teams')   renderPickGrid();
    });
  });

  document.getElementById('steamLoginBtn').addEventListener('click', () => {
    window.location.href = '/api/steam/login';
  });
}

/* ─── FETCH ───────────────────────────────── */
async function fetchPlayers() {
  try {
    const res  = await fetch(`${API}/players`);
    const json = await res.json();
    players = json.success && json.data?.length ? json.data : DEMO;
  } catch {
    players = DEMO;
  }
  players.sort((a, b) => (b.score || 0) - (a.score || 0));
}

async function syncNow() {
  const btn = document.getElementById('syncBtn');
  btn.classList.add('spin');
  try {
    await fetch(`${API}/sync-now`, { method: 'POST' });
    await fetchPlayers();
    renderDashboard();
    toast('✅ Dados sincronizados!');
  } catch {
    toast('❌ Erro ao sincronizar', 'error');
  }
  btn.classList.remove('spin');
}

/* ─── DASHBOARD ───────────────────────────── */
function renderDashboard() {
  const ranked = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const best   = ranked[0];

  /* Stats */
  qs('#s-total').textContent = players.length;
  qs('#s-best').textContent  = best ? first(best.name) : '--';
  qs('#s-kdr').textContent   = avg(players, 'KDR').toFixed(2);
  qs('#s-adr').textContent   = avg(players, 'ADR').toFixed(0);

  /* Best Player */
  const bp = qs('#best-player-body');
  if (!best) { bp.innerHTML = '<div class="empty-msg">Nenhum dado</div>'; return; }
  bp.innerHTML = `
    <div class="bp-avatar">
      ${best.avatar ? `<img src="${best.avatar}" alt="${best.name}">` : '🎮'}
    </div>
    <div class="bp-name">${best.name}</div>
    <div class="bp-stars">${stars(best.stars)}</div>
    <div class="bp-stats">
      <div class="bp-stat"><div class="bp-stat-label">Score</div><div class="bp-stat-value">${fmt(best.score)}</div></div>
      <div class="bp-stat"><div class="bp-stat-label">KDR</div><div class="bp-stat-value">${fmt(best.KDR, 2)}</div></div>
      <div class="bp-stat"><div class="bp-stat-label">ADR</div><div class="bp-stat-value">${fmt(best.ADR)}</div></div>
      <div class="bp-stat"><div class="bp-stat-label">KAST</div><div class="bp-stat-value">${fmt(best.KAST, 0)}%</div></div>
    </div>`;

  /* Top list */
  qs('#top-list').innerHTML = ranked.slice(0, 6).map((p, i) => `
    <li class="player-list-item">
      <div class="pl-rank">${i + 1}</div>
      <div>
        <div class="pl-name">${p.name}</div>
        <div class="pl-sub">${stars(p.stars)} • KDR ${fmt(p.KDR, 2)}</div>
      </div>
      <div class="pl-score">${fmt(p.score)}</div>
    </li>`).join('');
}

/* ─── RANKING ─────────────────────────────── */
function renderRanking() {
  const ranked = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  qs('#ranking-list').innerHTML = ranked.map((p, i) => `
    <li class="rank-item">
      <span class="rank-pos">${medal(i + 1)}</span>
      <div class="rank-info">
        <div class="rank-name">${p.name} ${stars(p.stars)}</div>
        <div class="rank-meta">
          <span>KDR ${fmt(p.KDR, 2)}</span>
          <span>ADR ${fmt(p.ADR)}</span>
          <span>KAST ${fmt(p.KAST, 0)}%</span>
          <span>K ${p.K ?? 0}</span>
          <span>D ${p.D ?? 0}</span>
        </div>
      </div>
      <span class="rank-score">${fmt(p.score)}</span>
    </li>`).join('');
}

/* ─── PLAYERS GRID ────────────────────────── */
function renderPlayers(list) {
  qs('#players-grid').innerHTML = list.length
    ? list.map(p => `
        <div class="player-card">
          <div class="pc-avatar">
            ${p.avatar ? `<img src="${p.avatar}" alt="${p.name}">` : '🎮'}
          </div>
          <div class="pc-name">${p.name}</div>
          <div class="pc-stars">${stars(p.stars)}</div>
          <div class="pc-stats">
            ${stat('Score', fmt(p.score))}
            ${stat('KDR',   fmt(p.KDR, 2))}
            ${stat('ADR',   fmt(p.ADR))}
            ${stat('KAST',  fmt(p.KAST, 0) + '%')}
            ${stat('Kills', p.K ?? 0)}
            ${stat('Deaths', p.D ?? 0)}
            ${stat('Assists', p.A ?? 0)}
          </div>
        </div>`).join('')
    : '<div class="empty-msg">Nenhum jogador encontrado</div>';
}

function filterPlayers(q) {
  const filtered = players.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  renderPlayers(filtered);
}

/* ─── TEAM BUILDER ────────────────────────── */
function renderPickGrid() {
  picked = [];
  updatePickCount();
  qs('#teams-result').style.display = 'none';
  qs('#gen-btn').disabled = true;

  qs('#pick-grid').innerHTML = players.map(p => `
    <label class="pick-item" id="pick-${slug(p.name)}">
      <input type="checkbox" value="${slug(p.name)}" onchange="togglePick(this, '${slug(p.name)}')">
      <span class="pick-label">${p.name}</span>
      <span class="pick-stars">${stars(p.stars)}</span>
    </label>`).join('');
}

function togglePick(el, id) {
  const p    = players.find(x => slug(x.name) === id);
  const item = document.getElementById(`pick-${id}`);
  if (!p) return;

  if (el.checked) {
    if (picked.length >= 10) { el.checked = false; toast('Máximo de 10 jogadores!', 'error'); return; }
    picked.push(p);
    item.classList.add('selected');
  } else {
    picked = picked.filter(x => slug(x.name) !== id);
    item.classList.remove('selected');
  }
  updatePickCount();
}

function updatePickCount() {
  qs('#sel-count').textContent = `${picked.length} / 10`;
  qs('#gen-btn').disabled = picked.length !== 10;
}

async function generateTeams() {
  try {
    const res  = await fetch(`${API}/teams`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: picked })
    });
    const json = await res.json();
    if (json.success) return showTeams(json.data);
  } catch { /* fallback below */ }

  /* local fallback */
  const sorted = [...picked].sort((a, b) => (b.stars || 1) - (a.stars || 1));
  const t1 = [], t2 = [];
  sorted.forEach((p, i) => (i % 2 === 0 ? t1 : t2).push(p));
  showTeams({
    team1: t1, team2: t2,
    team1_value: t1.reduce((s, p) => s + (p.stars || 1), 0),
    team2_value: t2.reduce((s, p) => s + (p.stars || 1), 0)
  });
}

function showTeams(data) {
  qs('#stars-a').textContent = `${data.team1_value}⭐`;
  qs('#stars-b').textContent = `${data.team2_value}⭐`;

  qs('#players-a').innerHTML = data.team1.map((p, i) => `
    <li class="team-player-row red">
      <span class="tp-name">${i+1}. ${p.name} ${stars(p.stars)}</span>
      <span class="tp-adr">ADR ${fmt(p.ADR)}</span>
    </li>`).join('');

  qs('#players-b').innerHTML = data.team2.map((p, i) => `
    <li class="team-player-row blue">
      <span class="tp-name">${i+1}. ${p.name} ${stars(p.stars)}</span>
      <span class="tp-adr">ADR ${fmt(p.ADR)}</span>
    </li>`).join('');

  qs('#teams-result').style.display = 'grid';
  qs('#teams-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ─── STEAM LOGIN CALLBACK ────────────────── */
function checkLoginCallback() {
  const p = new URLSearchParams(window.location.search);
  if (p.get('login') === 'success') {
    toast(`✅ Bem-vindo, ${p.get('player') || 'Jogador'}!`);
    history.replaceState({}, '', '/');
  } else if (p.get('login') === 'error') {
    toast('❌ Erro no login Steam', 'error');
    history.replaceState({}, '', '/');
  }
}

/* ─── TOAST ───────────────────────────────── */
function toast(msg, type = 'success') {
  const el = qs('#toast');
  el.textContent = msg;
  el.className   = `toast show ${type === 'error' ? 'error' : ''}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

/* ─── HELPERS ─────────────────────────────── */
const qs   = sel => document.querySelector(sel);
const fmt  = (v, d = 1) => (+v || 0).toFixed(d);
const avg  = (arr, key) => arr.length ? arr.reduce((s, p) => s + (+p[key] || 0), 0) / arr.length : 0;
const first = str => str.split(' ')[0];
const slug  = str => str.toLowerCase().replace(/\s+/g, '-');
const stars = n => '⭐'.repeat(Math.max(1, Math.min(3, n || 1)));
const stat  = (k, v) => `<div class="pc-stat"><span class="pc-stat-k">${k}</span><span class="pc-stat-v">${v}</span></div>`;
const medal = i => i === 1 ? '🥇' : i === 2 ? '🥈' : i === 3 ? '🥉' : `#${i}`;
