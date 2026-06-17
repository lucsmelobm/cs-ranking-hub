"""
Calcula as estrelas dos jogadores baseado em performance
Usa média ponderada com foco em KDR e KAST
"""

def normalize_metric(value, min_val, max_val):
    """Normaliza uma métrica para escala 0-1"""
    if max_val == min_val:
        return 0.5
    return max(0, min((value - min_val) / (max_val - min_val), 1))


def calculate_player_score(player_data):
    """
    Calcula o score do jogador baseado em suas estatísticas
    Retorna um valor entre 0-100
    
    Pesos:
    - KDR: 25% (Kill/Death Ratio)
    - KAST: 25% (Kill, Assist, Survive, Trade)
    - ADR: 15% (Average Damage per Round)
    - FK: 10% (First Kills)
    - FA: 10% (First Assists)
    - DIFF: 10% (Kill Difference)
    - MK: 5% (Multi Kills)
    """
    
    # Extração de dados com valores padrão
    kdr = float(player_data.get('KDR', 0.5))
    kast = float(player_data.get('KAST', 0)) / 100  # Converter de % para decimal
    adr = float(player_data.get('ADR', 50))
    fk = float(player_data.get('FK', 0))
    fa = float(player_data.get('FA', 0))
    kills = float(player_data.get('K', 0))
    deaths = float(player_data.get('D', 1))
    diff = float(player_data.get('DIFF', 0))
    mk = float(player_data.get('MK', 0))
    
    # Normalizar métricas
    norm_kdr = normalize_metric(kdr, 0.3, 2.0)
    norm_kast = normalize_metric(kast, 0.3, 1.0)
    norm_adr = normalize_metric(adr, 40, 150)
    norm_fk = normalize_metric(fk, 0, 10)
    norm_fa = normalize_metric(fa, 0, 10)
    norm_diff = normalize_metric(diff, -20, 30)
    norm_mk = normalize_metric(mk, 0, 10)
    
    # Calcular score com pesos
    score = (
        norm_kdr * 0.25 +      # 25%
        norm_kast * 0.25 +     # 25%
        norm_adr * 0.15 +      # 15%
        norm_fk * 0.10 +       # 10%
        norm_fa * 0.10 +       # 10%
        norm_diff * 0.10 +     # 10%
        norm_mk * 0.05         # 5%
    ) * 100
    
    return score


def get_star_rating(score):
    """
    Converte o score em número de estrelas
    
    - 3 Estrelas: score > 75
    - 2 Estrelas: score 50-75
    - 1 Estrela: score < 50
    """
    if score >= 75:
        return 3
    elif score >= 50:
        return 2
    else:
        return 1


def calculate_player_stars(player_data):
    """
    Calcula as estrelas de um jogador
    Retorna um dict com score e stars
    """
    score = calculate_player_score(player_data)
    stars = get_star_rating(score)
    
    return {
        'score': round(score, 2),
        'stars': stars,
        'rating': ['⭐', '⭐⭐', '⭐⭐⭐'][stars - 1]
    }


def calculate_team_value(players):
    """
    Calcula o valor total de um time baseado nas estrelas
    Útil para balanceamento
    """
    return sum(p.get('stars', 1) for p in players)
