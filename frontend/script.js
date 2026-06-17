const API_BASE = 'http://localhost:5000/api';

let allPlayers = [];
let selectedPlayers = [];

const DEMO_PLAYERS = [
    { name: "Johnny Walker", K: 25, D: 10, A: 8, ADR: 120.5, KDR: 2.5, KAST: 82, score: 85.2, stars: 3 },
    { name: "Lúcida", K: 20, D: 12, A: 7, ADR: 95.3, KDR: 1.67, KAST: 75, score: 72.1, stars: 2 },
    { name: "Phoenix", K: 18, D: 14, A: 6, ADR: 88.2, KDR: 1.29, KAST: 70, score: 65.4, stars: 2 },
    { name: "Apex", K: 22, D: 11, A: 9, ADR: 105.1, KDR: 2.0, KAST: 78, score: 78.9, stars: 3 },
    { name: "Ghost", K: 16, D: 16, A: 5, ADR: 75.4, KDR: 1.0, KAST: 65, score: 55.3, stars: 1 },
    { name: "Shadow", K: 19, D: 13, A: 8, ADR: 92.7, KDR: 1.46, KAST: 72, score: 68.5, stars: 2 },
    { name: "Nova", K: 23, D: 9, A: 10, ADR: 115.2, KDR: 2.56, KAST: 85, score: 82.1, stars: 3 },
    { name: "Titan", K: 14, D: 18, A: 4, ADR: 68.9, KDR: 0.78, KAST: 60, score: 48.2, stars: 1 },
];

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadInitialData();
    loadDashboard();
});

// ============ NAVIGATION ============
function setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const sections = document.querySelectorAll('.tab-section');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            navTabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            tab.classList.add('active');
            const section = document.getElementById(tabName);
            if (section) {
                section.classList.add('active');

                if (tabName === 'ranking') loadRanking();
                if (tabName === 'players') loadPlayers();
                if (tabName === 'team-builder') loadTeamBuilder();
            }
        });
    });

    const generateBtn = document.getElementById('generate-teams-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateTeams);
    }

    const steamBtn = document.querySelector('.btn-steam');
    if (steamBtn) {
        steamBtn.addEventListener('click', () => {
            alert('🔐 Login Steam será implementado em breve!');
        });
    }
}

// ============ DATA LOADING ============
async function loadInitialData() {
    try {
        const response = await fetch(`${API_BASE}/players`);
        const data = await response.json();
        if (data.success) {
            allPlayers = data.data || [];
        } else {
            allPlayers = DEMO_PLAYERS;
        }
    } catch (error) {
        console.log('Usando dados de exemplo');
        allPlayers = DEMO_PLAYERS;
    }
}

async function loadDashboard() {
    try {
        if (allPlayers.length === 0) {
            await loadInitialData();
        }

        const ranking = [...allPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));

        document.getElementById('stat-total').textContent = allPlayers.length;
        document.getElementById('stat-matches').textContent = allPlayers.length * 5;

        if (ranking.length > 0) {
            document.getElementById('stat-best').textContent = ranking[0].name.split(' ')[0];
            const avgScore = (ranking.reduce((a, b) => a + (b.score || 0), 0) / ranking.length).toFixed(1);
            document.getElementById('stat-avg').textContent = avgScore;

            displayBestPlayer(ranking[0]);
        }

        displayTopPlayers(ranking.slice(0, 5));
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function displayBestPlayer(player) {
    const container = document.getElementById('best-player-content');
    container.innerHTML = `
        <div class="best-player-name">${player.name}</div>
        <div class="best-player-stars">${getStarEmoji(player.stars)}</div>
        <div class="best-player-stats">
            <div class="stat-item">
                <div class="stat-item-label">Score</div>
                <div class="stat-item-value">${(player.score || 0).toFixed(1)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item-label">KDR</div>
                <div class="stat-item-value">${(player.KDR || 0).toFixed(2)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item-label">ADR</div>
                <div class="stat-item-value">${(player.ADR || 0).toFixed(1)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item-label">KAST</div>
                <div class="stat-item-value">${(player.KAST || 0).toFixed(0)}%</div>
            </div>
        </div>
    `;
}

function displayTopPlayers(players) {
    const container = document.getElementById('top-players');
    if (!players || players.length === 0) {
        container.innerHTML = '<p>Sem dados</p>';
        return;
    }

    container.innerHTML = players.map((p, i) => `
        <div class="player-row">
            <div class="player-rank">${i + 1}</div>
            <div class="player-info">
                <div class="player-name">${p.name}</div>
                <div class="player-stats">${getStarEmoji(p.stars)} • KDR: ${(p.KDR || 0).toFixed(2)}</div>
            </div>
            <div class="player-score">${(p.score || 0).toFixed(1)}</div>
        </div>
    `).join('');
}

async function loadRanking() {
    const container = document.getElementById('ranking-list');

    if (allPlayers.length === 0) {
        await loadInitialData();
    }

    const ranking = [...allPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));

    container.innerHTML = ranking.map((p, i) => `
        <div class="ranking-row">
            <div class="ranking-position">${getPositionEmoji(i + 1)}</div>
            <div class="ranking-details">
                <div class="ranking-name">${p.name}</div>
                <div class="ranking-stats">
                    <span>${getStarEmoji(p.stars)}</span>
                    <span>KDR: ${(p.KDR || 0).toFixed(2)}</span>
                    <span>ADR: ${(p.ADR || 0).toFixed(1)}</span>
                </div>
            </div>
            <div class="ranking-score">${(p.score || 0).toFixed(1)}</div>
        </div>
    `).join('');
}

