import json
import os
import sys
from datetime import datetime

try:
    import markdown
except ImportError:
    print("'markdown' package not found. Install:")
    print("    pip install markdown --break-system-packages")
    sys.exit(1)


SITE_URL = "https://aos.by"
ROOT = os.getcwd()

TOURNAMENTS_JSON = os.path.join(ROOT, "data", "tournaments.json")
TOURNAMENTS_DIR = os.path.join(ROOT, "tournaments")
FACTION_STATS_JSON = os.path.join(ROOT, "data", "faction-stats.json")

MIN_GAMES_FOR_WINRATE = 3  # отсекаем фракции с 1-2 играми — слишком шумно для винрейта

# Диапазон дат турниров, которые учитываются в статистике по фракциям.
# Формат "YYYY-MM-DD". STATS_END_DATE = None -> без верхней границы (все турниры от START и позже).
STATS_START_DATE = "2026-07-01"
STATS_END_DATE = None

MONTH_NAMES_GENITIVE = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
]


def format_date(iso: str) -> str:
    d = datetime.strptime(iso, "%Y-%m-%d")
    return f"{d.day} {MONTH_NAMES_GENITIVE[d.month - 1]} {d.year}"


def escape_attr(value) -> str:
    text = str(value or "")
    return (
        text.replace("&", "&amp;")
            .replace('"', "&quot;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
    )


def escape_text(value) -> str:
    return escape_attr(value).replace("'", "&#039;")

def strip_frontmatter(md_text: str) -> str:
    if md_text.startswith("---"):
        parts = md_text.split("---", 2)

        if len(parts) == 3:
            return parts[2].lstrip("\n")

    return md_text

def render_markdown(md_text: str) -> str:
    return markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "nl2br"],
    )


# =====================
# Блоки страницы турнира
# =====================

def build_rules_block(tournament: dict, folder: str) -> str:
    rules_file = tournament.get("rulesFile")
    rules_link = tournament.get("rulesLink")

    if rules_file:
        path = os.path.join(folder, rules_file)
        if not os.path.exists(path):
            print(f"  ! rulesFile не найден: {path}")
            return ""

        with open(path, "r", encoding="utf-8") as f:
            body_html = render_markdown(strip_frontmatter(f.read()))

        return f"""
            <details class="rules-details">
                <summary>
                    <span><i class="fas fa-file-alt"></i> Регламент</span>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </summary>
                <div class="rules-body">{body_html}</div>
            </details>
        """

    if rules_link:
        return f"""
            <a href="{escape_attr(rules_link)}" class="btn-sm" target="_blank" rel="noopener">
                <i class="fas fa-file-alt"></i>
                Регламент
            </a>
        """

    return ""


GAME_RESULT_CLASS = {"win": "win", "loss": "loss", "draw": "draw"}


def player_stats(player: dict) -> tuple:
    """(wins, losses, draws, points). Считает из games[], если есть;
    иначе падает обратно на старые ручные поля wins/losses/draws/points."""

    games = player.get("games")

    if games:
        wins = sum(1 for g in games if g.get("result") == "win")
        losses = sum(1 for g in games if g.get("result") == "loss")
        draws = sum(1 for g in games if g.get("result") == "draw")
        points = sum(g.get("points", 0) for g in games)
        return wins, losses, draws, points

    return (
        player.get("wins", 0),
        player.get("losses", 0),
        player.get("draws", 0),
        player.get("points", 0),
    )


def is_single_faction(army: str) -> bool:
    """В командных турнирах (как vstrechaem-po-oblojke-2026) поле army у
    "участника"-команды — это список армий через запятую ("Skaven, Ironjawz, ...").
    Нельзя понять, какая из них выиграла/проиграла конкретную игру, поэтому
    такие записи не участвуют в статистике по фракциям."""
    return bool(army) and "," not in army


def find_tournament_winner(players: list):
    """Тот же порядок сортировки, что и в build_participants_table:
    победы команды → очки команды → победы игрока → очки игрока."""

    has_teams = any(p.get("team") for p in players)

    team_totals = {}
    if has_teams:
        for p in players:
            team = p.get("team", "")
            w, l, d, pts = player_stats(p)
            totals = team_totals.setdefault(team, [0, 0])
            totals[0] += w
            totals[1] += pts

    def sort_key(p):
        w, l, d, pts = player_stats(p)
        if has_teams:
            team = p.get("team", "")
            team_wins, team_pts = team_totals.get(team, [0, 0])
            return (-team_wins, -team_pts, team, -w, -pts)
        return (-w, -pts)

    return min(players, key=sort_key)


