"""Тонкий HTTP-клиент к серверу из директории server."""

import os
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx

API_URL = os.environ.get("API_URL", "http://localhost:3000").rstrip("/")

RESOURCES = {
    "user": "/users",
    "article": "/articles",
}


LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def is_local(url: str) -> bool:
    return urlparse(url).hostname in LOCAL_HOSTS


# httpx берёт системный прокси Windows и шлёт через него даже запросы на localhost — для локальных адресов отключаем
def _client_options(base_url: str) -> dict[str, Any]:
    return {"trust_env": not is_local(base_url), "timeout": httpx.Timeout(30, read=600)}


def make_client(base_url: str) -> httpx.Client:
    return httpx.Client(**_client_options(base_url))


def make_async_client(base_url: str) -> httpx.AsyncClient:
    return httpx.AsyncClient(**_client_options(base_url))


_client = make_client(API_URL)


@dataclass
class ApiResult:
    ok: bool
    status: int
    data: Any


def request(method: str, path: str, body: dict[str, Any] | None = None) -> ApiResult:
    try:
        res = _client.request(method, f"{API_URL}{path}", json=body)
    except httpx.HTTPError as err:
        return ApiResult(False, 0, {"error": f"API недоступен по адресу {API_URL}: {err}"})
    try:
        data = res.json() if res.content else None
    except ValueError:
        data = res.text
    return ApiResult(res.is_success, res.status_code, data)
