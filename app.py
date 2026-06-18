from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, time
import requests
import sys
import os
from apscheduler.schedulers.background import BackgroundScheduler
from urllib.parse import urlencode

sys.path.insert(0, 'backend')
from utils.star_calculator import calculate_player_stars
from utils.team_balancer import balance_teams
from utils.gamersclub_scraper import get_player, get_team, get_player_matches

app = Flask(__name__, static_folder='frontend', static_url_path='')
app.secret_key = 'cs-ranking-hub-secret-key-2024'
CORS(app, supports_credentials=True)

# ============ FIREBASE ============
try:
    firebase_key_b64 = os.getenv('FIREBASE_KEY_B64')
    if firebase_key_b64:
        import base64, json as _json
        key_dict = _json.loads(base64.b64decode(firebase_key_b64))
        cred = credentials.Certificate(key_dict)
    else:
        cred = credentials.Certificate('firebase-key.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase conectado")
except Exception as e:
    print(f"Firebase init error: {e}")
    db = None

# ============ STEAM CONFIG ============
STEAM_API_KEY = os.getenv('STEAM_API_KEY', '1B861D0A148D9A41C119C3592BB49C42')
STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
STEAM_API_BASE = 'https://api.steampowered.com'

# ============ SCHEDULER ============
scheduler = BackgroundScheduler()

def sync_players_data():
    """Sincroniza dados dos jogadores com Steam - roda às 7h da manhã"""
    print(f"[{datetime.now()}] Sincronizando dados dos jogadores com Steam...")
    try:
        # Buscar usuários vinculados ao Steam
        users = db.collection('steam_users').stream()

        for user_doc in users:
            user = user_doc.to_dict()
            steam_id = user.get('steam_id')

            if steam_id:
                # Buscar stats do CS:GO
                player_data = get_steam_player_stats(steam_id)
                if player_data:
                    # Salvar/atualizar no Firebase
                    player_name = user.get('name', f"Player_{steam_id}")
                    star_info = calculate_player_stars(player_data)
                    player_data.update(star_info)
                    player_data['updated_at'] = datetime.now()

                    db.collection('players').document(player_name).set(player_data)
                    print(f"✅ {player_name} atualizado")

        print("✅ Sincronização concluída!")
    except Exception as e:
        print(f"❌ Erro na sincronização: {e}")

def get_steam_player_stats(steam_id):
    """Busca stats do CS:GO do jogador no Steam"""
    try:
        url = f"{STEAM_API_BASE}/ISteamUserStats/GetUserStatsForGame/v0002/"
        params = {
            'appid': 730,  # CS:GO app ID
            'steamid': steam_id,
            'key': STEAM_API_KEY
        }

        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data.get('playerstats'):
            stats = {stat['name']: stat['value'] for stat in data['playerstats'].get('stats', [])}

            # Extrair dados principais
            return {
                'steam_id': steam_id,
                'K': stats.get('total_kills', 0),
                'D': stats.get('total_deaths', 0),
                'A': stats.get('total_assists', 0),
                'ADR': stats.get('total_damage_dealt', 0) / max(stats.get('total_rounds_played', 1), 1),
                'KDR': stats.get('total_kills', 0) / max(stats.get('total_deaths', 1), 1),
                'KAST': 65,  # Steam API não fornece KAST direto
                'FK': stats.get('total_first_kills', 0),
                'DROP': 0
            }
    except Exception as e:
        print(f"Erro ao buscar stats Steam: {e}")
        return None

# ============ SCHEDULER SETUP ============
scheduler.add_job(
    func=sync_players_data,
    trigger='cron',
    hour=7,
    minute=0,
    id='daily_sync',
    name='Sincronização diária às 7h'
)
scheduler.start()
print("✅ Scheduler iniciado - sincronização às 7h")

# ============ ROUTES ============

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

# ============ STEAM LOGIN ============
@app.route('/api/steam/login', methods=['GET'])
def steam_login():
    """Inicia login via Steam OpenID"""
    return_url = request.host_url.rstrip('/') + '/api/steam/callback'

    params = {
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.mode': 'checkid_setup',
        'openid.return_to': return_url,
        'openid.realm': request.host_url.rstrip('/'),
        'openid.ns.sreg': 'http://openid.net/extensions/sreg/1.1',
        'openid.sreg.required': 'email,fullname'
    }

    login_url = STEAM_OPENID_URL + '?' + urlencode(params)
    return redirect(login_url)

@app.route('/api/steam/callback', methods=['GET'])
def steam_callback():
    """Processa retorno do Steam OpenID"""
    try:
        # Verificar resposta do Steam
        params = {
            'openid.ns': request.args.get('openid.ns'),
            'openid.identity': request.args.get('openid.identity'),
            'openid.claimed_id': request.args.get('openid.claimed_id'),
            'openid.mode': 'check_auth',
            'openid.return_to': request.args.get('openid.return_to'),
            'openid.response_nonce': request.args.get('openid.response_nonce'),
            'openid.assoc_handle': request.args.get('openid.assoc_handle'),
            'openid.signed': request.args.get('openid.signed'),
            'openid.sig': request.args.get('openid.sig'),
        }

        response = requests.post(STEAM_OPENID_URL, params, timeout=10)

        if 'is_valid:true' in response.text:
            # Extrair Steam ID da URL
            claimed_id = request.args.get('openid.claimed_id', '')
            steam_id = claimed_id.split('/')[-1]

            # Buscar info do perfil Steam
            profile_url = f"{STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/"
            profile_params = {'key': STEAM_API_KEY, 'steamids': steam_id}
            profile_response = requests.get(profile_url, params=profile_params)
            profile_data = profile_response.json()

            if profile_data.get('response', {}).get('players'):
                player = profile_data['response']['players'][0]
                player_name = player.get('personaname', f'Player_{steam_id}')

                # Salvar no Firebase
                user_data = {
                    'steam_id': steam_id,
                    'name': player_name,
                    'avatar': player.get('avatarfull'),
                    'linked_at': datetime.now(),
                    'last_sync': datetime.now()
                }

                db.collection('steam_users').document(steam_id).set(user_data)

                # Buscar stats iniciais
                stats = get_steam_player_stats(steam_id)
                if stats:
                    star_info = calculate_player_stars(stats)
                    stats.update(star_info)
                    stats['updated_at'] = datetime.now()
                    db.collection('players').document(player_name).set(stats)

                # Redirecionar pro frontend com sucesso
                return redirect(f"/?login=success&player={player_name}")

    except Exception as e:
        print(f"Erro no callback Steam: {e}")

    return redirect('/?login=error')

# ============ PLAYERS API ============
@app.route('/api/players', methods=['GET'])
def get_players():
    try:
        players = []
        docs = db.collection('players').stream()
        for doc in docs:
            players.append(doc.to_dict())
        return jsonify({'success': True, 'data': players})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ranking', methods=['GET'])
def get_ranking():
    try:
        players = []
        docs = db.collection('players').stream()
        for doc in docs:
            players.append(doc.to_dict())
        ranking = sorted(players, key=lambda p: p.get('score', 0), reverse=True)
        return jsonify({'success': True, 'data': ranking})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/best-player', methods=['GET'])
def get_best_player():
    try:
        players = []
        docs = db.collection('players').stream()
        for doc in docs:
            players.append(doc.to_dict())
        best = sorted(players, key=lambda p: p.get('score', 0), reverse=True)
        if best:
            return jsonify({'success': True, 'data': best[0]})
        return jsonify({'success': False, 'data': None})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/player', methods=['POST'])
def add_player():
    try:
        data = request.get_json()
        star_info = calculate_player_stars(data)
        data.update(star_info)
        data['updated_at'] = datetime.now()
        db.collection('players').document(data['name']).set(data)
        return jsonify({'success': True, 'message': 'Player added'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/teams', methods=['POST'])
def generate_teams():
    try:
        data = request.get_json()
        players = data.get('players', [])
        if len(players) != 10:
            return jsonify({'success': False, 'error': 'Need 10 players'}), 400
        balanced = balance_teams(players, team_size=5)
        return jsonify({'success': True, 'data': balanced})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ GAMERSCLUB API ============

@app.route('/api/gamersclub/player/<player_id>', methods=['GET'])
def gc_get_player(player_id):
    """Busca dados brutos de um jogador no GamersClub."""
    try:
        data = get_player(player_id)
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/gamersclub/sync-player', methods=['POST'])
def gc_sync_player():
    """
    Busca stats de um jogador no GamersClub e salva no Firestore.
    Body: { "gc_player_id": "123", "name": "NomeOptional" }
    """
    try:
        body        = request.get_json()
        player_id   = body.get('gc_player_id') or body.get('player_id')
        custom_name = body.get('name')

        if not player_id:
            return jsonify({'success': False, 'error': 'gc_player_id obrigatório'}), 400

        gc_data = get_player(player_id)

        if custom_name:
            gc_data['name'] = custom_name

        name = gc_data.get('name', f'Player_{player_id}')

        star_info = calculate_player_stars(gc_data)
        gc_data.update(star_info)
        gc_data['updated_at'] = datetime.now()
        gc_data['source'] = 'gamersclub'

        if db:
            db.collection('players').document(name).set(gc_data)

        return jsonify({'success': True, 'data': gc_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/gamersclub/sync-team', methods=['POST'])
def gc_sync_team():
    """
    Busca todos os jogadores de um time no GamersClub e salva cada um no Firestore.
    Body: { "gc_team_id": "456" }
    """
    try:
        body    = request.get_json()
        team_id = body.get('gc_team_id') or body.get('team_id')

        if not team_id:
            return jsonify({'success': False, 'error': 'gc_team_id obrigatório'}), 400

        team    = get_team(team_id)
        results = []

        for p in team.get('players', []):
            try:
                gc_data   = get_player(p['gc_player_id'])
                name      = gc_data.get('name', f"Player_{p['gc_player_id']}")
                star_info = calculate_player_stars(gc_data)
                gc_data.update(star_info)
                gc_data['updated_at'] = datetime.now()
                gc_data['source']     = 'gamersclub'

                if db:
                    db.collection('players').document(name).set(gc_data)

                results.append({'player': name, 'status': 'ok'})
            except Exception as pe:
                results.append({'player': p['gc_player_id'], 'status': 'error', 'error': str(pe)})

        return jsonify({'success': True, 'synced': len(results), 'results': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/gamersclub/matches/<player_id>', methods=['GET'])
def gc_player_matches(player_id):
    """Retorna histórico de partidas de um jogador no GamersClub."""
    try:
        matches = get_player_matches(player_id)
        return jsonify({'success': True, 'data': matches})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============ ADMIN API ============
@app.route('/api/sync-now', methods=['POST'])
def sync_now():
    """Sincroniza dados agora (manual)"""
    try:
        sync_players_data()
        return jsonify({'success': True, 'message': 'Sincronização iniciada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