def build_faction_stats(tournaments: list) -> dict:
    """Агрегирует статистику по фракциям со всех турниров в data/tournaments.json."""

    pick_count = {}
    win_stats = {}  # faction -> [wins, losses, draws, games]
    tournament_wins = {}
    total_entries = 0

    for tournament in tournaments:
        date = tournament.get("date")
        if not date:
            continue
        if date < STATS_START_DATE:
            continue
        if STATS_END_DATE and date > STATS_END_DATE:
            continue

        players = tournament.get("players", [])
        if not players:
            continue

        eligible = [p for p in players if is_single_faction(p.get("army", ""))]

        for p in eligible:
            army = p["army"].strip()

            pick_count[army] = pick_count.get(army, 0) + 1
            total_entries += 1

            w, l, d, pts = player_stats(p)
            if w or l or d:
                stats = win_stats.setdefault(army, [0, 0, 0, 0])
                stats[0] += w
                stats[1] += l
                stats[2] += d
                stats[3] += w + l + d

        has_results = any(p.get("games") or p.get("points") is not None for p in players)
        if tournament.get("finished") and has_results and eligible:
            winner = find_tournament_winner(eligible)
            army = winner["army"].strip()
            tournament_wins[army] = tournament_wins.get(army, 0) + 1

    pick_rate = [
        {
            "faction": faction,
            "count": count,
            "percent": round(count / total_entries * 100, 1) if total_entries else 0,
        }
        for faction, count in pick_count.items()
    ]
    pick_rate.sort(key=lambda x: -x["count"])

    win_rate = [
        {
            "faction": faction,
            "wins": s[0],
            "losses": s[1],
            "draws": s[2],
            "games": s[3],
            "percent": round(s[0] / s[3] * 100, 1) if s[3] else 0,
        }
        for faction, s in win_stats.items()
        if s[3] >= MIN_GAMES_FOR_WINRATE
    ]
    win_rate.sort(key=lambda x: -x["percent"])

    tournament_wins_list = [
        {"faction": faction, "count": count} for faction, count in tournament_wins.items()
    ]
    tournament_wins_list.sort(key=lambda x: -x["count"])

    return {
        "totalEntries": total_entries,
        "minGamesForWinrate": MIN_GAMES_FOR_WINRATE,
        "dateRange": {"start": STATS_START_DATE, "end": STATS_END_DATE},
        "pickRate": pick_rate,
        "winRate": win_rate,
        "tournamentWins": tournament_wins_list,
    }


def build_roster_cell(player: dict, folder: str, row_id: str, total_cols: int) -> tuple:
    """Возвращает (html ячейки с именем, html доп. строки <tr> с ростером или '')."""

    name = escape_text(player.get("name", ""))
    roster_file = player.get("rosterFile")

    if not roster_file:
        return f'<span class="player-name">{name}</span>', ""

    path = os.path.join(folder, roster_file)
    if not os.path.exists(path):
        print(f"  ! rosterFile не найден: {path}")
        roster_html = "<p>Не удалось загрузить ростер.</p>"
    else:
        with open(path, "r", encoding="utf-8") as f:
            roster_text = f.read()
        roster_html = f"<h4>Ростер</h4><pre>{escape_attr(roster_text)}</pre>"

    name_cell = (
        f'<button type="button" class="player-name player-name--toggle" '
        f'data-roster-target="{row_id}" aria-expanded="false">'
        f'{name}<i class="fas fa-chevron-down roster-toggle-icon"></i>'
        f"</button>"
    )

    roster_row = (
        f'<tr class="roster-row" id="{row_id}" hidden>'
        f'<td colspan="{total_cols}"><div class="roster">{roster_html}</div></td>'
        f"</tr>"
    )

    return name_cell, roster_row


def build_games_cell(player: dict) -> str:
    games = player.get("games")

    if not games:
        return "—"

    parts = []
    for g in games:
        css_class = GAME_RESULT_CLASS.get(g.get("result"), "draw")
        parts.append(f'<span class="game-score {css_class}">{g.get("points", 0)}</span>')

    return "/".join(parts)


