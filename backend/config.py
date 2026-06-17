"""
Configuração do projeto Firebase e variáveis de ambiente
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Firebase Configuration
FIREBASE_CONFIG = {
    'apiKey': os.getenv('FIREBASE_API_KEY', ''),
    'authDomain': os.getenv('FIREBASE_AUTH_DOMAIN', ''),
    'projectId': os.getenv('FIREBASE_PROJECT_ID', ''),
    'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET', ''),
    'messagingSenderId': os.getenv('FIREBASE_MESSAGING_SENDER_ID', ''),
    'appId': os.getenv('FIREBASE_APP_ID', '')
}

# Database Configuration
FIRESTORE_CREDENTIALS = os.getenv('FIRESTORE_CREDENTIALS_PATH', 'firebase-key.json')

# App Configuration
DEBUG = os.getenv('DEBUG', 'False') == 'True'
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 5000))

# Scheduler Configuration
SCHEDULER_HOUR = int(os.getenv('SCHEDULER_HOUR', 7))  # 7 da manhã
SCHEDULER_MINUTE = int(os.getenv('SCHEDULER_MINUTE', 0))

# Collections names
PLAYERS_COLLECTION = 'players'
MATCHES_COLLECTION = 'matches'
RANKINGS_COLLECTION = 'rankings'
