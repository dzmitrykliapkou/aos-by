# Генератор статичных страниц для статей

## Перед использованием

```bash
pip install markdown --break-system-packages
```

## Как использовать

Запускать при каждой новой/изменённой статье:

```bash
python3 scripts/build_articles.py
```

Скрипт читает `data/articles.json`, конвертит каждый `.md` в `HTML`, сохраняет готовую страницу `articles/<slug>.html` с уникальными OG-тегами.