def build_participants_table(tournament: dict, folder: str) -> str:
    players = tournament.get("players", [])

    html = f"<h2>Участники ({len(players)})</h2>"

    if not players:
        return html + "<p>Список участников пока не объявлен.</p>"

    has_results = any(p.get("games") or p.get("points") is not None for p in players)
    has_teams = any(p.get("team") for p in players)

    if has_results:
        team_totals = {}
        if has_teams:
            for p in players:
                team = p.get("team", "")
                w, l, d, pts = player_stats(p)
                totals = team_totals.setdefault(team, [0, 0])
                totals[0] += w
                totals[1] += pts

        def sort_key(p):
            w, l, d, pts = player_stats(p)
            if has_teams:
                team = p.get("team", "")
                team_wins, team_pts = team_totals.get(team, [0, 0])
                return (-team_wins, -team_pts, team, -w, -pts)
            return (-w, -pts)

        ordered = sorted(players, key=sort_key)
    else:
        ordered = list(players)

    headers = ["Место", "Игрок", "Армия"]
    if has_teams:
        headers.append("Команда")
    if has_results:
        headers.append("Игры")

    total_cols = len(headers)

    rows = ""
    prev_team = object()  # заведомо не равен ни одной команде — маркер первой строки

    for i, p in enumerate(ordered):
        team = p.get("team")
        new_team_group = has_teams and has_results and team != prev_team
        prev_team = team

        row_class = ' class="team-group-start"' if new_team_group and i > 0 else ""

        roster_row_id = f"roster-{i}"
        name_cell, roster_row = build_roster_cell(p, folder, roster_row_id, total_cols)

        cells = [
            f'<td class="rank">{i + 1}</td>',
            f"<td>{name_cell}</td>",
            f'<td>{escape_text(p.get("army", ""))}</td>',
        ]

        if has_teams:
            cells.append(f'<td class="team-cell">{escape_text(team or "")}</td>')

        if has_results:
            cells.append(f'<td class="games-cell">{build_games_cell(p)}</td>')

        rows += f"<tr{row_class}>{''.join(cells)}</tr>{roster_row}"

    header_cells = "".join(f"<th>{h}</th>" for h in headers)

    return f"""
        {html}
        <table class="bcp-table">
            <thead><tr>{header_cells}</tr></thead>
            <tbody>{rows}</tbody>
        </table>
    """


def build_page(tournament: dict, folder: str) -> str:
    slug = tournament["slug"]
    name = tournament["name"]
    description = tournament.get(
        "description",
        f"{name}. {tournament['location']}.",
    )
    page_url = f"{SITE_URL}/tournaments/{slug}/"

    content = f"""
        <h1>{escape_text(name)}</h1>
        <p class="subtitle">{format_date(tournament['date'])} · {escape_text(tournament['location'])}</p>
        <p><strong>Организатор:</strong> {escape_text(tournament['organizer'])}</p>
        {build_rules_block(tournament, folder)}
        <hr class="divider">
        {build_participants_table(tournament, folder)}
    """

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{escape_attr(name)} — Age of Sigmar Belarus</title>
    <meta name="description" content="{escape_attr(description)}">

    <meta property="og:title" content="{escape_attr(name)}">
    <meta property="og:description" content="{escape_attr(description)}">
    <meta property="og:image" content="{SITE_URL}/images/og-cover.jpg">
    <meta property="og:url" content="{page_url}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="../../style.css">
    <link rel="stylesheet" href="../../css/calendar.css">
    <link rel="icon" type="image/png" sizes="32x32" href="../../favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="../../favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="../../apple-touch-icon.png">
</head>
<body>
    <header>
        <div class="container header-content">
            <a href="../../index.html" class="logo">AoS Belarus</a>
            <nav>
                <ul>
                    <li><a href="../../index.html#news">Новости</a></li>
                    <li><a href="../../tournaments.html">Турниры</a></li>
                    <li><a href="../../community-season.html" class="nav-highlight">Community Season<span class="nav-badge">Новое</span></a></li>
                    <li><a href="../../index.html#materials">Материалы</a></li>
                    <li><a href="../../downloads.html">Загрузки</a></li>
                    <li><a href="../../index.html#links">Ссылки</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <section class="section">
        <div class="container">
            <a href="../../tournaments.html" class="back-link"><i class="fas fa-arrow-left"></i> К турнирам</a>
            <div id="tournament-content">{content}</div>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2026 Age of Sigmar Belarus. Фанатский проект.</p>
        </div>
    </footer>

    <script src="../../js/script.js"></script>
</body>
</html>
"""


# =====================
# Основной запуск
# =====================

def main():
    if not os.path.exists(TOURNAMENTS_JSON):
        print(f"File not found: {TOURNAMENTS_JSON}")
        sys.exit(1)

    with open(TOURNAMENTS_JSON, "r", encoding="utf-8") as f:
        tournaments = json.load(f)

    count = 0

    for tournament in tournaments:
        slug = tournament["slug"]
        folder = os.path.join(TOURNAMENTS_DIR, slug)

        if not os.path.isdir(folder):
            print(f"\"{slug}\" is missing: {folder} not found")
            continue

        html = build_page(tournament, folder)

        out_path = os.path.join(folder, "index.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html)

        print(f"✓ tournaments/{slug}/index.html")
        count += 1

    print(f"\nDone: {count} pages generated out of {len(tournaments)} tournaments.")

    stats = build_faction_stats(tournaments)
    with open(FACTION_STATS_JSON, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"✓ data/faction-stats.json ({stats['totalEntries']} записей по фракциям)")


if __name__ == "__main__":
    main()