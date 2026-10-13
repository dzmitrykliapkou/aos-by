# aos.by: moving to a backend (concept)

Status: concept, agreed 2026-10-13. Covers the requirements in `TODO.md`.

## Goals

From `TODO.md`:

1. **Galleries**: standalone gallery pages (images only) and galleries/carousels embedded in articles.
2. **Visual article editor**: no hand-written HTML in markdown. Tables, images, carousels, and cover and preview images that are validated for size and format.
3. **Roles**: content author, tournament organizer, site admin.
4. **Tournament management**: create from a template (single / team / pairs), rules as text or as a link, an announcement article, players and rosters, results, and finalization (only finalized tournaments count in the statistics). Tournaments show up in the calendar automatically.
5. **Admins manage everything**, including non-tournament calendar events, shared images and the site's preview images.

## Decisions and constraints

| Topic | Decision |
|---|---|
| Stack | Django + Wagtail (current LTS of both), Python 3.12+ |
| Database | PostgreSQL |
| Rendering | Server-rendered Django templates, ported from the current HTML/CSS. No SPA. |
| Hosting | Belarusian VPS: hoster.by or A1 |
| Scale | About 5 authors, a handful of organizers, low traffic |
| Results entry | After the tournament is over. No live round-by-round entry, so desktop-first admin screens are enough. |
| Pages CMS | Not used any more. Remove `.pages.yml` and the CLAUDE.md section at cutover. |

Wagtail was chosen over Go/PocketBase because most of the requirements are editorial. Wagtail covers the editor, image renditions, revisions, drafts and scheduled publishing, and group permissions out of the box. With Go, the editor would have to be built from scratch.

## Architecture

```
            ┌──────────────── VPS (hoster.by / A1) ────────────────┐
 browser ──▶│ caddy :443  ── TLS (Let's Encrypt), gzip/zstd         │
            │   ├─ /static/, /media/  → served from volumes         │
            │   └─ everything else    → app:8000                    │
            │ app       ── Django + Wagtail on gunicorn             │
            │ postgres  ── data volume                              │
            │ backup    ── nightly pg_dump + media sync → off-site  │
            └───────────────────────────────────────────────────────┘
```

- **Docker Compose** with services `caddy`, `app`, `postgres` and `backup`.
- **CI/CD**: GitHub Actions runs tests, builds the image and pushes it to GHCR. It then deploys over SSH: `compose pull && compose up -d`, then `migrate` and `collectstatic` (both run as part of container start).
- **Media** is stored on a local volume. Wagtail renditions (WebP/AVIF) are generated on demand and cached on disk.
- **Backups**: nightly `pg_dump` and a media rsync to off-site storage, with a restore drill before cutover.
- **Staging**: `new.aos.by` (or similar) on the same box until cutover.
- **Caching**: not needed at this scale. Wagtail's frontend cache or `wagtail-cache` can be added later if needed.
- **Personal data**: the site stores player names and author accounts. Check compliance with Law of Belarus No. 99-З (personal data). Local hosting makes this simpler.

## Roles (Wagtail groups)

| Group | Can |
|---|---|
| **Author** | Create, edit and submit articles; upload images; create galleries. Publishing is either direct or via moderation (see open questions). |
| **Organizer** | Create tournaments and edit **their own**; edit the tournament's announcement article; manage players, rosters and results; finalize. |
| **Admin** | Everything: all pages, calendar events, downloads, community season, site settings (logo, default OG/preview images), users. |

Ownership-scoped permissions for organizers come from Wagtail page permissions on the tournament index plus an `owner` check, or from a per-tournament `organizers` M2M checked in a `permission_policy` / `before_edit_page` hook.

## Content model

### Pages (Wagtail page tree)

```
HomePage
├── NewsIndexPage            /news/
├── MaterialsIndexPage       /materials/
│   └── ArticlePage          (news vs. materials decided by tag, as today)
├── GalleryIndexPage         /galleries/
│   └── GalleryPage          standalone gallery, images only
├── TournamentIndexPage      /tournaments/
│   └── TournamentPage
├── CalendarPage             /calendar/  (or a block on the home page)
├── DownloadsPage
└── CommunitySeasonPage
```

**ArticlePage**
- `title`, `slug`, `date`, `author` (FK to user, plus an optional free-text byline such as "AoS Belarus"), `excerpt`, `tags` (taggit)
- `cover_image`: validated, e.g. minimum 1600×900, jpg/png/webp, focal point supported
- `preview_image`: for cards and OG; falls back to `cover_image`
- `body`: StreamField with these blocks:
  - `paragraph`: RichTextBlock with a restricted feature set (bold, italic, links, lists, h2–h4)
  - `image`: image + caption + width option (inline / wide / full), which replaces today's `<img class="article-inline-img">`
  - `gallery`: a chooser for a `Gallery` snippet, rendered as a horizontal-scroll carousel
  - `table`: `TypedTableBlock` (or `TableBlock`)
  - `embed`: YouTube, VK video and similar
  - `quote`, `callout` (note / warning)
  - `tournament_card`: link to a TournamentPage, showing date, place and status

**Gallery** (snippet) + **GalleryPage**
- A `Gallery` snippet holds an ordered list of images with captions.
- It is reusable: the same gallery can be embedded in several articles (`gallery` block) **and** published standalone via `GalleryPage`, which just renders a chosen `Gallery`. This covers both cases in TODO item 1.

