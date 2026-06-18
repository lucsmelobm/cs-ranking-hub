/* ─── CONFIG ──────────────────────────────── */
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://cs-ranking-hub.onrender.com/api';

/* ─── STATE ───────────────────────────────── */
let players = [];
let picked  = [];
let _deleteTarget = null;

/* ─── INIT ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initBookmarklet();
  initDeleteModal();
  await fetchPlayers();
  renderDashboard();
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
      if (tab === 'ranking') { initRankingTabs(); renderRanking('all'); }
      if (tab === 'players') renderPlayers(players);
      if (tab === 'teams')   renderPickGrid();
      if (tab === 'sync')    requireAuth(renderSync);
    });
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
    await fetchPlayers();
    renderDashboard();
    toast('✅ Dados atualizados!');
  } catch {
    toast('❌ Erro ao atualizar', 'error');
  }
  btn.classList.remove('spin');
}

/* ─── DASHBOARD ───────────────────────────── */
function renderDashboard() {
  const ranked = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const best   = ranked[0];

  qs('#s-total').textContent = players.length || '--';
  qs('#s-best').textContent  = best ? first(best.name) : '--';
  qs('#s-kdr').textContent   = players.length ? avg(players, 'KDR').toFixed(2) : '--';
  qs('#s-adr').textContent   = players.length ? avg(players, 'ADR').toFixed(0) : '--';

  const bp = qs('#best-player-body');
  if (!best) {
    bp.innerHTML = '<div class="empty-msg">Nenhum jogador cadastrado ainda</div>';
  } else {
    bp.innerHTML = `
      <div class="bp-avatar">
        ${best.avatar ? `<img src="${best.avatar}" alt="${best.name}" onerror="this.parentElement.innerHTML='🎮'">` : '🎮'}
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

  if (!ranked.length) {
    qs('#top-list').innerHTML = '<li class="empty-msg">Nenhum jogador cadastrado ainda</li>';
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
function initRankingTabs() {
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderRanking(tab.dataset.period);
    };
  });
}

async function renderRanking(period = 'all') {
  const list = qs('#ranking-list');
  const mapBadge = qs('#map-badge');
  list.innerHTML = '<li class="empty-msg">Carregando...</li>';
  if (mapBadge) mapBadge.style.display = 'none';

  try {
    let data;
    if (period === 'all') {
      data = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    } else {
      const res  = await fetch(`${API}/ranking/${period}`);
      const json = await res.json();
      data = json.success ? json.data : [];

      // Busca mapa mais jogado da semana
      if (period === 'weekly' && mapBadge) {
        try {
          const mapRes  = await fetch(`${API}/stats/map-week`);
          const mapJson = await mapRes.json();
          if (mapJson.success && mapJson.map) {
            qs('#map-badge-name').textContent = mapJson.map + ` (${mapJson.count}x)`;
            mapBadge.style.display = 'flex';
          }
        } catch { /* silently ignore */ }
      }
    }

    if (!data.length) {
      list.innerHTML = '<li class="empty-msg">Nenhum dado para este período — sincronize os jogadores via bookmarklet.</li>';
      return;
    }

    const isPeriod = period !== 'all';
    list.innerHTML = data.map((p, i) => `
      <li class="rank-item">
        <span class="rank-pos">${medal(i + 1)}</span>
        <div class="rank-avatar">
          ${p.avatar ? `<img src="${p.avatar}" alt="${p.name}" onerror="this.style.display='none'">` : ''}
        </div>
        <div class="rank-info">
          <div class="rank-name">${p.name} ${stars(p.stars)}</div>
          <div class="rank-meta">
            ${isPeriod ? `
              <span>🎮 ${p.period_matches ?? 0} partidas</span>
              <span>🏆 ${p.win_rate ?? 0}% vitórias</span>
              <span>⭐ Rating ${fmt(p.avg_rating, 0)}</span>
              ${p.top_map ? `<span>🗺️ ${p.top_map}</span>` : ''}
            ` : `
              <span>KDR ${fmt(p.KDR, 2)}</span>
              <span>ADR ${fmt(p.ADR)}</span>
              <span>KAST ${fmt(p.KAST, 0)}%</span>
              <span>K ${p.K ?? 0}</span>
              <span>D ${p.D ?? 0}</span>
            `}
          </div>
        </div>
        <span class="rank-score">${isPeriod ? fmt(p.avg_rating, 0) : fmt(p.score)}</span>
      </li>`).join('');
  } catch (e) {
    list.innerHTML = '<li class="empty-msg">Erro ao carregar ranking</li>';
  }
}

/* ─── PLAYERS GRID ────────────────────────── */
function renderPlayers(list) {
  const isAdmin = sessionStorage.getItem('avance_auth') === '1';

  if (!players.length) {
    qs('#players-grid').innerHTML = '<div class="empty-msg">Nenhum jogador cadastrado ainda</div>';
    return;
  }
  qs('#players-grid').innerHTML = list.length
    ? list.map(p => `
        <div class="player-card">
          <div class="pc-avatar">
            ${p.avatar
              ? `<img src="${p.avatar}" alt="${p.name}" onerror="this.parentElement.innerHTML='🎮'">`
              : '🎮'}
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
          ${isAdmin ? `<button class="btn-delete" onclick="confirmDelete('${escJs(p.name)}')">🗑️ Remover</button>` : ''}
        </div>`).join('')
    : '<div class="empty-msg">Nenhum jogador encontrado</div>';
}

function filterPlayers(q) {
  const filtered = players.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  renderPlayers(filtered);
}

/* ─── DELETE ──────────────────────────────── */
function confirmDelete(name) {
  _deleteTarget = name;
  qs('#delete-msg').textContent = `Você tem certeza que deseja remover "${name}"?`;
  qs('#delete-overlay').style.display = 'flex';
}

function initDeleteModal() {
  qs('#delete-no-btn').onclick = () => {
    qs('#delete-overlay').style.display = 'none';
    _deleteTarget = null;
  };

  qs('#delete-yes-btn').onclick = async () => {
    if (!_deleteTarget) return;
    const btn = qs('#delete-yes-btn');
    btn.disabled = true;
    btn.textContent = 'Removendo...';

    try {
      const res  = await fetch(`${API}/player/${encodeURIComponent(_deleteTarget)}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password: sessionStorage.getItem('avance_pwd') })
      });
      const json = await res.json();

      if (json.success) {
        players = players.filter(p => p.name !== _deleteTarget);
        qs('#delete-overlay').style.display = 'none';
        renderPlayers(players);
        renderDashboard();
        toast(`✅ ${_deleteTarget} removido!`);
      } else {
        toast('❌ ' + (json.error || 'Erro ao remover'), 'error');
      }
    } catch {
      toast('❌ Erro de conexão', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Sim, remover';
    _deleteTarget = null;
  };

  qs('#delete-overlay').onclick = e => {
    if (e.target === qs('#delete-overlay')) {
      qs('#delete-overlay').style.display = 'none';
      _deleteTarget = null;
    }
  };
}

