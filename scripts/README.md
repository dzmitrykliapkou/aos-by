# Генератор статичных страниц для статей

## Перед использованием

```bash
pip install markdown --break-system-packages
```

## Как использовать

Запускать при каждой новой/изменённой статье:

```bash
python3 scripts/build-articles.py
```

Скрипт читает `data/articles.json`, конвертит каждый `.md` в `HTML`, сохраняет готовую страницу `articles/<slug>.html` с уникальными OG-тегами.

# Генератор статичных страниц для турниров

Запускать при добавлении/изменении турнира:

```bash
python3 scripts/build-tournaments.py
```

Скрипт читает `data/tournaments.json` (единственный источник данных по турнирам) и генерирует `tournaments/<slug>/index.html` — вид страницы (только регламент / +участники / +результаты) подбирается автоматически по тому, какие поля заполнены в JSON. Регламент (`rulesFile`) и ростеры (`rosterFile`) рендерятся из файлов внутри `tournaments/<slug>/` прямо в HTML на этапе сборки — на странице не остаётся никакого fetch к JSON или .md/.txt файлам.

Календарь и список на `tournaments.html` — независимая сущность, читают `data/events.json` как раньше и этим скриптом не трогаются. При добавлении турнира запись в `events.json` (title/date/location/organizer/url) нужно завести вручную, как и раньше.

## Формат `data/tournaments.json`

```json
{
  "slug": "my-tournament-2026",
  "name": "Название турнира",
  "date": "2026-09-01",
  "location": "Минск, клуб «Логово Дракона»",
  "organizer": "Имя",
  "rulesFile": "rules.md",
  "rulesLink": "https://...",
  "finished": false,
  "players": [
    {
      "name": "Игрок",
      "army": "Армия",
      "rosterFile": "rosters/player.txt",
      "wins": 0, "losses": 0, "draws": 0, "points": 0
    }
  ]
}
```

- `rulesFile` **или** `rulesLink` — если нет ни одного, блок регламента не выводится.
- `players` может быть пустым — тогда страница покажет только регламент.
- `rosterFile` у игрока необязателен — без него строка участника выводится без раскрывашки.
- Таблица результатов появляется только если `finished: true` и хотя бы у одного игрока указано `points`.
- Файлы `rules.md` и `rosters/*.txt` должны лежать в папке `tournaments/<slug>/`.