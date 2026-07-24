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
            body_html = render_markdown(f.read())

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


def build_player_block(player: dict, index: int, folder: str) -> str:
    name = escape_text(player.get("name", ""))
    army = escape_text(player.get("army", ""))
    roster_file = player.get("rosterFile")

    header = f"""
        <span class="player-name">{index + 1}. {name}</span>
        <span class="player-army">— {army}</span>
    """

    if not roster_file:
        # Нет ростера — просто строка без возможности раскрыть
        return f"""
            <div class="player-details player-details--static">
                <div class="player-summary">{header}</div>
            </div>
        """

    path = os.path.join(folder, roster_file)
    if not os.path.exists(path):
        print(f"  ! rosterFile не найден: {path}")
        roster_html = "<p>Не удалось загрузить ростер.</p>"
    else:
        with open(path, "r", encoding="utf-8") as f:
            roster_text = f.read()
        roster_html = f"<h4>Ростер</h4><pre>{escape_attr(roster_text)}</pre>"

    return f"""
        <details class="player-details">
            <summary>{header}</summary>
            <div class="roster">{roster_html}</div>
        </details>
    """


def build_players_block(tournament: dict, folder: str) -> str:
    players = tournament.get("players", [])

    html = f"<h2>Участники ({len(players)})</h2>"

    if not players:
        return html + "<p>Список участников пока не объявлен.</p>"

    ordered = list(players)
    if tournament.get("finished") and ordered[0].get("points") is not None:
        ordered = sorted(ordered, key=lambda p: p.get("points", 0), reverse=True)

    for i, player in enumerate(ordered):
        html += build_player_block(player, i, folder)

    return html


def build_results_block(tournament: dict) -> str:
    players = tournament.get("players", [])

    if not tournament.get("finished") or not players:
        return ""
    if not any(p.get("points") is not None for p in players):
        return ""

    ranked = sorted(players, key=lambda p: p.get("points", 0), reverse=True)

    rows = ""
    for i, p in enumerate(ranked):
        rows += f"""
            <tr>
                <td class="rank">{i + 1}</td>
                <td>{escape_text(p.get("name", ""))}</td>
                <td>{escape_text(p.get("army", ""))}</td>
                <td class="win">{p.get("wins", 0)}</td>
                <td class="loss">{p.get("losses", 0)}</td>
                <td class="draw">{p.get("draws", 0)}</td>
                <td class="points">{p.get("points", 0)}</td>
            </tr>
        """

    return f"""
        <h2 style="margin-top:40px;">Результаты</h2>
        <table class="bcp-table">
            <thead>
                <tr>
                    <th>Место</th>
                    <th>Игрок</th>
                    <th>Армия</th>
                    <th class="result-cell">W</th>
                    <th class="result-cell">L</th>
                    <th class="result-cell">D</th>
                    <th>Очки</th>
                </tr>
            </thead>
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
        {build_players_block(tournament, folder)}
        {build_results_block(tournament)}
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
                    <li><a href="../../index.html#materials">Материалы</a></li>
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


if __name__ == "__main__":
    main()
