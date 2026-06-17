const API_BASE = 'http://localhost:5000/api';

let allPlayers = [];
let selectedPlayers = [];

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadInitialData();
    loadDashboard();
});

// ============ NAVIGATION ============
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.tab-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;

            navItems.forEach(n => n.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const section = document.getElementById(tabName);
            if (section) {
                section.classList.add('active');

                if (tabName === 'ranking') loadRanking();
                if (tabName === 'players') loadPlayers();
                if (tabName === 'team-builder') loadPlayersForTeamBuilder();
                if (tabName === 'dashboard') loadDashboard();
            }
        });
    });

    const generateBtn = document.getElementById('generate-teams-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateTeams);
    }
}

// ============ DATA LOADING ============
async function loadInitialData() {
    try {
        const response = await fetch(`${API_BASE}/players`);
        const data = await response.json();
        if (data.success) {
            allPlayers = data.data || [];
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/players`);
        const data = await response.json();

        if (data.success && data.data) {
            const players = data.data;

            document.getElementById('stat-total-players').textContent = players.length;

            const ranking = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

            if (ranking.length > 0) {
                const best = ranking[0];
                document.getElementById('stat-best-player').textContent = best.name.substring(0, 15);
                document.getElementById('stat-best-score').textContent = `Score: ${(best.score || 0).toFixed(1)}`;

                displayBestPlayer(best);
            }

            displayTopPlayers(ranking.slice(0, 5));
        }
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
                <div class="stat-item-value">${(player.KAST || 0).toFixed(1)}%</div>
            </div>
        </div>
    `;
}

function displayTopPlayers(players) {
    const container = document.getElementById('top-players-list');

    if (!players || players.length === 0) {
        container.innerHTML = '<div class="empty-state">Sem dados</div>';
        return;
    }

    container.innerHTML = players.map((player, idx) => `
        <div class="player-row">
            <div class="player-rank">${idx + 1}</div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
                <div class="player-stats">${getStarEmoji(player.stars)} • KDR: ${(player.KDR || 0).toFixed(2)}</div>
            </div>
            <div class="player-score">${(player.score || 0).toFixed(1)}</div>
        </div>
    `).join('');
}

async function loadRanking() {
    const container = document.getElementById('ranking-list');
    container.innerHTML = '<div class="empty-state">Carregando...</div>';

    try {
        const response = await fetch(`${API_BASE}/ranking`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            container.innerHTML = data.data.map((player, idx) => `
                <div class="ranking-row">
                    <div class="ranking-position">${getPositionEmoji(idx + 1)}</div>
                    <div class="ranking-details">
                        <div class="ranking-name">${player.name}</div>
                        <div class="ranking-stats">
                            <span>${getStarEmoji(player.stars)}</span>
                            <span>KDR: ${(player.KDR || 0).toFixed(2)}</span>
                            <span>ADR: ${(player.ADR || 0).toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="ranking-score">${(player.score || 0).toFixed(1)}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">Sem jogadores registrados</div>';
        }
    } catch (error) {
        console.error('Erro:', error);
        container.innerHTML = '<div class="empty-state">Erro ao carregar</div>';
    }
}

async function loadPlayers() {
    const container = document.getElementById('players-grid');
    container.innerHTML = '<div class="empty-state">Carregando...</div>';

    if (allPlayers.length === 0) {
        await loadInitialData();
    }

    if (allPlayers.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum jogador registrado</div>';
        return;
    }

    container.innerHTML = allPlayers.map(player => `
        <div class="player-card">
            <div class="player-card-title">${player.name}</div>
            <div class="player-card-stars">${getStarEmoji(player.stars)}</div>
            <div class="player-card-stats">
                <div class="player-card-stat">
                    <span class="player-card-stat-label">Score</span>
                    <span class="player-card-stat-value">${(player.score || 0).toFixed(1)}</span>
                </div>
                <div class="player-card-stat">
                    <span class="player-card-stat-label">KDR</span>
                    <span class="player-card-stat-value">${(player.KDR || 0).toFixed(2)}</span>
                </div>
                <div class="player-card-stat">
                    <span class="player-card-stat-label">ADR</span>
                    <span class="player-card-stat-value">${(player.ADR || 0).toFixed(1)}</span>
                </div>
                <div class="player-card-stat">
                    <span class="player-card-stat-label">KAST</span>
                    <span class="player-card-stat-value">${(player.KAST || 0).toFixed(1)}%</span>
                </div>
                <div class="player-card-stat">
                    <span class="player-card-stat-label">Kills</span>
                    <span class="player-card-stat-value">${player.K || 0}</span>
                </div>
                <div class="player-card-stat">
                    <span class="player-card-stat-label">Deaths</span>
                    <span class="player-card-stat-value">${player.D || 0}</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadPlayersForTeamBuilder() {
    const container = document.getElementById('player-checkboxes');
    container.innerHTML = '<div class="empty-state">Carregando...</div>';

    if (allPlayers.length === 0) {
        await loadInitialData();
    }

    if (allPlayers.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum jogador disponível</div>';
        return;
    }

    container.innerHTML = allPlayers.map(player => `
        <label class="checkbox-item">
            <input type="checkbox" data-player='${JSON.stringify(player)}' onchange="updateSelectedPlayers()">
            <span class="checkbox-label">${player.name} ${getStarEmoji(player.stars)}</span>
        </label>
    `).join('');
}

// ============ TEAM BUILDER ============
function updateSelectedPlayers() {
    const checkboxes = document.querySelectorAll('.checkbox-item input:checked');
    selectedPlayers = Array.from(checkboxes).map(cb => JSON.parse(cb.dataset.player));

    const generateBtn = document.getElementById('generate-teams-btn');
    if (generateBtn) {
        generateBtn.disabled = selectedPlayers.length !== 10;
    }
}

async function generateTeams() {
    if (selectedPlayers.length !== 10) {
        alert('Selecione exatamente 10 jogadores!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ players: selectedPlayers })
        });

        const data = await response.json();

        if (data.success && data.data) {
            displayTeams(data.data);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao gerar times');
    }
}

function displayTeams(teamsData) {
    const resultDiv = document.getElementById('teams-result');

    document.getElementById('team-1-value').textContent = `${teamsData.team1_value}⭐`;
    document.getElementById('team-2-value').textContent = `${teamsData.team2_value}⭐`;

    document.getElementById('team-1-players').innerHTML = teamsData.team1.map((p, i) => `
        <div class="team-player-item">
            <span class="team-player-name">${i + 1}. ${p.name} ${getStarEmoji(p.stars)}</span>
            <span class="team-player-adr">ADR: ${(p.ADR || 0).toFixed(1)}</span>
        </div>
    `).join('');

    document.getElementById('team-2-players').innerHTML = teamsData.team2.map((p, i) => `
        <div class="team-player-item">
            <span class="team-player-name">${i + 1}. ${p.name} ${getStarEmoji(p.stars)}</span>
            <span class="team-player-adr">ADR: ${(p.ADR || 0).toFixed(1)}</span>
        </div>
    `).join('');

    resultDiv.style.display = 'grid';
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

// ============ UTILITIES ============
function getStarEmoji(stars) {
    return '⭐'.repeat(stars || 1);
}

function getPositionEmoji(pos) {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return pos;
}
