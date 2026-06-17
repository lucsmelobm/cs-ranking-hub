import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import json
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.star_calculator import calculate_player_stars
from utils.team_balancer import balance_teams

db_instance = None

def get_firestore():
    global db_instance
    if db_instance is None:
        try:
            cred = credentials.Certificate('firebase-key.json')
            firebase_admin.initialize_app(cred)
            db_instance = firestore.client()
        except:
            pass
    return db_instance

def add_player(player_data):
    try:
        db = get_firestore()
        star_info = calculate_player_stars(player_data)
        player_data.update(star_info)
        player_data['updated_at'] = datetime.now()
        db.collection('players').document(player_data['name']).set(player_data)
        return True
    except:
        return False

def get_all_players():
    try:
        db = get_firestore()
        players = []
        docs = db.collection('players').stream()
        for doc in docs:
            players.append(doc.to_dict())
        return players
    except:
        return []

def get_weekly_ranking():
    players = get_all_players()
    return sorted(players, key=lambda p: p.get('score', 0), reverse=True)

def get_best_player_week():
    ranking = get_weekly_ranking()
    return ranking[0] if ranking else None

def generate_balanced_teams(players_list):
    if len(players_list) != 10:
        raise ValueError("Precisa de 10 jogadores")
    return balance_teams(players_list, team_size=5)

def handle_request(request):
    if request.method == 'OPTIONS':
        return ('', 204, {'Access-Control-Allow-Origin': '*'})
    
    headers = {'Access-Control-Allow-Origin': '*'}
    
    try:
        if request.path == '/api/ranking' and request.method == 'GET':
            ranking = get_weekly_ranking()
            return (json.dumps({'success': True, 'data': ranking}), 200, headers)
        
        elif request.path == '/api/best-player' and request.method == 'GET':
            best = get_best_player_week()
            return (json.dumps({'success': bool(best), 'data': best}), 200, headers)
        
        elif request.path == '/api/player' and request.method == 'POST':
            data = request.get_json()
            success = add_player(data)
            return (json.dumps({'success': success}), 200, headers)
        
        elif request.path == '/api/players' and request.method == 'GET':
            players = get_all_players()
            return (json.dumps({'success': True, 'data': players}), 200, headers)
        
        elif request.path == '/api/teams' and request.method == 'POST':
            data = request.get_json()
            balanced = generate_balanced_teams(data.get('players', []))
            return (json.dumps({'success': True, 'data': balanced}), 200, headers)
        
        else:
            return (json.dumps({'success': False}), 404, headers)
    except Exception as e:
        return (json.dumps({'success': False, 'error': str(e)}), 500, headers)
