// API Configuration
const API_BASE = 'http://localhost:5000/api';

// State Management
let allPlayers = [];
let selectedPlayers = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadInitialData();
    setupEventListeners();
});

// Tab Navigation
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            if (tabName === 'ranking') loadRanking();
            if (tabName === 'best-player') loadBestPlayer();
            if (tabName === 'players') loadPlayers();
            if (tabName === 'team-builder') loadPlayersForTeamBuilder();
        });
    });
}

function setupEventListeners() {
    const generateBtn = document.getElementById('generate-teams-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateTeams);
    }
}

async function loadInitialData() {
    try {
        const response = await fetch(`${API_BASE}/players`);
        const data = await response.json();
        if (data.success) allPlayers = data.data || [];
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function loadRanking() {
    const container = document.getElementById('ranking-list');
    try {
        const response = await fetch(`${API_BASE}/ranking`);
        const data = await response.json();
        if (data.success && data.data) {
            container.innerHTML = data.data.map((p, i) => `
                <div class="rank-item"><strong>#${i+1}</strong> ${p.name} ${getStarEmoji(p.stars)} 
                Score: ${(p.score || 0).toFixed(1)}</div>
            `).join('');
        }
    } catch (error) {
        container.innerHTML = '<p>Erro ao carregar</p>';
    }
}

async function loadBestPlayer() {
    const container = document.getElementById('best-player-card');
    try {
        const response = await fetch(`${API_BASE}/best-player`);
        const data = await response.json();
        if (data.success && data.data) {
            const p = data.data;
            container.innerHTML = `<div><h3>${p.name}</h3>${getStarEmoji(p.stars)} Score: ${(p.score || 0).toFixed(1)}</div>`;
        }
    } catch (error) {
        container.innerHTML = '<p>Erro</p>';
    }
}

async function loadPlayers() {
    const container = document.getElementById('players-grid');
    if (!allPlayers.length) await loadInitialData();
    container.innerHTML = allPlayers.map(p => `
        <div class="player-card"><strong>${p.name}</strong> ${getStarEmoji(p.stars)}<br>Score: ${(p.score||0).toFixed(1)}</div>
    `).join('');
}

async function loadPlayersForTeamBuilder() {
    const container = document.getElementById('player-checkboxes');
    if (!allPlayers.length) await loadInitialData();
    container.innerHTML = allPlayers.map(p => `
        <label class="player-checkbox">
            <input type="checkbox" data-player='${JSON.stringify(p)}' onchange="updateSelectedPlayers()">
            ${p.name} ${getStarEmoji(p.stars)}
        </label>
    `).join('');
}

function updateSelectedPlayers() {
    const checks = document.querySelectorAll('.player-checkbox input:checked');
    selectedPlayers = Array.from(checks).map(c => JSON.parse(c.dataset.player));
    document.getElementById('generate-teams-btn').disabled = selectedPlayers.length !== 10;
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
        if (data.success) displayTeams(data.data);
    } catch (e) {
        alert('Erro');
    }
}

function displayTeams(teams) {
    const result = document.getElementById('teams-result');
    result.style.display = 'grid';
    document.getElementById('team-1-players').innerHTML = teams.team1.map((p, i) => 
        `<div class="team-player">${i+1}. ${p.name} ${getStarEmoji(p.stars)}</div>`
    ).join('');
    document.getElementById('team-2-players').innerHTML = teams.team2.map((p, i) => 
        `<div class="team-player">${i+1}. ${p.name} ${getStarEmoji(p.stars)}</div>`
    ).join('');
}

function getStarEmoji(stars) {
    return '⭐'.repeat(stars || 1);
}
