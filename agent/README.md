# LangChain-агент для API блога

Агент на LangChain.js и Claude (`claude-opus-5`). Работает с сервером из директории `server` через четыре инструмента:

| Инструмент | Операция | HTTP |
|---|---|---|
| `create_entity` | создать пользователя или статью | `POST /users`, `POST /articles` |
| `get_entity` | получить сущность по id | `GET /users/:id`, `GET /articles/:id` |
| `update_entity` | частично обновить сущность | `PATCH /users/:id`, `PATCH /articles/:id` |
| `list_entities` | получить список (статьи можно отфильтровать по автору) | `GET /users`, `GET /articles?user=:id` |

Удаления у агента нет: такого инструмента не существует, и системный промпт требует отказывать в таких запросах.

## Запуск

1. Запустите сервер в Docker из корня репозитория:

   ```
   docker compose up -d --build
   ```

   Сервер будет доступен на `http://localhost:3000`. База SQLite хранится в томе `server-data`.

2. Установите зависимости агента и укажите ключ:

   ```
   cd agent
   npm install
   copy .env.example .env      # затем впишите ANTHROPIC_API_KEY
   ```

3. Запустите агента:

   ```
   npm start                                   # интерактивный режим
   npm start -- "покажи все статьи bob"        # один запрос
   ```

Вызовы инструментов выводятся в консоль: `→` — вызов, `←` — ответ API.

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | ключ Claude API (обязателен) |
| `API_URL` | `http://localhost:3000` | адрес сервера |
| `ANTHROPIC_MODEL` | `claude-opus-5` | модель Claude |

## Структура

- `src/prompt.js` — системный промпт: роль, модель данных, ограничения API, правила вызова инструментов, формат ответа
- `src/tools.js` — инструменты LangChain со схемами Zod и проверкой аргументов
- `src/api.js` — HTTP-клиент к серверу
- `src/index.js` — создание агента (`createAgent`), лимит в 15 вызовов инструментов на запрос, CLI