**TournamentPage**
- `name`, `date` (+ optional end date), `venue` (FK to a `Venue` snippet), `organizers` (M2M users), `game_system` (AoS / Blood Bowl / …; Blood Bowl already exists)
- `format`: `single` / `team` / `pairs`, which selects the page template and the team fields. Team size is 3 for team and 2 for pairs, with the default overridable.
- `rules`: a StreamField with a rich-text block or a link block (or none). This covers both `rulesFile` and `rulesLink`.
- `announcement`: FK to an ArticlePage. The organizer has edit rights on that article.
- `status`: `draft` → `announced` → `finished` → `finalized`
- Participants are stored as inline (Orderable) child models; see below.

The page shape is still derived from the data, as the current generator does it: no players means "Список участников пока не объявлен", names only means no Армия column, any results means the ranked table, and teams mean team columns.

### Tournament data (Django models, edited inline on TournamentPage)

```
Team         (tournament, name)
Participant  (tournament, team?, name, faction FK?, roster text, roster file?, sort order)
GameResult   (participant, round_no, points, result: win/draw/loss, opponent?: Participant)
```

- `Faction` is a snippet listing the factions per game system. It replaces free-text `army`, which makes the statistics reliable. A team entry with several armies is no longer a comma-separated string.
- The roster is pasted as text (what the `.txt` files contain now), with an optional file upload.
- Results are entered after the event in an inline grid on the tournament edit screen, or bulk-imported from CSV/XLSX through a custom admin view (name, round, points, result).
- **Finalize** is a custom action: it validates completeness (every participant has N games), sets `status=finalized`, and locks the results for non-admins.

### Calendar

- `CalendarEvent` snippet: `title`, `date`, `category` (Турнир / Открытый день / …), `venue`, `organizer`, `link` (page chooser or URL).
- Tournaments are **not** duplicated as events. The calendar view merges `CalendarEvent` items with `TournamentPage` items (status ≥ announced) into one list. This removes today's `events.json` / `tournaments.json` duplication.
- Admins (and optionally authors) manage non-tournament events.

### Statistics

- Faction statistics are computed by a query over **finalized** tournaments: per faction, games, win/draw/loss, win rate and average points. The query is filtered by game system and skips participants without a single faction.
- It is computed on request (cheap at this scale) or cached and invalidated on finalize.
- The community-season standings stay manually edited for now (snippet or page with an inline table). They could later be computed from tournament results if the scoring rules are formalized.

### Other

- `Download` snippet: title, description, category, external link or uploaded document.
- Site settings (`wagtail.contrib.settings`): logo, default OG image, the dev banner toggle, nav links.
- `wagtail.contrib.redirects` for legacy URLs, `wagtail.contrib.sitemaps` replacing the hand-maintained `sitemap.xml`, and `robots.txt` served by a view.

## URLs

The current URLs are `/articles/<slug>.html`, `/tournaments/<slug>/` and the top-level `*.html` pages.

- Keep `/tournaments/<slug>/` as is.
- 301-redirect `/articles/<slug>.html` to the new article URLs, and `/tournaments.html`, `/downloads.html` etc. to their new pages. The redirects are created by the migration script.

## Migration of existing content

A rerunnable management command, `import_legacy`, reads the current repo:

| Source | Target |
|---|---|
| `data/articles.json` + `articles/**/*.md` | ArticlePage. Markdown is converted to HTML and then split into StreamField blocks; `<img>` tags become `image` blocks. Covers and inline images come from `images/` and `articles/images/` into the Wagtail image library. |
| `data/tournaments.json` + `tournaments/<slug>/rules.md` + `rosters/*.txt` | TournamentPage, Team, Participant, GameResult. Flat `wins`/`losses`/`draws`/`points` become synthetic results or a summary (decide per case). `finished: true` becomes `finalized`. |
| `data/events.json` | CalendarEvent, skipping entries whose `url` points to an imported tournament |
| `data/downloads.json` | Download |
| `data/community-season.json` | Community season table |
| free-text `army` | Faction snippets, through a mapping table built from the existing values |

The command is idempotent (upsert by slug), so it can be rerun right up to cutover. Articles with complex inline HTML are listed for a manual check after import.

## Phases

Phases are in development order. Public cutover happens once, at the end of phase 3, because everything sits on one domain.

0. **Skeleton and infrastructure**: Wagtail project, Compose stack, CI/CD, staging on `new.aos.by`, backups.
1. **Tournaments and calendar**: Tournament, Participant and GameResult models; organizer group; CSV import; finalize; statistics; calendar.
2. **Articles and galleries**: ArticlePage with StreamField, Gallery and GalleryPage, author group, image validation.
3. **Everything else, then cutover**: downloads, community season, settings, redirects, sitemap, final `import_legacy` run, content freeze in git, DNS switch of `aos.by` to the VPS, GitHub Pages disabled.
4. **After cutover**: archive the static generators (`scripts/`, `js/*` loaders), remove `.pages.yml`, rewrite CLAUDE.md.

## Repository layout

The options are a new `backend/` directory in this repo (the static site keeps deploying from root until cutover) or a new repository. Leaning toward the same repo so `import_legacy` can read the legacy files directly. After cutover the legacy files move to `legacy/` or are deleted.

## Open questions

- **Author publishing**: should authors publish directly, or submit for admin review (Wagtail moderation workflow)?
- **Player identity**: keep players as plain names per tournament, or add a `Person` model so the same player is linked across tournaments (personal stats, community season computed automatically)? `Person` is more useful, but means more personal data.
- **Account creation**: admin-created only, or invite links?
- **Public registration** for tournaments (players sign up on the site) is out of scope for now. Confirm.
- **Old flat-format results** (`wins`/`losses`/`points` without `games[]`): how should they be represented in GameResult?
