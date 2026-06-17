# 🎮 CS Ranking Hub - Quick Start Guide

Bem-vindo ao CS Ranking Hub! Este guia vai te ajudar a rodar o projeto.

## 📦 Estrutura do Projeto

```
cs-ranking-hub/
├── frontend/           # Website (React/HTML/CSS/JS)
├── backend/            # Lógica de negócio (Python)
│   ├── utils/
│   │   ├── star_calculator.py   # Calcula estrelas dos jogadores
│   │   └── team_balancer.py     # Sorteia times balanceados
│   ├── functions/
│   │   └── main.py              # Cloud Functions (Firebase)
│   └── config.py                # Configurações
├── app.py              # Servidor Flask (local)
├── firebase.json       # Config Firebase
├── firebase-key.json   # Credenciais (não commitar!)
└── requirements.txt    # Dependências Python
```

## 🚀 Instalação & Setup

### Pré-requisitos
- Python 3.9+
- Node.js (npm)
- Git
- Conta Firebase ✅

### 1️⃣ Clone o Repositório

```bash
git clone https://github.com/lucsmelobm/cs-ranking-hub.git
cd cs-ranking-hub
```

### 2️⃣ Instale Dependências Python

```bash
pip install -r requirements.txt
```

Se tiver erro, tenta atualizar pip:
```bash
python -m pip install --upgrade pip
```

### 3️⃣ Configure o Firebase

Você já tem o `firebase-key.json` na pasta raiz. Se precisar gerar um novo:

1. Vá para https://console.firebase.google.com
2. Configurações do Projeto → Contas de Serviço
3. "Gerar nova chave privada" (JSON)
4. Salve como `firebase-key.json` na raiz do projeto

**⚠️ IMPORTANTE:** Nunca commite esse arquivo! Está no `.gitignore` por segurança.

## 🏃 Rodando Localmente

### Backend (Flask Server)

```bash
python app.py
```

Você verá:
```
 * Running on http://0.0.0.0:5000
```

Deixe rodando! Ele fornece a API para o frontend.

### Frontend

Abra em qualquer navegador:
- **Local:** http://localhost:5000
- **Online:** https://cs-ranking-hub.web.app

## 📊 Como Usar

### 1. Adicionar Jogadores

Você pode adicionar jogadores via API. Exemplo com `curl`:

```bash
curl -X POST http://localhost:5000/api/player \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Johnny Walker",
    "K": 25,
    "A": 8,
    "D": 15,
    "ADR": 120.95,
    "KDR": 1.67,
    "KAST": 82,
    "S": 10,
    "FA": 3,
    "MK": 5,
    "FK": 4,
    "RP": 19,
    "DROP": 0
  }'
```

### 2. Ver Ranking

Acesse no navegador:
- http://localhost:5000 → Aba "Ranking"

Os dados aparecem automaticamente do Firebase.

### 3. Classificação por Estrelas

O sistema calcula automaticamente:

**3 ⭐ Excelente** (Score > 75)
- Alto KDR, KAST, ADR
- Consistency geral

**2 ⭐ Médio** (Score 50-75)
- Performance equilibrada

**1 ⭐ Fraco** (Score < 50)
- Precisa melhorar

### 4. Sortear Times Balanceados

1. Vá em "Sorteador de Times"
2. Selecione 10 jogadores
3. Clique "Gerar Times Balanceados"
4. Veja os times divididos equilibradamente!

## 🔌 API Endpoints

### GET `/api/players`
Retorna todos os jogadores

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Johnny Walker",
      "K": 25,
      "stars": 3,
      "score": 82.5,
      ...
    }
  ]
}
```

### GET `/api/ranking`
Retorna jogadores ordenados por score

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Johnny Walker",
      "stars": 3,
      "score": 82.5,
      "KDR": 1.67,
      "ADR": 120.95,
      ...
    }
  ]
}
```

### GET `/api/best-player`
Retorna o melhor jogador da semana

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Johnny Walker",
    "stars": 3,
    "score": 82.5,
    ...
  }
}
```

### POST `/api/player`
Adiciona um novo jogador

**Body:**
```json
{
  "name": "Player Name",
  "K": 25,
  "A": 8,
  "D": 15,
  "ADR": 90.5,
  "KDR": 1.67,
  "KAST": 75,
  "S": 10,
  "FA": 3,
  "MK": 5,
  "FK": 4,
  "RP": 19,
  "DROP": 0
}
```

### POST `/api/teams`
Gera times balanceados

**Body:**
```json
{
  "players": [
    { "name": "Player1", "stars": 3, ... },
    { "name": "Player2", "stars": 2, ... },
    ...
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "team1": [...],
    "team2": [...],
    "is_balanced": true,
    "balance_difference": 0
  }
}
```

## 📱 Deployment

### Frontend (Já está online!)
- **URL:** https://cs-ranking-hub.web.app
- **Deployado em:** Firebase Hosting
- **Atualizar:** `firebase deploy --only hosting`

### Backend (Local por enquanto)
Para colocar online em produção:
- Use Firebase Cloud Functions
- Ou Google Cloud Run
- Ou Heroku/Railway

## 🛠️ Desenvolvimento

### Estrutura de Dados

**Players Collection (Firestore):**
```
players/
  └── {player_name}/
      ├── name: string
      ├── K: number (kills)
      ├── D: number (deaths)
      ├── A: number (assists)
      ├── ADR: number (avg damage)
      ├── KDR: number (kill/death ratio)
      ├── KAST: number (%)
      ├── stars: number (1-3)
      ├── score: number (0-100)
      └── updated_at: timestamp
```

### Adicionar Novas Features

1. **Backend:** Edite `backend/utils/` ou `app.py`
2. **Frontend:** Edite `frontend/` (HTML/CSS/JS)
3. **Test:** Rode localmente (`python app.py`)
4. **Push:** Commit e faça push pro GitHub

```bash
git add -A
git commit -m "Descrição da mudança"
git push origin main
```

## 🐛 Troubleshooting

### Erro: "Cannot find module 'firebase-admin'"
```bash
pip install -r requirements.txt
```

### Erro: "Connection refused" ao acessar API
Certifique-se que rodou:
```bash
python app.py
```

### Erro: "Permission denied" no Firebase
Verifique se o `firebase-key.json` está na pasta raiz e tem permissão de leitura.

### Frontend não conecta com Backend
1. Certifique-se que `python app.py` está rodando
2. Verifique se rodou em http://localhost:5000
3. Abra DevTools (F12) e verifique erros no Console

## 📚 Recursos

- [Firebase Console](https://console.firebase.google.com)
- [GitHub Repo](https://github.com/lucsmelobm/cs-ranking-hub)
- [Firebase Docs](https://firebase.google.com/docs)
- [Python Docs](https://docs.python.org/3/)

## 💡 Dicas

1. **Para testar localmente:** Mantenha `python app.py` rodando em um terminal
2. **Dados de teste:** Use o script de exemplo para adicionar jogadores
3. **Performance:** O Firestore é gratuito até 50k operações/dia
4. **Backup:** Git automático salva tudo no GitHub

## 📞 Suporte

Tem dúvida? Verifique:
1. Este guia
2. README.md
3. Issues no GitHub
4. Console do navegador (F12)

---

**Divirta-se! 🎮** Boa sorte com seu ranking de CS! 👑

