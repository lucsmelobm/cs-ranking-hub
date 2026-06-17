"""
Sorteia times balanceados para 5x5
Garante que cada time tenha valor aproximado de estrelas
"""

import random


def calculate_team_value(players):
    """Calcula o valor total do time baseado nas estrelas"""
    return sum(p.get('stars', 1) for p in players)


def balance_teams(players, team_size=5):
    """
    Cria dois times balanceados
    
    Algoritmo:
    1. Ordena jogadores por estrelas (descendente)
    2. Alterna jogadores entre times (snake draft)
    3. Garante que cada time tenha aproximadamente o mesmo valor
    
    Args:
        players: Lista de dicts com dados dos jogadores (incluindo 'stars')
        team_size: Tamanho de cada time (default 5)
    
    Returns:
        Dict com 'team1', 'team2' e 'balance_info'
    """
    
    if len(players) != team_size * 2:
        raise ValueError(f"Número de jogadores deve ser {team_size * 2}, recebeu {len(players)}")
    
    # Ordenar por estrelas (descendente)
    sorted_players = sorted(players, key=lambda p: p.get('stars', 1), reverse=True)
    
    team1 = []
    team2 = []
    
    # Snake draft: alterna entre times
    for i, player in enumerate(sorted_players):
        if i % 2 == 0:
            team1.append(player)
        else:
            team2.append(player)
    
    # Embaralhar posições dentro de cada time (mantendo valor)
    random.shuffle(team1)
    random.shuffle(team2)
    
    # Calcular valores finais
    value1 = calculate_team_value(team1)
    value2 = calculate_team_value(team2)
    balance = abs(value1 - value2)
    
    return {
        'team1': team1,
        'team2': team2,
        'team1_value': value1,
        'team2_value': value2,
        'balance_difference': balance,
        'is_balanced': balance <= 1  # Diferença de no máximo 1 estrela
    }


def get_team_composition(team):
    """Retorna composição de estrelas do time"""
    stars_count = {1: 0, 2: 0, 3: 0}
    
    for player in team:
        stars = player.get('stars', 1)
        stars_count[stars] += 1
    
    return stars_count


def print_teams(balanced_teams):
    """Formata times para exibição"""
    team1 = balanced_teams['team1']
    team2 = balanced_teams['team2']
    
    print("\n" + "="*60)
    print("⚔️  TIMES BALANCEADOS - 5x5")
    print("="*60)
    
    print("\n🔴 TIME 1 (Valor: {})".format(balanced_teams['team1_value']))
    print("-" * 60)
    for i, player in enumerate(team1, 1):
        print(f"{i}. {player.get('name', 'Unknown'):20} {player.get('rating', '⭐'):10} "
              f"ADR: {player.get('ADR', 0):6} | KDR: {player.get('KDR', 0):4}")
    
    print("\n🔵 TIME 2 (Valor: {})".format(balanced_teams['team2_value']))
    print("-" * 60)
    for i, player in enumerate(team2, 1):
        print(f"{i}. {player.get('name', 'Unknown'):20} {player.get('rating', '⭐'):10} "
              f"ADR: {player.get('ADR', 0):6} | KDR: {player.get('KDR', 0):4}")
    
    print("\n" + "="*60)
    if balanced_teams['is_balanced']:
        print("✅ TIMES BALANCEADOS!")
    else:
        print(f"⚠️  Diferença: {balanced_teams['balance_difference']} estrela(s)")
    print("="*60 + "\n")
