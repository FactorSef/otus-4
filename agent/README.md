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

## Формат ответа

На каждый запрос агент возвращает JSON с тремя полями:

| Поле | Значения | Смысл |
|---|---|---|
| `status` | `success` \| `failed` | выполнено ли запрошенное действие |
| `action` | `create_user`, `create_article`, `get_user`, `get_article`, `update_user`, `update_article`, `list_users`, `list_articles`, `delete_user`, `delete_article`, `multiple`, `unknown` | что просил пользователь; вспомогательный поиск id не учитывается |
| `data` | зависит от результата | при `success` — запись или массив записей из API; при `multiple` — объект `{ действие: результат }`; при `failed` — `{ reason, details? }` |

Ответ на запрос «создай пользователя dave»:

```json
{
  "status": "failed",
  "action": "create_user",
  "data": { "reason": "Для создания пользователя укажите его возраст." }
}
```

JSON печатается в stdout, а трассировка вызовов инструментов (`→` — вызов, `←` — ответ API) — в stderr. Поэтому ответ можно передать дальше: `npm start --silent -- "покажи статьи bob" 2>nul > answer.json`.

Схема задана в `src/response.js` и передаётся в `createAgent` через `responseFormat: toolStrategy(...)`: модель возвращает итог вызовом служебного инструмента, LangChain проверяет его по схеме и при несовпадении просит модель повторить.

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
- `src/response.js` — Zod-схема ответа агента (`status`, `action`, `data`)
- `src/api.js` — HTTP-клиент к серверу
- `src/index.js` — создание агента (`createAgent`), структурированный ответ, лимит в 15 вызовов инструментов на запрос, CLI
