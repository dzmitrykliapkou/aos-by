# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static landing page for the Belarusian Warhammer Age of Sigmar community, served from GitHub Pages at the custom domain `aos.by` (see `CNAME`). No package manager, no build tooling beyond two Python scripts, no test suite, no linters. All site-facing content is in Russian.

## Commands

```bash
pip install markdown --break-system-packages   # the only dependency

python3 scripts/build-articles.py       # data/articles.json + .md -> articles/<slug>.html
python3 scripts/build-tournaments.py    # data/tournaments.json -> tournaments/<slug>/index.html
                                        # also regenerates data/faction-stats.json
```

Both scripts resolve paths from `os.getcwd()`, so run them from the repository root. They regenerate every page on each run, not just changed ones. To preview locally, serve the root over HTTP (`python3 -m http.server`) — the pages `fetch()` JSON from `/data/`, so `file://` will not work.

## Generated output is not committed

`.gitignore` excludes `articles/**/*.html` and `tournaments/**/*.html`. The GitHub Actions workflow (`.github/workflows/deploy.yaml`) runs both generators on every push to `main` and deploys the whole working tree. So a content change is committed as `.md` + `.json` only; running the generators locally is for verification, and the resulting HTML stays untracked.

The one exception is `data/faction-stats.json`: it is generator *output* but it is tracked, because `js/tournament-stats.js` fetches it at runtime. It drifts out of date whenever `data/tournaments.json` is edited without a local generator run — CI always rebuilds it before deploy, so the live site is fine, but the committed copy can be stale.

## Two rendering paths

Content reaches the browser in one of two ways, and knowing which applies determines where to make a change:

- **Build-time (Python)** — article and tournament pages. Markdown and roster `.txt` files are rendered into the HTML by the generators; the deployed page contains no `fetch()` for its own content.
- **Runtime (vanilla JS)** — the index/listing pages. Each `js/*.js` module fetches a `data/*.json` file and injects into a container element: `news.js`/`materials.js` → `articles.json`, `calendar.js`/`tournaments.js` → `events.json`, `tournament-stats.js` → `faction-stats.json`, `downloads.js` → `downloads.json`, `community-season.js` → `community-season.json`. `script.js` is shared (nav, dev banner, roster expand/collapse on tournament pages).

## Data model

`data/*.json` is the source of truth; the HTML in `articles/` and `tournaments/` is derived.

**Articles** — an entry in `data/articles.json` plus the markdown file it points to via `mdFile` (under `articles/news/`, `articles/lore/`, `articles/guide/`, `articles/places/`). The `tags` array decides placement: an article tagged `новость` appears under Новости and gets a "К новостям" back-link; anything else lands under Материалы. Markdown may contain raw HTML (e.g. `<img class="article-inline-img">`); YAML frontmatter is stripped if present.

**Tournaments** — an entry in `data/tournaments.json` plus a `tournaments/<slug>/` folder holding `rules.md` and `rosters/*.txt`. The page shape is inferred from which fields are populated, so there is no separate template to pick:

- `rulesFile` (rendered inline) or `rulesLink` (button); neither → no rules block
- no `players` → "Список участников пока не объявлен"
- `players` without armies → name-only list (the Армия column is omitted)
- any player with `games[]` or `points` → ranked results table with Место and Игры columns
- any player with `team` → team columns and team-first sorting

Per-game results use `games: [{points, result}]`; the older flat `wins`/`losses`/`draws`/`points` fields are still read as a fallback. Faction statistics skip players whose `army` is empty or contains a comma (comma means a team entry listing several armies).

**Events are separate.** `data/events.json` drives the calendar and the tournament cards on `tournaments.html` and is not derived from `tournaments.json`. Adding a tournament means adding it in both files.

## Pages CMS

`.pages.yml` is the schema for [Pages CMS](https://pagescms.org), which non-technical editors use to add articles and tournaments. It commits straight to `main` (such commits are suffixed "(via Pages CMS)"). Changing the shape of `data/*.json` or adding a field a generator reads means updating `.pages.yml` too, or the CMS will silently drop it on the next save.

The CMS player schema currently exposes only `name`, `army`, `rosterFile` and the flat `wins`/`losses`/`draws`/`points`. The `games[]` and `team` fields that the generator supports have to be edited by hand in git.

## JSON formatting

`data/tournaments.json` keeps small objects on a single line (`{ "points": 37, "result": "win" }`). `json.dump(..., indent=2)` expands those and produces a several-hundred-line diff for a one-line change. Edit the file textually, or restore the original formatting afterwards.
