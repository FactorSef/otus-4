"""Схема итогового ответа агента."""

from typing import Any, Literal

from pydantic import BaseModel, Field

Action = Literal[
    "create_user",
    "create_article",
    "get_user",
    "get_article",
    "update_user",
    "update_article",
    "list_users",
    "list_articles",
    "delete_user",
    "delete_article",
    "multiple",
    "unknown",
]


class AgentResponse(BaseModel):
    """Итоговый ответ агента на запрос пользователя."""

    status: Literal["success", "failed"] = Field(
        description="success — запрошенное действие выполнено; failed — не выполнено (ошибка API, отказ, не хватает данных)",
    )
    action: Action = Field(
        description=(
            "Действие, которое просил пользователь (а не вспомогательный поиск id). "
            "multiple — если в запросе несколько независимых действий; unknown — запрос не относится к API блога."
        ),
    )
    data: Any = Field(
        description=(
            "При success — результат из API: созданная или обновлённая запись, запись по id или массив записей. "
            "При multiple — объект, где ключ — действие, значение — его результат. "
            'При failed — объект { reason: "причина или вопрос пользователю на русском", details?: ошибка из API }.'
        ),
    )


def failed(action: Action, reason: str, details: Any = None) -> AgentResponse:
    data = {"reason": reason} if details is None else {"reason": reason, "details": details}
    return AgentResponse(status="failed", action=action, data=data)
