"""
Calcula as estrelas dos jogadores baseado em KDR, KAST e ADR —
as únicas métricas retornadas de forma confiável pela API do GamersClub.

Faixas calibradas para jogadores amadores / nível GamersClub:

  ⭐⭐⭐  score >= 50  →  acima da média, consistente
  ⭐⭐    score >= 33  →  mediano
  ⭐      score <  33  →  em desenvolvimento

Como o score é calculado:
  KDR  35%  — Kill/Death Ratio
  KAST 35%  — Kill / Assist / Survive / Trade
  ADR  30%  — Average Damage per Round
"""


def normalize_metric(value, min_val, max_val):
    if max_val == min_val:
        return 0.5
    return max(0.0, min((value - min_val) / (max_val - min_val), 1.0))


def calculate_player_score(player_data):
    """Retorna score 0-100 usando apenas as métricas confiáveis da API."""
    kdr  = float(player_data.get('KDR',  0.5))
    kast = float(player_data.get('KAST', 50)) / 100   # % → decimal
    adr  = float(player_data.get('ADR',  50))

    # Faixas realistas para o nível amador/GamersClub
    norm_kdr  = normalize_metric(kdr,  0.40, 1.80)
    norm_kast = normalize_metric(kast, 0.45, 0.85)
    norm_adr  = normalize_metric(adr,  45,   110)

    score = (
        norm_kdr  * 0.35 +
        norm_kast * 0.35 +
        norm_adr  * 0.30
    ) * 100

    return score


def get_star_rating(score):
    """
    Converte score em estrelas.

    Exemplos de referência:
      KDR 1.3 | KAST 70% | ADR 85  →  score ~63  →  ⭐⭐⭐
      KDR 1.0 | KAST 65% | ADR 70  →  score ~44  →  ⭐⭐
      KDR 0.7 | KAST 62% | ADR 63  →  score ~31  →  ⭐
    """
    if score >= 50:
        return 3
    elif score >= 33:
        return 2
    else:
        return 1


def calculate_player_stars(player_data):
    score = calculate_player_score(player_data)
    stars = get_star_rating(score)
    return {
        'score': round(score, 2),
        'stars': stars,
        'rating': ['⭐', '⭐⭐', '⭐⭐⭐'][stars - 1],
    }


def calculate_team_value(players):
    return sum(p.get('stars', 1) for p in players)
