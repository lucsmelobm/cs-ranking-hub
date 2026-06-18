import os
import requests
from bs4 import BeautifulSoup

GC_BASE  = "https://gamersclub.com.br"
GC_CSGO  = "https://csgo.gamersclub.gg"

GAMERSCLUB_SESSION = os.getenv("GAMERSCLUB_SESSION", "")


def _session():
    s = requests.Session()
    s.cookies.set("gclubsess", GAMERSCLUB_SESSION, domain="gamersclub.com.br")
    s.cookies.set("gclubsess", GAMERSCLUB_SESSION, domain="csgo.gamersclub.gg")
    s.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://gamersclub.com.br/",
    })
    return s


def _safe_float(text, default=0.0):
    try:
        return float(str(text).replace(",", ".").replace("%", "").strip())
    except (ValueError, TypeError):
        return default


# ── Player ────────────────────────────────────────────────────────────────────

def get_player(player_id):
    """
    Busca stats de um jogador no GamersClub pelo ID ou nickname.
    Retorna dict com as estatísticas mapeadas para o formato do ranking.
    """
    s = requests.Session()
    s.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Cookie": f"gclubsess={GAMERSCLUB_SESSION}",
        "Referer": "https://gamersclub.com.br/",
    })

    url = f"{GC_BASE}/jogador/{player_id}"
    resp = s.get(url, timeout=15, allow_redirects=True)

    if resp.status_code != 200:
        raise Exception(f"GamersClub retornou {resp.status_code} para jogador '{player_id}'")

    return _parse_player(resp.text, player_id)


def _parse_player(html, player_id):
    soup = BeautifulSoup(html, "lxml")
    data = {"gc_player_id": str(player_id)}

    # Nome
    for sel in [
        ".player-nickname", ".playerNickname", ".nickname",
        "h1.name", "h1", "[class*='nick']", "[class*='Nick']",
    ]:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            data["name"] = el.get_text(strip=True)
            break

    # Avatar
    for sel in [
        ".player-avatar img", ".avatar img",
        "[class*='avatar'] img", "[class*='Avatar'] img",
    ]:
        el = soup.select_one(sel)
        if el and el.get("src"):
            data["avatar"] = el["src"]
            break

    # Extrai blocos de estatística genéricos
    _extract_stat_blocks(soup, data)

    # Garante que todos os campos do ranking existem
    data.setdefault("K",    0)
    data.setdefault("D",    0)
    data.setdefault("A",    0)
    data.setdefault("ADR",  70.0)
    data.setdefault("KDR",  1.0)
    data.setdefault("KAST", 65.0)
    data.setdefault("FK",   0)
    data.setdefault("MK",   0)
    data.setdefault("FA",   0)
    data.setdefault("RP",   0)
    data.setdefault("DROP", 0)
    data.setdefault("S",    0)
    data["DIFF"] = int(data["K"]) - int(data["D"])

    return data


def _extract_stat_blocks(soup, data):
    """Tenta mapear labels de estatísticas do GamersClub para os campos do ranking."""
    label_map = {
        # Inglês / português possíveis na página
        "k/d":          "KDR",
        "kd":           "KDR",
        "kdr":          "KDR",
        "adr":          "ADR",
        "kills":        "K",
        "abates":       "K",
        "deaths":       "D",
        "mortes":       "D",
        "assists":      "A",
        "assistências": "A",
        "first kill":   "FK",
        "first kills":  "FK",
        "primeiro abate": "FK",
        "headshot":     "HS",
        "hs%":          "HS",
        "kast":         "KAST",
        "rating":       "RP",
    }

    # Percorre elementos que parecem blocos de stat
    for container in soup.select(
        "[class*='stat'], [class*='Stat'], "
        "[class*='info'], [class*='Info'], "
        "[class*='metric'], [class*='Metric']"
    ):
        texts = [t.strip() for t in container.stripped_strings]
        if len(texts) < 2:
            continue

        label = texts[0].lower()
        value = texts[-1]

        field = label_map.get(label)
        if field:
            data[field] = _safe_float(value)


# ── Team ──────────────────────────────────────────────────────────────────────

def get_team(team_id):
    """
    Busca o time pelo ID no GamersClub e retorna lista de player IDs.
    """
    s = _session()
    url = f"{GC_CSGO}/time/{team_id}"
    resp = s.get(url, timeout=15, allow_redirects=True)

    if resp.status_code != 200:
        raise Exception(f"GamersClub retornou {resp.status_code} para time '{team_id}'")

    return _parse_team(resp.text, team_id)


def _parse_team(html, team_id):
    soup = BeautifulSoup(html, "lxml")
    players = []

    # Links de perfil de jogador dentro da página do time
    for a in soup.select("a[href*='/jogador/']"):
        href = a["href"]
        gc_id = href.split("/jogador/")[-1].strip("/").split("?")[0]
        if gc_id and gc_id not in [p["gc_player_id"] for p in players]:
            name_el = a.select_one("[class*='nick'], [class*='name'], span")
            players.append({
                "gc_player_id": gc_id,
                "name": name_el.get_text(strip=True) if name_el else gc_id,
            })

    return {
        "gc_team_id": str(team_id),
        "players": players,
    }


# ── Matches ───────────────────────────────────────────────────────────────────

def get_player_matches(player_id, limit=20):
    """
    Busca histórico de partidas de um jogador.
    Retorna lista de dicts com stats por partida.
    """
    s = _session()
    url = f"{GC_BASE}/jogador/{player_id}"
    resp = s.get(url, timeout=15, allow_redirects=True)

    if resp.status_code != 200:
        raise Exception(f"GamersClub retornou {resp.status_code} para jogador '{player_id}'")

    soup = BeautifulSoup(resp.text, "lxml")
    matches = []

    # Linhas de histórico de partidas
    for row in soup.select("tr[class*='match'], [class*='matchRow'], [class*='MatchRow']")[:limit]:
        m = {}
        cells = row.find_all("td")
        if len(cells) >= 4:
            m["map"]    = cells[0].get_text(strip=True)
            m["result"] = cells[1].get_text(strip=True)
            m["K"]      = _safe_float(cells[2].get_text(strip=True))
            m["D"]      = _safe_float(cells[3].get_text(strip=True))
            if len(cells) >= 5:
                m["A"] = _safe_float(cells[4].get_text(strip=True))
            matches.append(m)

    return matches
