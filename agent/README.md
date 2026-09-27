# LangChain-агент для API блога

Агент на LangChain.js и локальной модели Qwen (`qwen/qwen3.6-35b-a3b`) в LM Studio. Работает с сервером из директории `server` через четыре инструмента:

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

2. В LM Studio загрузите модель и включите сервер (вкладка Developer → Start Server или `lms server start`). Он отдаёт OpenAI-совместимый API на `http://localhost:1234/v1`.

3. Установите зависимости агента:

   ```
   cd agent
   npm install
   ```

   Чтобы сменить адрес LM Studio или модель, скопируйте `.env.example` в `.env` и раскомментируйте нужные строки.

4. Запустите агента (нужен Node.js 22.13+):

   ```
   npm start                                   # интерактивный режим
   npm start -- "покажи все статьи bob"        # один запрос
   ```

Вызовы инструментов выводятся в консоль: `→` — вызов, `←` — ответ API.

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `LLM_BASE_URL` | `http://localhost:1234/v1` | OpenAI-совместимый endpoint LM Studio |
| `LLM_MODEL` | `qwen/qwen3.6-35b-a3b` | id модели из `GET /v1/models` |
| `LLM_API_KEY` | `lm-studio` | ключ; LM Studio его не проверяет |
| `API_URL` | `http://localhost:3000` | адрес сервера |

## Структура

- `src/prompt.js` — системный промпт: роль, модель данных, ограничения API, правила вызова инструментов, формат ответа
- `src/tools.js` — инструменты LangChain со схемами Zod и проверкой аргументов
- `src/api.js` — HTTP-клиент к серверу
- `src/index.js` — создание агента (`createAgent`), лимит в 15 вызовов инструментов на запрос, CLI
