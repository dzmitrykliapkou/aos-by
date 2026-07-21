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

ARTICLES_JSON = os.path.join(ROOT, "data", "articles.json")
OUTPUT_DIR = os.path.join(ROOT, "articles")

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


def render_markdown(md_text: str) -> str:
    return markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "nl2br"],
    )


def build_page(article: dict, body_html: str) -> str:

    cover = article.get("cover")
    absolute_cover = f"{SITE_URL}/{cover}" if cover else f"{SITE_URL}/favicon.png"

    page_url = f"{SITE_URL}/articles/{article['slug']}.html"

    tags_html = "".join(
        f'<span class="tag-badge">{escape_attr(tag)}</span>'
        for tag in article.get("tags", [])
    )

    cover_html = ""
    if cover:
        cover_html = (
            f'<img src="../{escape_attr(cover)}" '
            f'alt="{escape_attr(article["title"])}" class="article-cover">'
        )

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{escape_attr(article['title'])} — Age of Sigmar Belarus</title>
    <meta name="description" content="{escape_attr(article['excerpt'])}">

    <meta property="og:title" content="{escape_attr(article['title'])}">
    <meta property="og:description" content="{escape_attr(article['excerpt'])}">
    <meta property="og:image" content="{absolute_cover}">
    <meta property="og:url" content="{page_url}">
    <meta property="og:type" content="article">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="icon" type="image/png" sizes="32x32" href="../favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="../favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="../apple-touch-icon.png">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="../style.css">
    <link rel="stylesheet" href="../css/article.css">
</head>
<body>
    <header>
        <div class="container header-content">
            <a href="../index.html" class="logo">AoS Belarus</a>
            <nav>
                <ul>
                    <li><a href="../index.html#news">Новости</a></li>
                    <li><a href="../tournaments.html">Турниры</a></li>
                    <li><a href="../index.html#materials">Материалы</a></li>
                    <li><a href="../index.html#links">Ссылки</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <section class="section">
        <div class="container">
            <a href="../index.html#materials" class="back-link"><i class="fas fa-arrow-left"></i> К материалам</a>

            <article class="article">
                {cover_html}

                <div class="article-tags">{tags_html}</div>

                <h1>{escape_attr(article['title'])}</h1>

                <p class="article-meta">{format_date(article['date'])} · {escape_attr(article['author'])}</p>

                <div class="article-body">
                    {body_html}
                </div>
            </article>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2026 Age of Sigmar Belarus. Все права принадлежат Games Workshop, фанатский проект.</p>
            <p>Сайт создан для локального комьюнити, не является официальным.</p>
        </div>
    </footer>

    <script src="../js/script.js"></script>
</body>
</html>
"""


def main():

    if not os.path.exists(ARTICLES_JSON):
        print(f"File not found: {ARTICLES_JSON}")
        sys.exit(1)

    with open(ARTICLES_JSON, "r", encoding="utf-8") as f:
        articles = json.load(f)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    count = 0

    for article in articles:

        md_path = os.path.join(ROOT, article["mdFile"])

        if not os.path.exists(md_path):
            print(f"\"{article['slug']}\" is missing: {article['mdFile']} not found")
            continue

        with open(md_path, "r", encoding="utf-8") as f:
            md_text = f.read()

        body_html = render_markdown(md_text)
        html = build_page(article, body_html)

        out_path = os.path.join(OUTPUT_DIR, f"{article['slug']}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html)

        print(f"✓ articles/{article['slug']}.html")
        count += 1

    print(f"\nDone: {count} pages generated out of {len(articles)} articles.")


if __name__ == "__main__":
    main()
