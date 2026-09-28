"""CLI агента: python -m agent [запрос]."""

import json
import os
import sys

from dotenv import load_dotenv

# .env читается до импорта модулей, которые берут настройки из окружения
load_dotenv()

from langchain.agents import create_agent  # noqa: E402
from langchain.agents.middleware import ToolCallLimitMiddleware  # noqa: E402
from langchain.agents.structured_output import ToolStrategy  # noqa: E402
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage  # noqa: E402
from langchain_openai import ChatOpenAI  # noqa: E402

from .api import API_URL, make_async_client, make_client  # noqa: E402
from .prompt import SYSTEM_PROMPT  # noqa: E402
from .response import AgentResponse, failed  # noqa: E402
from .tools import TOOLS  # noqa: E402

# Консоль Windows по умолчанию может быть не в UTF-8
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://localhost:1234/v1")

# LM Studio отдаёт OpenAI-совместимый API; ключ он не проверяет, но клиенту нужен непустой
model = ChatOpenAI(
    model=os.environ.get("LLM_MODEL", "qwen/qwen3.6-35b-a3b"),
    api_key=os.environ.get("LLM_API_KEY", "lm-studio"),
    base_url=LLM_BASE_URL,
    # Свои HTTP-клиенты решают вопрос с прокси; без socket options langchain-openai не пишет о нём предупреждение
    http_client=make_client(LLM_BASE_URL),
    http_async_client=make_async_client(LLM_BASE_URL),
    http_socket_options=(),
    temperature=0,
    max_tokens=8000,
)

agent = create_agent(
    model,
    TOOLS,
    system_prompt=SYSTEM_PROMPT,
    # Итог возвращается вызовом служебного инструмента и проверяется схемой; при несовпадении модель повторяет попытку
    response_format=ToolStrategy(AgentResponse),
    # Предохранитель от зацикливания: не больше 15 вызовов инструментов на один запрос
    middleware=[ToolCallLimitMiddleware(run_limit=15, exit_behavior="end")],
)

TOOL_NAMES = {t.name for t in TOOLS}

# История диалога хранится в памяти процесса
messages: list[BaseMessage] = []


def trace(new_messages: list[BaseMessage]) -> None:
    """Трассировка вызовов идёт в stderr, чтобы в stdout был только JSON-ответ."""
    for message in new_messages:
        if isinstance(message, AIMessage):
            for call in message.tool_calls:
                if call["name"] in TOOL_NAMES:
                    print(f"  → {call['name']}({json.dumps(call['args'], ensure_ascii=False)})", file=sys.stderr)
        elif isinstance(message, ToolMessage) and message.name in TOOL_NAMES:
            text = str(message.content)
            print(f"  ← {text[:200] + '…' if len(text) > 200 else text}", file=sys.stderr)


def ask(question: str) -> AgentResponse:
    global messages
    start = len(messages)
    result = agent.invoke({"messages": [*messages, {"role": "user", "content": question}]})
    messages = result["messages"]
    trace(messages[start:])

    # Структурированного ответа нет, если сработал лимит вызовов инструментов
    return result.get("structured_response") or failed(
        "unknown", "Агент не сформировал ответ: превышен лимит вызовов инструментов"
    )


def emit(response: AgentResponse) -> None:
    print(json.dumps(response.model_dump(), ensure_ascii=False, indent=2), flush=True)


def main() -> int:
    one_shot = " ".join(sys.argv[1:]).strip()
    if one_shot:
        try:
            emit(ask(one_shot))
        except Exception as err:  # noqa: BLE001 — любой сбой превращается в JSON-ответ
            emit(failed("unknown", f"Ошибка агента: {err}"))
            return 1
        return 0

    print(f"Агент подключён к API {API_URL}. Введите запрос, «exit» — выход.", file=sys.stderr)
    while True:
        try:
            question = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not question:
            continue
        if question.lower() in ("exit", "quit", "выход"):
            break
        try:
            emit(ask(question))
        except Exception as err:  # noqa: BLE001
            emit(failed("unknown", f"Ошибка агента: {err}"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