async function loadPlayers() {
    const container = document.getElementById('players-grid');

    if (allPlayers.length === 0) {
        await loadInitialData();
    }

    container.innerHTML = allPlayers.map(p => `
        <div class="glass-card player-card">
            <div class="player-card-title">${p.name}</div>
            <div class="player-card-stars">${getStarEmoji(p.stars)}</div>
            <div class="player-card-stats">
                <div class="player-card-stat">
                    <span class="player-card-stat-label">Score</span>
                    <span class="player-card-stat-value">${(p.score || 0).toFixed(1)}</span>
                </div>
                <div class="player-card-stat">
                    <span class="player-card-stat-label">KDR</span>
                    <span class="player-card-stat-value">${(p.KDR || 0).toFixed(2)}</span>
                </div>
                <div class="player-card-stat">
                    <span class="player-card-stat-label">ADR</span>
                    <span class="player-card-stat-value">${(p.ADR || 0).toFixed(1)}</span>
                </div>
                <div class="player-card-stat">
                    <span class="player-card-stat-label">Kills</span>
                    <span class="player-card-stat-value">${p.K || 0}</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadTeamBuilder() {
    const container = document.getElementById('player-checkboxes');

    if (allPlayers.length === 0) {
        await loadInitialData();
    }

    container.innerHTML = allPlayers.map(p => `
        <label class="checkbox-item">
            <input type="checkbox" data-player='${JSON.stringify(p)}' onchange="updateSelectedPlayers()">
            <span class="checkbox-label">${p.name} ${getStarEmoji(p.stars)}</span>
        </label>
    `).join('');
}

function updateSelectedPlayers() {
    const checks = document.querySelectorAll('.checkbox-item input:checked');
    selectedPlayers = Array.from(checks).map(c => JSON.parse(c.dataset.player));

    const btn = document.getElementById('generate-teams-btn');
    btn.disabled = selectedPlayers.length !== 10;
}

async function generateTeams() {
    if (selectedPlayers.length !== 10) {
        alert('Selecione 10 jogadores!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ players: selectedPlayers })
        });

        const data = await response.json();
        if (data.success) {
            displayTeams(data.data);
        }
    } catch (error) {
        alert('Erro ao gerar times');
    }
}

function displayTeams(teams) {
    const result = document.getElementById('teams-result');

    document.getElementById('team-1-value').textContent = `${teams.team1_value}⭐`;
    document.getElementById('team-2-value').textContent = `${teams.team2_value}⭐`;

    document.getElementById('team-1-players').innerHTML = teams.team1.map((p, i) => `
        <div class="team-player-item">
            <span class="team-player-name">${i + 1}. ${p.name} ${getStarEmoji(p.stars)}</span>
            <span class="team-player-adr">ADR: ${(p.ADR || 0).toFixed(1)}</span>
        </div>
    `).join('');

    document.getElementById('team-2-players').innerHTML = teams.team2.map((p, i) => `
        <div class="team-player-item">
            <span class="team-player-name">${i + 1}. ${p.name} ${getStarEmoji(p.stars)}</span>
            <span class="team-player-adr">ADR: ${(p.ADR || 0).toFixed(1)}</span>
        </div>
    `).join('');

    result.style.display = 'grid';
}

function getStarEmoji(stars) {
    return '⭐'.repeat(stars || 1);
}

function getPositionEmoji(pos) {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return pos;
}
