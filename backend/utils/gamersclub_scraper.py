import os
import requests
from datetime import datetime

GC_BASE = "https://gamersclub.com.br"
GAMERSCLUB_SESSION = os.getenv("GAMERSCLUB_SESSION", "")

# Mapeamento dos nomes de stat do GamersClub (em inglês e português)
_STAT_MAP = {
    "KDR":               "KDR",
    "ADR":               "ADR",
    "KAST%":             "KAST",
    "Multi Kills":       "MK",
    "First kills":       "FK",
    "First Kills":       "FK",
    "HS%":               "HS",
    # Nomes em português (endpoint /api/box/history)
    "Matou":             "K",
    "Morreu":            "D",
    "Assistências":      "A",
    "Assists":           "A",
    "Bombas Plantadas":  "bombs_planted",
    "Bombas Defusadas":  "bombs_defused",
    "Multi kills":       "MK",
    "Primeiro a matar":  "FK",
    "Headshot%":         "HS",
}


def _headers(player_id=None):
    referer = f"https://gamersclub.com.br/player/{player_id}" if player_id else "https://gamersclub.com.br/"
    h = {
        "User-Agent": (
            "Mozilla/5.0 (Linux; Android 15; Pixel 9) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/149.0.0.0 Mobile Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": referer,
        "sec-ch-ua": '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "Priority": "u=1, i",
    }
    if GAMERSCLUB_SESSION:
        h["Cookie"] = f"gclubsess={GAMERSCLUB_SESSION}"
    return h


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
    resp = requests.get(url, headers=_headers(player_id), timeout=15)

    if resp.status_code != 200:
        raise Exception(f"GamersClub retornou {resp.status_code} para jogador '{player_id}'")

    return _parse_player(resp.json(), player_id)


def _normalize_date(val):
    """Converte timestamp Unix ou string ISO para YYYY-MM-DD."""
    if not val:
        return ""
    if isinstance(val, (int, float)):
        try:
            return datetime.utcfromtimestamp(val).strftime('%Y-%m-%d')
        except Exception:
            return ""
    if isinstance(val, str):
        return val[:10]
    return ""


def _parse_player(data, player_id):
    info = data.get("playerInfo", {})
    character = data.get("character", {})

    # Try to find avatar from multiple possible locations in the API response
    avatar = (
        info.get("photoUrl") or info.get("avatar") or info.get("photo") or
        info.get("profilePicture") or info.get("picture") or
        character.get("avatar") or character.get("photoUrl") or
        character.get("image") or character.get("url") or
        data.get("avatar") or ""
    )

    result = {
        "gc_player_id": str(player_id),
        "name":         info.get("nick", f"Player_{player_id}"),
        "gc_level":     info.get("level", 0),
        "gc_rating":    info.get("rating", 0),
        "avatar":       avatar,
        "K":    0, "D": 0, "A": 0,
        "ADR":  70.0, "KDR": 1.0, "KAST": 65.0,
        "FK":   0, "MK": 0, "FA": 0,
        "RP":   0, "DROP": 0, "S": 0, "HS": 0.0,
    }

    for stat in data.get("stats", []):
        field = _STAT_MAP.get(stat.get("stat", ""))
        if field:
            result[field] = _safe_float(stat.get("value", 0))

    result["DIFF"] = result["K"] - result["D"]

    # Parse lastMatches with dates
    raw_matches = data.get("lastMatches", [])
    if raw_matches:
        result["last_matches"] = _parse_matches(raw_matches, player_id)

    return result


def _parse_matches(matches, player_id):
    """Extrai partidas recentes com data, mapa e performance."""
    result = []
    for m in matches:
        date_val = (
            m.get("date") or m.get("createdAt") or m.get("created_at") or
            m.get("datetime") or m.get("matchDate") or m.get("startTime") or
            m.get("timestamp") or ""
        )
        map_name = (
            m.get("map") or m.get("mapName") or m.get("mapSlug") or
            m.get("mapId") or ""
        )
        result.append({
            "match_id":   str(m.get("id", "")),
            "player_id":  str(player_id),
            "map":        map_name,
            "date":       _normalize_date(date_val),
            "date_raw":   str(date_val),
            "win":        bool(m.get("win")),
            "rating":     _safe_float(m.get("ratingPlayer") or 0),
            "rating_diff": _safe_float(m.get("ratingDiff") or 0),
            "type":       m.get("type") or "",
            "score_a":    m.get("scoreA"),
            "score_b":    m.get("scoreB"),
        })
    return result


def parse_history_stats(history_data):
    """
    Extrai estatísticas mensais do endpoint /api/box/history/{id}.
    Resposta confirmada: {months: [...], servers, stat, matches, character}
    """
    if not history_data or not isinstance(history_data, dict):
        return []

    # Endpoint confirmado retorna chave "months"
    items = (
        history_data.get("months") or
        history_data.get("stats") or
        history_data.get("history") or
        history_data.get("data") or
        []
    )

    if not isinstance(items, list) or not items:
        return []

    def get_any(d, *keys, default=0.0):
        for k in keys:
            if k in d and d[k] is not None:
                try:
                    return float(str(d[k]).replace(",", ".").replace("%", "").strip())
                except (ValueError, TypeError):
                    pass
        return default

    months = []
    for item in items:
        if not isinstance(item, dict):
            continue

        # Tenta vários nomes possíveis para o campo de período
        period = (
            item.get("period") or item.get("month") or item.get("date") or
            item.get("referenceMonth") or item.get("monthYear") or
            item.get("competitionMonth") or item.get("monthRef") or
            item.get("name") or item.get("label") or ""
        )

        months.append({
            "period":        str(period),
            "_raw_keys":     list(item.keys()),
            "kills":         get_any(item, "kills", "k", "totalKills", "Kills", "kill"),
            "deaths":        get_any(item, "deaths", "d", "totalDeaths", "Deaths", "death"),
            "assists":       get_any(item, "assists", "a", "totalAssists", "Assists", "assist"),
            "kdr":           get_any(item, "kdr", "KDR", "killDeathRatio", "kd", "ratio"),
            "adr":           get_any(item, "adr", "ADR", "averageDamageRound", "damagePerRound", "damage"),
            "kast":          get_any(item, "kast", "KAST", "kastPercent", "kast_percent", "kastP"),
            "multikills":    get_any(item, "multikills", "multiKills", "mk", "MK", "multiKill", "multi_kills"),
            "first_kills":   get_any(item, "firstKills", "firstKill", "fk", "FK", "first_kill", "firstkill"),
            "hs":            get_any(item, "hs", "HS", "headshotPercent", "headshot", "hsPercent", "hsP"),
            "bombs_planted": get_any(item, "bombsPlanted", "planted", "bombPlanted", "plant", "bomb_planted"),
            "bombs_defused": get_any(item, "bombsDefused", "defused", "bombDefused", "defuse", "bomb_defused"),
            "matches":       get_any(item, "matches", "totalMatches", "games", "gamesPlayed", "match"),
            "wins":          get_any(item, "wins", "victories", "won", "win"),
        })

    return months


def get_player_matches(player_id):
    """
    Retorna o histórico recente de partidas do jogador.
    Os dados vêm do mesmo endpoint box/init.
    """
    url = f"{GC_BASE}/api/box/init/{player_id}"
    resp = requests.get(url, headers=_headers(player_id), timeout=15)

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


def import_player(raw_data):
    """
    Processa dados brutos já buscados pelo browser (bookmarklet).
    raw_data: response JSON de /api/box/init/{id} + campos extras do bookmarklet
    """
    player_id = raw_data.get("playerInfo", {}).get("id", "unknown")
    result = _parse_player(raw_data, player_id)

    # Avatar capturado pelo bookmarklet via DOM tem prioridade sobre o da API
    bm_avatar = raw_data.get("avatar", "")
    if bm_avatar:
        result["avatar"] = bm_avatar

    # Histórico via /api/box/history/{id}
    history_raw = raw_data.get("_history_data") or {}
    history_url = raw_data.get("_history_url", "")

    if history_raw:
        # Avatar do character do histórico
        hist_char = history_raw.get("character", {})
        hist_avatar = (
            hist_char.get("avatar") or hist_char.get("photoUrl") or
            hist_char.get("image") or hist_char.get("url") or ""
        )
        if hist_avatar and not result.get("avatar"):
            result["avatar"] = hist_avatar

        # Usa o array "stat" do histórico — tem Matou, Morreu, KAST%, etc.
        # Esses dados são mais completos que os do box/init
        hist_stats = history_raw.get("stat", [])
        if isinstance(hist_stats, list):
            for s in hist_stats:
                name  = s.get("stat", "")
                value = s.get("value", 0)
                field = _STAT_MAP.get(name)
                if field:
                    result[field] = _safe_float(value)

        # Lista de meses disponíveis
        months_list = history_raw.get("months", [])
        if months_list:
            result["available_months"] = months_list
            result["history_endpoint"] = history_url

        # Recalcula DIFF com os novos K e D
        result["DIFF"] = result.get("K", 0) - result.get("D", 0)

        # Guarda matches do histórico para análise mensal
        hist_matches = history_raw.get("matches", [])
        if hist_matches:
            result["last_matches_history"] = hist_matches[:5]  # só para debug

    return result


def get_team(team_id):
    raise NotImplementedError("Sync por time ainda não disponível — use sync-player por jogador.")
