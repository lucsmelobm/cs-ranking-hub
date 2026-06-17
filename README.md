# CS Ranking Hub 🎮

Sistema inteligente para ranking de jogadores de Counter-Strike da empresa, com classificação por estrelas e sorteador de times balanceados.

## Features

✨ **Ranking Semanal/Mensal** - Acompanhe a performance dos jogadores
⭐ **Sistema de Classificação** - Jogadores classificados por estrelas (1-3) baseado em performance
👑 **Best Player da Semana** - Destaque automático do melhor jogador
🎲 **Sorteador de Times** - Cria times balanceados para 5x5 garantindo equilibrio

## Estatísticas Analisadas

### Básicas
- **K** - Kills (Abates)
- **A** - Assists (Assistências)
- **D** - Deaths (Mortes)
- **DIFF** - Kill Difference (K-D)

### Avançadas
- **ADR** - Average Damage per Round
- **KDR** - Kill/Death Ratio
- **KAST** - Kill, Assist, Survive, Trade %
- **S** - Rounds Survived
- **FA** - First Assists
- **MK** - Multi Kills
- **FK** - First Kills
- **RP** - Rating Points
- **DROP** - Drops

## Classificação por Estrelas ⭐

Baseada em média ponderada das métricas (com foco em KDR e KAST):
- **3 Estrelas** ⭐⭐⭐ - Excelente (Score > 75)
- **2 Estrelas** ⭐⭐ - Médio (Score 50-75)
- **1 Estrela** ⭐ - Fraco (Score < 50)

## Stack Tecnológico

- **Backend**: Python (Cloud Functions Firebase)
- **Frontend**: HTML/CSS/JavaScript
- **Banco de Dados**: Firestore
- **Hosting**: Firebase Hosting
- **Scheduler**: Cloud Scheduler
