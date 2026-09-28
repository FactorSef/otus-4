# LangChain-агент для API блога (Python)

Порт агента из [`agent/`](../agent) на Python: LangChain + локальная модель Qwen (`qwen/qwen3.6-35b-a3b`) в LM Studio. Инструменты, системный промпт и формат ответа те же, что в JS-версии.

| Инструмент | Операция | HTTP |
|---|---|---|
| `create_entity` | создать пользователя или статью | `POST /users`, `POST /articles` |
| `get_entity` | получить сущность по id | `GET /users/:id`, `GET /articles/:id` |
| `update_entity` | частично обновить сущность | `PATCH /users/:id`, `PATCH /articles/:id` |
| `list_entities` | получить список (статьи можно отфильтровать по автору) | `GET /users`, `GET /articles?user=:id` |

Удаления у агента нет: такого инструмента не существует, и системный промпт требует отказывать в таких запросах.

## Запуск

Нужен Python 3.11+.

1. Запустите сервер блога из корня репозитория: `docker compose up -d --build`.
2. В LM Studio загрузите модель и включите сервер (`lms server start`).
3. Создайте окружение и установите зависимости:

   ```
   cd py-agent
   python -m venv .venv
   .venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
   pip install -r requirements.txt
   ```

   Чтобы сменить адрес LM Studio или модель, скопируйте `.env.example` в `.env` и раскомментируйте нужные строки.

4. Запустите агента:

   ```
   python -m agent                             # интерактивный режим
   python -m agent "покажи все статьи bob"     # один запрос
   ```

## Формат ответа

На каждый запрос агент возвращает JSON с тремя полями:

| Поле | Значения | Смысл |
|---|---|---|
| `status` | `success` \| `failed` | выполнено ли запрошенное действие |
| `action` | `create_user`, `create_article`, `get_user`, `get_article`, `update_user`, `update_article`, `list_users`, `list_articles`, `delete_user`, `delete_article`, `multiple`, `unknown` | что просил пользователь; вспомогательный поиск id не учитывается |
| `data` | зависит от результата | при `success` — запись или массив записей из API; при `multiple` — объект `{ действие: результат }`; при `failed` — `{ reason, details? }` |

JSON печатается в stdout, а трассировка вызовов инструментов (`→` — вызов, `←` — ответ API) — в stderr: `python -m agent "покажи статьи bob" 2>nul > answer.json`.

Схема — Pydantic-модель `AgentResponse` в `agent/response.py`. Она передаётся в `create_agent` через `response_format=ToolStrategy(...)`: модель возвращает итог вызовом служебного инструмента, LangChain проверяет его по схеме и при несовпадении просит модель повторить.

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `LLM_BASE_URL` | `http://localhost:1234/v1` | OpenAI-совместимый endpoint LM Studio |
| `LLM_MODEL` | `qwen/qwen3.6-35b-a3b` | id модели из `GET /v1/models` |
| `LLM_API_KEY` | `lm-studio` | ключ; LM Studio его не проверяет |
| `API_URL` | `http://localhost:3000` | адрес сервера |

## Прокси

Python-клиенты (httpx и клиент OpenAI поверх него) берут системный прокси Windows и отправляют через него даже запросы на `localhost`. Если прокси включён, сервер блога и LM Studio отвечают через него ошибкой вроде 503. Поэтому для `localhost`, `127.0.0.1` и `::1` агент прокси не использует (`make_client` и `make_async_client` в `agent/api.py`), а для удалённых адресов работает как обычно.

## Структура

- `agent/prompt.py` — системный промпт, тот же текст, что в `agent/src/prompt.js`
- `agent/tools.py` — инструменты LangChain со схемами Pydantic и проверкой аргументов
- `agent/response.py` — схема ответа агента (`status`, `action`, `data`)
- `agent/api.py` — HTTP-клиент к серверу
- `agent/__main__.py` — модель, агент (`create_agent`), лимит в 15 вызовов инструментов на запрос, CLI

## Отличия от JS-версии

| | JS (`agent/`) | Python (`py-agent/`) |
|---|---|---|
| Схемы | Zod | Pydantic |
| HTTP | `fetch` | `httpx` |
| Запуск | `npm start` | `python -m agent` |
| `.env` | `node --env-file-if-exists` | `python-dotenv` |
| Системный прокси | не используется | отключён для локальных адресов |
