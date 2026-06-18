from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import requests
import sys
import os

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    _sched_ok = True
except ImportError:
    _sched_ok = False

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
_firebase_error = None
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
    _firebase_error = str(e)
    print(f"Firebase init error: {e}")
    db = None


# ============ SNAPSHOTS / SCHEDULER ============

def _save_snapshot(player_data):
    """Salva snapshot diário por jogador (1 doc por dia, upsert)."""
    if not db:
        return
    name = player_data.get('name', 'unknown')
    date = datetime.now().strftime('%Y-%m-%d')
    doc_id = f"{name}_{date}".replace(' ', '_').replace('/', '-')
    snap = {
        'player_name': name,
        'gc_player_id': str(player_data.get('gc_player_id', '')),
        'score': float(player_data.get('score', 0)),
        'stars': int(player_data.get('stars', 1)),
        'KDR':  float(player_data.get('KDR', 0)),
        'ADR':  float(player_data.get('ADR', 0)),
        'KAST': float(player_data.get('KAST', 0)),
        'avatar': player_data.get('avatar', ''),
        'snapshot_date': date,
        'created_at': _now(),
    }
    db.collection('snapshots').document(doc_id).set(snap)



def _save_matches(player_name, matches):
    """Salva partidas individuais no Firestore (upsert por match_id + player)."""
    if not db or not matches:
        return
    for m in matches:
        match_id = m.get('match_id', '')
        if not match_id:
            continue
        doc_id = f"{match_id}_{player_name}".replace(' ', '_').replace('/', '-')
        m['player_name'] = player_name
        db.collection('matches').document(doc_id).set(m)


def _auto_snapshot():
    """Scheduler: cria snapshots para todos os jogadores às 7h."""
    if not db:
        return
    try:
        players = [doc.to_dict() for doc in db.collection('players').stream()]
        for p in players:
            _save_snapshot(p)
        print(f"[{_now()}] ✅ Snapshots criados: {len(players)} jogadores")
    except Exception as e:
        print(f"[{_now()}] ❌ Erro no snapshot: {e}")


if _sched_ok:
    try:
        _scheduler = BackgroundScheduler(daemon=True)
        _scheduler.add_job(func=_auto_snapshot, trigger='cron', hour=7, minute=0)
        _scheduler.start()
        print("✅ Scheduler 7h ativo")
    except Exception as e:
        print(f"Scheduler error: {e}")


# ============ ROUTES ============

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', '')

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({'firebase': db is not None, 'firebase_error': _firebase_error, 'status': 'ok'})

@app.route('/api/auth', methods=['POST'])
def auth():
    data = request.get_json()
    if not ADMIN_PASSWORD:
        return jsonify({'success': False, 'error': 'ADMIN_PASSWORD não configurado no servidor'}), 500
    if data.get('password') == ADMIN_PASSWORD:
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Senha incorreta'}), 401

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
@app.route('/api/ranking/<period>', methods=['GET'])
def get_ranking(period='all'):
    if not db:
        return jsonify({'success': False, 'error': 'Firebase não conectado'}), 500
    try:
        if period == 'all':
            players = [_clean(doc.to_dict()) for doc in db.collection('players').stream()]
            ranking = sorted(players, key=lambda p: p.get('score', 0), reverse=True)
            return jsonify({'success': True, 'data': ranking})

        days = 7 if period == 'weekly' else 30
        cutoff = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

        # Agrega stats das partidas reais do período
        all_players = {doc.id: _clean(doc.to_dict()) for doc in db.collection('players').stream()}
        player_agg = {}

        for doc in db.collection('matches').stream():
            m = doc.to_dict()
            match_date = m.get('date', '')
            if not match_date or match_date < cutoff:
                continue
            pname = m.get('player_name', '')
            if not pname:
                continue
            if pname not in player_agg:
                player_agg[pname] = {'matches': 0, 'wins': 0, 'total_rating': 0.0, 'maps': []}
            player_agg[pname]['matches'] += 1
            if m.get('win'):
                player_agg[pname]['wins'] += 1
            player_agg[pname]['total_rating'] += float(m.get('rating', 0))
            if m.get('map'):
                player_agg[pname]['maps'].append(m['map'])

        if not player_agg:
            # Fallback para snapshots se não houver partidas com data
            for doc in db.collection('snapshots').stream():
                s = doc.to_dict()
                if s.get('snapshot_date', '') >= cutoff:
                    pname = s.get('player_name', '')
                    if not pname:
                        continue
                    if pname not in player_agg:
                        player_agg[pname] = {'matches': 0, 'wins': 0, 'total_rating': float(s.get('score', 0)), 'maps': []}

        ranking = []
        for pname, agg in player_agg.items():
            base = all_players.get(pname, {'name': pname})
            n = agg['matches'] or 1
            entry = {
                **base,
                'period_matches': agg['matches'],
                'period_wins':    agg['wins'],
                'win_rate':       round(agg['wins'] / n * 100, 1),
                'avg_rating':     round(agg['total_rating'] / n, 2),
                'top_map':        max(set(agg['maps']), key=agg['maps'].count) if agg['maps'] else '',
            }
            ranking.append(entry)

        ranking.sort(key=lambda p: (p['period_matches'], p.get('avg_rating', 0)), reverse=True)
        return jsonify({'success': True, 'data': ranking, 'period': period, 'days': days})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/stats/map-week', methods=['GET'])
