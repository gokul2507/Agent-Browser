from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model that accepts both camelCase (from API) and snake_case field names."""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


class SessionInfo(CamelModel):
    id: str
    created_at: str | None = None
    last_activity: str | None = None
    current_url: str | None = None


class NavigateResult(CamelModel):
    url: str
    title: str
    status: int | None = None
    load_time_ms: float | None = None


class PageMetadata(CamelModel):
    description: str | None = None
    author: str | None = None
    published_date: str | None = None
    og_title: str | None = None
    og_image: str | None = None


class PageLink(BaseModel):
    text: str
    href: str


class PageTable(BaseModel):
    headers: list[str]
    rows: list[list[str]]


class FormField(BaseModel):
    name: str
    type: str
    required: bool = False
    placeholder: str | None = None
    value: str | None = None


class PageForm(BaseModel):
    action: str
    method: str
    fields: list[FormField]


class PageContent(CamelModel):
    url: str
    title: str
    text: str
    metadata: PageMetadata = PageMetadata()
    links: list[PageLink] = []
    tables: list[PageTable] = []
    forms: list[PageForm] = []


class ExecuteJsResult(BaseModel):
    result: object | None = None
    error: str | None = None


class ScreenshotResult(CamelModel):
    data: str
    mime_type: str
    width: int | None = None
    height: int | None = None


class Cookie(CamelModel):
    name: str
    value: str
    domain: str = ""
    path: str = "/"
    secure: bool | None = None
    http_only: bool | None = None
    expires: float | None = None
    same_site: str | None = None


class CookieParam(CamelModel):
    name: str
    value: str
    domain: str | None = None
    path: str | None = None
    secure: bool | None = None
    http_only: bool | None = None
    expires: float | None = None
    same_site: str | None = None
