// ============ CONFIGURATION ============
const API_BASE = 'http://localhost:5000/api';

// ============ STATE ============
let allPlayers = [];
let selectedPlayers = [];

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadInitialData();
    setupEventListeners();
    loadRanking();
});

// ============ NAVIGATION ============
function setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            navTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const pane = document.getElementById(tabName);
            if (pane) {
                pane.classList.add('active');

                if (tabName === 'ranking') loadRanking();
                if (tabName === 'best-player') loadBestPlayer();
                if (tabName === 'players') loadPlayers();
                if (tabName === 'team-builder') loadPlayersForTeamBuilder();
            }
        });
    });
}

function setupEventListeners() {
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
        console.error('Erro ao carregar dados:', error);
    }
}

async function loadRanking() {
    const container = document.getElementById('ranking-list');

    if (!container) return;

    container.innerHTML = '<div class="skeleton-loader"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';

    try {
        const response = await fetch(`${API_BASE}/ranking`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            container.innerHTML = data.data.map((player, index) => `
                <div class="rank-item rank-${Math.min(index + 1, 3)}">
                    <div class="rank-position">${getPositionEmoji(index + 1)}</div>
                    <div class="rank-info">
                        <div class="rank-name">
                            <span class="star-rating">${getStarEmoji(player.stars)}</span>
                            ${player.name}
                        </div>
                        <div class="rank-stats">
                            <span>🎯 KDR: ${(player.KDR || 0).toFixed(2)}</span>
                            <span>💥 ADR: ${(player.ADR || 0).toFixed(1)}</span>
                            <span>📊 KAST: ${(player.KAST || 0).toFixed(1)}%</span>
                            <span>📈 Score: ${(player.score || 0).toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">📭 Nenhum jogador registrado ainda</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ff6b6b;">❌ Erro ao carregar ranking</div>';
    }
}

async function loadBestPlayer() {
    const container = document.getElementById('best-player-card');

    if (!container) return;

    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const response = await fetch(`${API_BASE}/best-player`);
        const data = await response.json();

        if (data.success && data.data) {
            const player = data.data;
            container.innerHTML = `
                <div style="text-align: center;">
                    <h3>${player.name}</h3>
                    <div style="font-size: 3em; margin: 20px 0;">${getStarEmoji(player.stars)}</div>
                    <div class="best-player-stats">
                        <div class="stat-box">
                            <div class="stat-label">Score</div>
                            <div class="stat-value">${(player.score || 0).toFixed(1)}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">KDR</div>
                            <div class="stat-value">${(player.KDR || 0).toFixed(2)}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">ADR</div>
                            <div class="stat-value">${(player.ADR || 0).toFixed(1)}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">KAST</div>
                            <div class="stat-value">${(player.KAST || 0).toFixed(1)}%</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">Kills</div>
                            <div class="stat-value">${player.K || 0}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">Deaths</div>
                            <div class="stat-value">${player.D || 0}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">🎮 Sem dados disponíveis</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar best player:', error);
        container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: #ff6b6b;">❌ Erro ao carregar</div>';
    }
}

async function loadPlayers() {
    const container = document.getElementById('players-grid');

    if (!container) return;

    container.innerHTML = '<div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>';

    if (allPlayers.length === 0) {
        await loadInitialData();
    }

    if (allPlayers.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; grid-column: 1/-1; color: var(--text-secondary);">📭 Nenhum jogador registrado</div>';
        return;
    }

    container.innerHTML = allPlayers.map(player => `
        <div class="player-card">
            <div class="player-name">${player.name}</div>
            <div class="player-stars">${getStarEmoji(player.stars)}</div>
            <div class="player-stats-mini">
                <div><strong>Score:</strong> ${(player.score || 0).toFixed(1)}</div>
                <div><strong>KDR:</strong> ${(player.KDR || 0).toFixed(2)}</div>
                <div><strong>ADR:</strong> ${(player.ADR || 0).toFixed(1)}</div>
                <div><strong>KAST:</strong> ${(player.KAST || 0).toFixed(1)}%</div>
                <div><strong>Kills:</strong> ${player.K || 0}</div>
                <div><strong>Deaths:</strong> ${player.D || 0}</div>
                <div><strong>Assists:</strong> ${player.A || 0}</div>
            </div>
        </div>
    `).join('');
}

async function loadPlayersForTeamBuilder() {
    const container = document.getElementById('player-checkboxes');

    if (!container) return;

    container.innerHTML = '<div class="skeleton-grid"><div class="skeleton"></div><div class="skeleton"></div></div>';

    if (allPlayers.length === 0) {
        await loadInitialData();
    }

    if (allPlayers.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">📭 Nenhum jogador disponível</div>';
        return;
    }

    container.innerHTML = allPlayers.map(player => `
        <label class="player-checkbox">
            <input type="checkbox" data-player='${JSON.stringify(player)}' onchange="updateSelectedPlayers()">
            <span>${player.name} ${getStarEmoji(player.stars)}</span>
        </label>
    `).join('');
}

// ============ TEAM BUILDER ============
function updateSelectedPlayers() {
    const checkboxes = document.querySelectorAll('.player-checkbox input:checked');
    selectedPlayers = Array.from(checkboxes).map(cb => JSON.parse(cb.dataset.player));

    const generateBtn = document.getElementById('generate-teams-btn');
    if (generateBtn) {
        generateBtn.disabled = selectedPlayers.length !== 10;
    }
}

async function generateTeams() {
    if (selectedPlayers.length !== 10) {
        alert('❌ Selecione exatamente 10 jogadores!');
        return;
    }

    const generateBtn = document.getElementById('generate-teams-btn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner"></i> <span>Gerando...</span>';

    try {
        const response = await fetch(`${API_BASE}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ players: selectedPlayers })
        });

        const data = await response.json();

        if (data.success && data.data) {
            displayTeams(data.data);
        } else {
            alert('❌ Erro ao gerar times');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao gerar times');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> <span>Gerar Times Balanceados</span>';
    }
}

function displayTeams(teamsData) {
    const resultDiv = document.getElementById('teams-result');

    const createTeamHTML = (team, teamNumber) => {
        return team.map((player, idx) => `
            <div class="team-player">
                <span>${idx + 1}. ${player.name} ${getStarEmoji(player.stars)}</span>
                <span>ADR: ${(player.ADR || 0).toFixed(1)}</span>
            </div>
        `).join('');
    };

    document.getElementById('team-1-value').textContent = `${teamsData.team1_value} ⭐`;
    document.getElementById('team-2-value').textContent = `${teamsData.team2_value} ⭐`;
    document.getElementById('team-1-players').innerHTML = createTeamHTML(teamsData.team1, 1);
    document.getElementById('team-2-players').innerHTML = createTeamHTML(teamsData.team2, 2);

    resultDiv.style.display = 'grid';
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============ UTILITIES ============
function getStarEmoji(stars) {
    return '⭐'.repeat(stars || 1);
}

function getPositionEmoji(position) {
    switch(position) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return position;
    }
}

// ============ HELPERS ============
function formatNumber(num) {
    return parseFloat(num).toFixed(2);
}
