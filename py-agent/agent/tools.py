"""Инструменты LangChain: по одному на операцию, для обеих сущностей через параметр entity."""

import json
from typing import Any, Literal

from langchain_core.tools import tool
from pydantic import BaseModel, Field

from .api import RESOURCES, ApiResult, request

Entity = Literal["user", "article"]

ENTITY_DESC = 'Тип сущности: "user" — пользователь, "article" — статья'
ID_DESC = "Числовой id сущности"

FIELDS = {
    "user": ["username", "age"],
    "article": ["title", "text", "user_id"],
}


class EntityFields(BaseModel):
    username: str | None = Field(None, min_length=1, description="user: имя пользователя, непустое и уникальное")
    age: int | None = Field(None, ge=0, description="user: возраст, целое число >= 0")
    title: str | None = Field(None, min_length=1, description="article: заголовок, непустая строка")
    text: str | None = Field(None, description="article: текст статьи")
    user_id: int | None = Field(None, gt=0, description="article: id существующего пользователя-автора")


class CreateArgs(EntityFields):
    entity: Entity = Field(description=ENTITY_DESC)


class GetArgs(BaseModel):
    entity: Entity = Field(description=ENTITY_DESC)
    id: int = Field(gt=0, description=ID_DESC)


class UpdateArgs(EntityFields):
    entity: Entity = Field(description=ENTITY_DESC)
    id: int = Field(gt=0, description=ID_DESC)


class ListArgs(BaseModel):
    entity: Entity = Field(description=ENTITY_DESC)
    user_id: int | None = Field(None, gt=0, description="article: вернуть только статьи этого пользователя")


def _pick_body(kind: str, fields: dict[str, Any]) -> dict[str, Any]:
    """Оставляет только поля выбранной сущности и переводит их в формат API."""
    return {("user" if key == "user_id" else key): fields[key] for key in FIELDS[kind] if fields.get(key) is not None}


def _foreign_fields(kind: str, fields: dict[str, Any]) -> list[str]:
    other = FIELDS["article" if kind == "user" else "user"]
    return [key for key in other if fields.get(key) is not None]


# Результат инструмента — строка JSON, которую модель читает как данные.
def _format(result: ApiResult) -> str:
    key = "result" if result.ok else "error"
    return json.dumps({"ok": result.ok, "status": result.status, key: result.data}, ensure_ascii=False)


def _invalid(message: str) -> str:
    return json.dumps({"ok": False, "status": "invalid_arguments", "error": message}, ensure_ascii=False)


@tool(
    "create_entity",
    args_schema=CreateArgs,
    description=(
        "Создаёт новую сущность (POST). Для user обязательны username и age. "
        "Для article обязательны title, text и user_id (id существующего пользователя). "
        "Возвращает созданную запись с присвоенным id."
    ),
)
def create_entity(entity: str, **fields: Any) -> str:
    extra = _foreign_fields(entity, fields)
    if extra:
        return _invalid(f"Поля {', '.join(extra)} не относятся к сущности {entity}")
    missing = [key for key in FIELDS[entity] if fields.get(key) is None]
    if missing:
        return _invalid(f"Для создания {entity} не хватает полей: {', '.join(missing)}")
    return _format(request("POST", RESOURCES[entity], _pick_body(entity, fields)))


@tool(
    "get_entity",
    args_schema=GetArgs,
    description="Получает одну сущность по id (GET). Статья возвращается с вложенным объектом автора.",
)
def get_entity(entity: str, id: int) -> str:
    return _format(request("GET", f"{RESOURCES[entity]}/{id}"))


@tool(
    "update_entity",
    args_schema=UpdateArgs,
    description=(
        "Частично обновляет сущность по id (PATCH): меняются только переданные поля, остальные сохраняются. "
        "Для user можно менять username и age, для article — title, text и user_id."
    ),
)
def update_entity(entity: str, id: int, **fields: Any) -> str:
    extra = _foreign_fields(entity, fields)
    if extra:
        return _invalid(f"Поля {', '.join(extra)} не относятся к сущности {entity}")
    body = _pick_body(entity, fields)
    if not body:
        return _invalid("Не передано ни одного поля для обновления")
    return _format(request("PATCH", f"{RESOURCES[entity]}/{id}", body))


@tool(
    "list_entities",
    args_schema=ListArgs,
    description=(
        "Возвращает список всех сущностей типа (GET). Для article можно отфильтровать статьи одного автора через user_id. "
        "Используйте, чтобы найти id пользователя по имени или статьи по заголовку."
    ),
)
def list_entities(entity: str, user_id: int | None = None) -> str:
    if user_id is not None and entity != "article":
        return _invalid("Фильтр user_id доступен только для article")
    query = f"?user={user_id}" if user_id is not None else ""
    return _format(request("GET", f"{RESOURCES[entity]}{query}"))


TOOLS = [create_entity, get_entity, update_entity, list_entities]