/* ─── TEAM BUILDER ────────────────────────── */
function renderPickGrid() {
  picked = [];
  updatePickCount();
  qs('#teams-result').style.display = 'none';
  qs('#gen-btn').disabled = true;

  if (!players.length) {
    qs('#pick-grid').innerHTML = '<div class="empty-msg">Nenhum jogador cadastrado ainda</div>';
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

/* ─── AUTH ────────────────────────────────── */
function requireAuth(onSuccess) {
  if (sessionStorage.getItem('avance_auth') === '1') { onSuccess(); return; }

  const overlay = qs('#auth-overlay');
  const input   = qs('#auth-input');
  const btn     = qs('#auth-btn');
  const err     = qs('#auth-error');

  overlay.style.display = 'flex';
  input.value = '';
  err.style.display = 'none';
  setTimeout(() => input.focus(), 100);

  const attempt = async () => {
    const pwd = input.value.trim();
    if (!pwd) return;
    btn.disabled = true;
    try {
      const res  = await fetch(`${API}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      const json = await res.json();
      if (json.success) {
        sessionStorage.setItem('avance_auth', '1');
        sessionStorage.setItem('avance_pwd', pwd);
        overlay.style.display = 'none';
        onSuccess();
      } else {
        err.style.display = 'block';
        input.value = '';
        input.focus();
      }
    } catch {
      err.textContent = 'Erro de conexão';
      err.style.display = 'block';
    }
    btn.disabled = false;
  };

  btn.onclick = attempt;
  input.onkeydown = e => { if (e.key === 'Enter') attempt(); };
  // Não fecha ao clicar fora — área restrita deve exigir senha
}

/* ─── BOOKMARKLET ─────────────────────────── */
function initBookmarklet() {
  const backendUrl = API.replace('/api', '');
  const code = `(function(){
  var url = window.location.href;
  if (!url.includes('gamersclub.com.br/player/')) {
    return alert('Abra o perfil de um jogador no GamersClub primeiro!');
  }
  var id = url.split('/player/')[1].split('/')[0].split('?')[0];

  function findAvatar(apiData) {
    // 1. OG image tag — GamersClub seta com a foto do jogador (mais confiável)
    var og = document.querySelector('meta[property="og:image"]');
    if (og && og.getAttribute('content')) return og.getAttribute('content');

    // 2. Campos da resposta da API
    var info = (apiData && apiData.playerInfo) || {};
    var char = (apiData && apiData.character) || {};
    var fromApi = info.photoUrl || info.avatar || info.photo || info.picture ||
                  info.profilePicture || info.image ||
                  char.avatar || char.photoUrl || char.image || char.url ||
                  char.photo || char.profilePicture || '';
    if (fromApi) return fromApi;

    // 3. Imagens do DOM — sem filtro de naturalWidth (lazy load)
    var cdn = ['steamcdn','akamaihd','steamstatic','avatars.steam',
               'gamersclub.com.br/storage','cdn.gamersclub'];
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var src = imgs[i].src ||
                imgs[i].getAttribute('data-src') ||
                imgs[i].getAttribute('lazy-src') ||
                imgs[i].getAttribute('data-lazy') || '';
      if (src) {
        for (var c = 0; c < cdn.length; c++) {
          if (src.includes(cdn[c])) return src;
        }
      }
    }

    // 4. CSS background-image com CDN do Steam
    var els = document.querySelectorAll('*');
    for (var e = 0; e < els.length && e < 300; e++) {
      var bg = window.getComputedStyle(els[e]).backgroundImage || '';
      if (bg && bg !== 'none') {
        for (var c2 = 0; c2 < cdn.length; c2++) {
          if (bg.includes(cdn[c2])) {
            var m = bg.match(/url\\(['"]?([^'"]+)['"]?\\)/);
            if (m) return m[1];
          }
        }
      }
    }

    // 5. Nuxt/Vue store como fallback
    try {
      var nd = JSON.stringify(window.__nuxt__ || window.__NUXT__ || {});
      var match = nd.match(/"(https?:\\/\\/[^"]*(?:steamcdn|akamaihd|steamstatic|avatars\\.steam)[^"]{8,})"/i);
      if (match) return match[1];
    } catch(ex) {}

    return '';
  }

  Promise.all([
    fetch('/api/box/init/' + id).then(function(r){ return r.json(); }),
    fetch('/api/box/history/' + id, {credentials:'include'}).then(function(r){ return r.json(); }).catch(function(){ return null; })
  ])
    .then(function(results) {
      var data = results[0];
      var hist = results[1];
      data.avatar = findAvatar(data);
      if (hist) {
        data._history_url  = '/api/box/history/' + id;
        data._history_data = hist;
      }
      return fetch('${backendUrl}/api/gamersclub/import', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
    })
    .then(function(r){ return r.json(); })
    .then(function(r){
      if (r.success) {
        var msg = '\\u2705 ' + r.player + ' sincronizado!';
        if (r.monthly_periods) msg += '\\n\\uD83D\\uDCC5 ' + r.monthly_periods + ' meses de histórico salvos';
        if (r.first_month_keys) msg += '\\nCampos: ' + r.first_month_keys;
        alert(msg);
      } else alert('\\u274c Erro: ' + r.error);
    })
    .catch(function(e){ alert('\\u274c Erro: ' + e.message); });
})();`;

  const link = document.getElementById('bookmarklet-link');
  if (link) link.href = 'javascript:' + encodeURIComponent(code);
}

function renderSync() {
  initBookmarklet();
  initDetectBookmarklet();
}

function initDetectBookmarklet() {
  const detectCode = `(function(){
  if (!window.location.href.includes('gamersclub.com.br/player/')) {
    return alert('Abra o perfil de um jogador no GamersClub primeiro!');
  }
  var id = window.location.href.split('/player/')[1].split('/')[0].split('?')[0];
  var found = [];
  var candidates = [
    '/api/box/history/' + id,
    '/api/player/history/' + id,
    '/api/box/playerHistory/' + id,
    '/api/box/statsHistory/' + id,
    '/api/player/' + id + '/history',
    '/api/player/' + id + '/stats/history',
    '/api/player/' + id + '/stats',
    '/api/box/ranking/' + id,
    '/api/player/stats/' + id,
  ];
  var results = [];
  var pending = candidates.length;
  candidates.forEach(function(url) {
    fetch(url, {credentials:'include'})
      .then(function(r) {
        return r.json().then(function(d) {
          var keys = Object.keys(d || {});
          if (keys.length > 1) results.push(url + ' [keys: ' + keys.slice(0,5).join(',') + ']');
        });
      })
      .catch(function(){})
      .finally(function() {
        pending--;
        if (pending === 0) {
          if (results.length) alert('Endpoints com dados:\\n' + results.join('\\n'));
          else alert('Nenhum endpoint retornou dados.\\nVerifique o Network tab (F12) ao clicar em Histórico.');
        }
      });
  });
})();`;

  const link = document.getElementById('detect-link');
  if (link) link.href = 'javascript:' + encodeURIComponent(detectCode);
}

/* ─── TOAST ───────────────────────────────── */
function toast(msg, type = 'success') {
  const el = qs('#toast');
  el.textContent = msg;
  el.className   = `toast show ${type === 'error' ? 'error' : ''}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

/* ─── HELPERS ─────────────────────────────── */
const qs    = sel => document.querySelector(sel);
const fmt   = (v, d = 1) => (+v || 0).toFixed(d);
const avg   = (arr, key) => arr.length ? arr.reduce((s, p) => s + (+p[key] || 0), 0) / arr.length : 0;
const first = str => str.split(' ')[0];
const slug  = str => str.toLowerCase().replace(/\s+/g, '-');
const stars = n => '⭐'.repeat(Math.max(1, Math.min(3, n || 1)));
const stat  = (k, v) => `<div class="pc-stat"><span class="pc-stat-k">${k}</span><span class="pc-stat-v">${v}</span></div>`;
const medal = i => i === 1 ? '🥇' : i === 2 ? '🥈' : i === 3 ? '🥉' : `#${i}`;
const escJs = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