def map_of_week():
    if not db:
        return jsonify({'success': False, 'error': 'Firebase não conectado'}), 500
    try:
        cutoff = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        map_counts = {}
        for doc in db.collection('matches').stream():
            m = doc.to_dict()
            if m.get('date', '') >= cutoff and m.get('map'):
                map_name = m['map']
                map_counts[map_name] = map_counts.get(map_name, 0) + 1
        if not map_counts:
            return jsonify({'success': True, 'map': None, 'count': 0, 'all': {}})
        top = max(map_counts, key=map_counts.get)
        return jsonify({'success': True, 'map': top, 'count': map_counts[top], 'all': map_counts})
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

@app.route('/api/player/<path:name>/avatar', methods=['PATCH'])
def update_avatar(name):
    """Atualiza só o avatar de um jogador (chamado pelo bookmarklet de avatar)."""
    if not db:
        return jsonify({'success': False, 'error': 'Firebase não conectado'}), 500
    data = request.get_json() or {}
    avatar = data.get('avatar', '')
    if not avatar:
        return jsonify({'success': False, 'error': 'Avatar vazio'}), 400
    try:
        db.collection('players').document(name).update({'avatar': avatar})
        return jsonify({'success': True, 'player': name, 'avatar': avatar})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/player/<path:name>', methods=['DELETE'])
def delete_player(name):
    if not db:
        return jsonify({'success': False, 'error': 'Firebase não conectado'}), 500
    data = request.get_json() or {}
    if not ADMIN_PASSWORD or data.get('password') != ADMIN_PASSWORD:
        return jsonify({'success': False, 'error': 'Não autorizado'}), 401
    try:
        db.collection('players').document(name).delete()
        return jsonify({'success': True})
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

        # Remove campos de debug/temp antes de salvar no Firestore
        last_matches   = gc_data.pop('last_matches', [])
        matches_sample = gc_data.pop('_matches_sample', None)
        matches_type   = gc_data.pop('_matches_type', None)
        matches_keys   = gc_data.pop('_matches_keys', None)
        gc_data.pop('available_months', None)
        gc_data.pop('history_endpoint', None)

        # Loga estrutura dos matches para análise mensal
        if matches_sample is not None:
            print(f"[import] matches é LISTA — sample[0]: {str(matches_sample[0])[:300]}")
        if matches_type == 'dict':
            print(f"[import] matches é DICT — keys: {matches_keys}")

        star_info = calculate_player_stars(gc_data)
        gc_data.update(star_info)
        gc_data['updated_at'] = _now()
        gc_data['source']     = 'gamersclub'

        if not db:
            return jsonify({'success': False, 'error': 'Firebase não conectado — verifique FIREBASE_KEY_B64 no Render'}), 500

        db.collection('players').document(name).set(gc_data)
        _save_snapshot(gc_data)

        # Salva partidas individuais para ranking semanal/mensal
        _save_matches(name, last_matches)

        monthly = gc_data.get('monthly_stats', [])
        monthly_count = len(monthly)
        history_endpoint = gc_data.get('history_endpoint', '')

        # Retorna chaves do primeiro mês para debug do mapeamento
        first_month_keys = None
        if monthly:
            first_month_keys = ','.join(monthly[0].get('_raw_keys', []))
            # Mostra no log do Render
            print(f"[import] {name} | monthly={monthly_count} | primeiro mês keys: {first_month_keys}")
            print(f"[import] {name} | primeiro mês valores: {monthly[0]}")

        return jsonify({
            'success': True,
            'player': name,
            'matches_saved': len(last_matches),
            'monthly_periods': monthly_count,
            'history_endpoint': history_endpoint or None,
            'first_month_keys': first_month_keys,
        })
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
