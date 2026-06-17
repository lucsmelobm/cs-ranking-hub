from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import sys
import os

sys.path.insert(0, 'backend')
from utils.star_calculator import calculate_player_stars
from utils.team_balancer import balance_teams

app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app)

try:
    cred = credentials.Certificate('firebase-key.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"Firebase init error: {e}")
    db = None

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
