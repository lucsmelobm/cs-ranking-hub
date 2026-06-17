/* ─── CONFIG ──────────────────────────────── */
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://cs-ranking-hub.onrender.com/api';

const BACKEND = API.replace('/api', '');

/* ─── STATE ───────────────────────────────── */
let players = [];
let picked  = [];

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
    window.location.href = `${BACKEND}/api/steam/login`;
  });
}

/* ─── FETCH ───────────────────────────────── */
async function fetchPlayers() {
  try {
    const res  = await fetch(`${API}/players`);
    const json = await res.json();
    players = json.success && json.data?.length ? json.data : [];
  } catch {
    players = [];
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
  qs('#s-total').textContent = players.length || '--';
  qs('#s-best').textContent  = best ? first(best.name) : '--';
  qs('#s-kdr').textContent   = players.length ? avg(players, 'KDR').toFixed(2) : '--';
  qs('#s-adr').textContent   = players.length ? avg(players, 'ADR').toFixed(0) : '--';

  /* Best Player */
  const bp = qs('#best-player-body');
  if (!best) {
    bp.innerHTML = steamCTA('Faça login para ver o destaque da semana');
  } else {
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
  }

  /* Top list */
  if (!ranked.length) {
    qs('#top-list').innerHTML = `<li>${steamCTA('Nenhum jogador ainda. Faça login com Steam!')}</li>`;
  } else {
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
}

/* ─── RANKING ─────────────────────────────── */
function renderRanking() {
  if (!players.length) {
    qs('#ranking-list').innerHTML = `<li>${steamCTA('Faça login com Steam para aparecer no ranking')}</li>`;
    return;
  }
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
  if (!players.length) {
    qs('#players-grid').innerHTML = steamCTA('Faça login com Steam para ver os perfis dos jogadores');
    return;
  }
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

  if (!players.length) {
    qs('#pick-grid').innerHTML = steamCTA('Faça login com Steam para sortear os times');
    return;
  }

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
const steamCTA = (msg) => `
  <div class="steam-cta">
    <div class="steam-cta-icon">🎮</div>
    <div class="steam-cta-msg">${msg}</div>
    <button class="btn-steam-cta" onclick="window.location.href='${BACKEND}/api/steam/login'">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
      Entrar com Steam
    </button>
  </div>`;

