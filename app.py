from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import requests
import sys
import os

def _now():
    return datetime.now().isoformat()

def _clean(doc):
    """Converte campos não-serializáveis de documentos Firestore para string."""
    out = {}
    for k, v in doc.items():
        if hasattr(v, 'isoformat'):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out

sys.path.insert(0, 'backend')
from utils.star_calculator import calculate_player_stars
from utils.team_balancer import balance_teams
from utils.gamersclub_scraper import get_player, get_team, get_player_matches, import_player

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


# ============ ROUTES ============

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({'firebase': db is not None, 'status': 'ok'})

# ============ PLAYERS API ============
@app.route('/api/players', methods=['GET'])
def get_players():
    if not db:
        return jsonify({'success': False, 'error': 'Firebase não conectado'}), 500
    try:
        players = [_clean(doc.to_dict()) for doc in db.collection('players').stream()]
        return jsonify({'success': True, 'data': players})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ranking', methods=['GET'])
def get_ranking():
    if not db:
        return jsonify({'success': False, 'error': 'Firebase não conectado'}), 500
    try:
        players = [_clean(doc.to_dict()) for doc in db.collection('players').stream()]
        ranking = sorted(players, key=lambda p: p.get('score', 0), reverse=True)
        return jsonify({'success': True, 'data': ranking})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/best-player', methods=['GET'])
def get_best_player():
    if not db:
        return jsonify({'success': False, 'error': 'Firebase não conectado'}), 500
    try:
        players = [_clean(doc.to_dict()) for doc in db.collection('players').stream()]
        best = sorted(players, key=lambda p: p.get('score', 0), reverse=True)
        return jsonify({'success': True, 'data': best[0] if best else None})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/player', methods=['POST'])
def add_player():
    if not db:
        return jsonify({'success': False, 'error': 'Firebase não conectado'}), 500
    try:
        data = request.get_json()
        star_info = calculate_player_stars(data)
        data.update(star_info)
        data['updated_at'] = _now()
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
        gc_data['updated_at'] = _now()
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
                gc_data['updated_at'] = _now()
                gc_data['source']     = 'gamersclub'

                if db:
                    db.collection('players').document(name).set(gc_data)

                results.append({'player': name, 'status': 'ok'})
            except Exception as pe:
                results.append({'player': p['gc_player_id'], 'status': 'error', 'error': str(pe)})

        return jsonify({'success': True, 'synced': len(results), 'results': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/gamersclub/import', methods=['POST'])
def gc_import_player():
    """
    Recebe dados brutos do GamersClub vindos do bookmarklet (browser do usuário)
    e salva no Firestore. Resolve o bloqueio de IP do servidor.
    Body: response JSON de gamersclub.com.br/api/box/init/{id}
    """
    try:
        raw  = request.get_json()
        if not raw or 'playerInfo' not in raw:
            return jsonify({'success': False, 'error': 'Dados inválidos — envie o JSON de /api/box/init/{id}'}), 400

        gc_data   = import_player(raw)
        name      = gc_data.get('name', f"Player_{gc_data.get('gc_player_id', 'unknown')}")
        star_info = calculate_player_stars(gc_data)
        gc_data.update(star_info)
        gc_data['updated_at'] = _now()
        gc_data['source']     = 'gamersclub'

        if not db:
            return jsonify({'success': False, 'error': 'Firebase não conectado — verifique FIREBASE_KEY_B64 no Render'}), 500

        db.collection('players').document(name).set(gc_data)
        return jsonify({'success': True, 'player': name})
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



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
