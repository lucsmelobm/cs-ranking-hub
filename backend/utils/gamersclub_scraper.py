import os
import requests

GC_BASE = "https://gamersclub.com.br"
GAMERSCLUB_SESSION = os.getenv("GAMERSCLUB_SESSION", "")

# Mapeamento dos nomes de stat do GamersClub para os campos do ranking
_STAT_MAP = {
    "KDR":         "KDR",
    "ADR":         "ADR",
    "KAST%":       "KAST",
    "Multi Kills": "MK",
    "First kills": "FK",
    "HS%":         "HS",
}


def _headers():
    return {
        "Cookie": f"gclubsess={GAMERSCLUB_SESSION}",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Referer": "https://gamersclub.com.br/",
    }


def _safe_float(value, default=0.0):
    try:
        return float(str(value).replace(",", ".").replace("%", "").strip())
    except (ValueError, TypeError):
        return default


def get_player(player_id):
    """
    Busca stats de um jogador via API interna do GamersClub.
    Endpoint: GET /api/box/init/{player_id}
    Requer cookie gclubsess válido (variável GAMERSCLUB_SESSION).
    """
    url = f"{GC_BASE}/api/box/init/{player_id}"
    resp = requests.get(url, headers=_headers(), timeout=15)

    if resp.status_code != 200:
        raise Exception(f"GamersClub retornou {resp.status_code} para jogador '{player_id}'")

    return _parse_player(resp.json(), player_id)


def _parse_player(data, player_id):
    info = data.get("playerInfo", {})

    result = {
        "gc_player_id": str(player_id),
        "name":         info.get("nick", f"Player_{player_id}"),
        "gc_level":     info.get("level", 0),
        "gc_rating":    info.get("rating", 0),
        # Defaults para campos do ranking
        "K":    0,
        "D":    0,
        "A":    0,
        "ADR":  70.0,
        "KDR":  1.0,
        "KAST": 65.0,
        "FK":   0,
        "MK":   0,
        "FA":   0,
        "RP":   0,
        "DROP": 0,
        "S":    0,
        "HS":   0.0,
    }

    # Preenche stats do GamersClub
    for stat in data.get("stats", []):
        field = _STAT_MAP.get(stat.get("stat", ""))
        if field:
            result[field] = _safe_float(stat.get("value", 0))

    result["DIFF"] = result["K"] - result["D"]

    return result


def get_player_matches(player_id):
    """
    Retorna o histórico recente de partidas do jogador.
    Os dados vêm do mesmo endpoint box/init.
    """
    url = f"{GC_BASE}/api/box/init/{player_id}"
    resp = requests.get(url, headers=_headers(), timeout=15)

    if resp.status_code != 200:
        raise Exception(f"GamersClub retornou {resp.status_code} para jogador '{player_id}'")

    matches = resp.json().get("lastMatches", [])

    # Normaliza os campos para um formato consistente
    return [
        {
            "match_id":  m.get("id"),
            "map":       m.get("map"),
            "team_a":    m.get("teamNameA"),
            "score_a":   m.get("scoreA"),
            "team_b":    m.get("teamNameB"),
            "score_b":   m.get("scoreB"),
            "win":       bool(m.get("win")),
            "rating":    m.get("ratingPlayer"),
            "rating_diff": m.get("ratingDiff"),
            "type":      m.get("type"),
        }
        for m in matches
    ]


def get_team(team_id):
    raise NotImplementedError("Sync por time ainda não disponível — use sync-player por jogador.")
