from __future__ import annotations

from typing import Any

import httpx

from ai_browser.types import (
    Cookie,
    CookieParam,
    ExecuteJsResult,
    NavigateResult,
    PageContent,
    PageLink,
    PageMetadata,
    PageTable,
    ScreenshotResult,
)


class Session:
    """Represents a browser session. Use AIBrowser.create_session() to create one."""

    def __init__(self, session_id: str, base_url: str, client: httpx.AsyncClient) -> None:
        self.id = session_id
        self._base_url = base_url
        self._client = client

    def _url(self, path: str) -> str:
        return f"{self._base_url}/sessions/{self.id}{path}"

    # ── Navigation ──

    async def navigate(
        self,
        url: str,
        *,
        wait_until: str | None = None,
        timeout: int | None = None,
    ) -> NavigateResult:
        body: dict[str, Any] = {"url": url}
        if wait_until:
            body["waitUntil"] = wait_until
        if timeout is not None:
            body["timeout"] = timeout

        resp = await self._client.post(self._url("/navigate"), json=body)
        resp.raise_for_status()
        return NavigateResult(**resp.json()["result"])

    async def go_back(self) -> NavigateResult:
        resp = await self._client.post(self._url("/back"))
        resp.raise_for_status()
        return NavigateResult(**resp.json()["result"])

    async def go_forward(self) -> NavigateResult:
        resp = await self._client.post(self._url("/forward"))
        resp.raise_for_status()
        return NavigateResult(**resp.json()["result"])

    async def reload(self) -> NavigateResult:
        resp = await self._client.post(self._url("/reload"))
        resp.raise_for_status()
        return NavigateResult(**resp.json()["result"])

    # ── Content Extraction ──

    async def get_content(self) -> PageContent:
        resp = await self._client.get(self._url("/content"))
        resp.raise_for_status()
        return PageContent(**resp.json()["content"])

    async def get_text(self) -> str:
        resp = await self._client.get(self._url("/text"))
        resp.raise_for_status()
        return resp.json()["text"]

    async def get_links(self) -> list[PageLink]:
        resp = await self._client.get(self._url("/links"))
        resp.raise_for_status()
        return [PageLink(**link) for link in resp.json()["links"]]

    async def get_tables(self) -> list[PageTable]:
        resp = await self._client.get(self._url("/tables"))
        resp.raise_for_status()
        return [PageTable(**table) for table in resp.json()["tables"]]

    async def get_metadata(self) -> PageMetadata:
        resp = await self._client.get(self._url("/metadata"))
        resp.raise_for_status()
        return PageMetadata(**resp.json()["metadata"])

    # ── Actions ──

    async def click(self, selector: str, *, timeout: int | None = None) -> None:
        resp = await self._client.post(
            self._url("/click"), json={"selector": selector, "timeout": timeout}
        )
        resp.raise_for_status()

    async def fill(self, selector: str, value: str, *, timeout: int | None = None) -> None:
        resp = await self._client.post(
            self._url("/fill"), json={"selector": selector, "value": value, "timeout": timeout}
        )
        resp.raise_for_status()

    async def type(
        self,
        selector: str,
        text: str,
        *,
        delay: int | None = None,
        timeout: int | None = None,
    ) -> None:
        resp = await self._client.post(
            self._url("/type"),
            json={"selector": selector, "text": text, "delay": delay, "timeout": timeout},
        )
        resp.raise_for_status()

    async def select(
        self, selector: str, values: list[str], *, timeout: int | None = None
    ) -> list[str]:
        resp = await self._client.post(
            self._url("/select"),
            json={"selector": selector, "values": values, "timeout": timeout},
        )
        resp.raise_for_status()
        return resp.json()["selected"]

    async def scroll(
        self,
        *,
        direction: str = "down",
        amount: int = 500,
        selector: str | None = None,
    ) -> None:
        resp = await self._client.post(
            self._url("/scroll"),
            json={"direction": direction, "amount": amount, "selector": selector},
        )
        resp.raise_for_status()

    # ── JavaScript ──

    async def execute_js(self, expression: str) -> ExecuteJsResult:
        resp = await self._client.post(
            self._url("/execute"), json={"expression": expression}
        )
        resp.raise_for_status()
        return ExecuteJsResult(**resp.json()["result"])

    # ── Screenshots ──

    async def screenshot(
        self,
        *,
        full_page: bool = False,
        image_type: str = "png",
        quality: int | None = None,
        selector: str | None = None,
    ) -> ScreenshotResult:
        params: dict[str, str] = {}
        if full_page:
            params["fullPage"] = "true"
        if image_type != "png":
            params["type"] = image_type
        if quality is not None:
            params["quality"] = str(quality)
        if selector:
            params["selector"] = selector

        resp = await self._client.get(self._url("/screenshot"), params=params)
        resp.raise_for_status()
        return ScreenshotResult(**resp.json()["screenshot"])

    # ── Cookies ──

    async def get_cookies(self) -> list[Cookie]:
        resp = await self._client.get(self._url("/cookies"))
        resp.raise_for_status()
        return [Cookie(**c) for c in resp.json()["cookies"]]

    async def set_cookies(self, cookies: list[CookieParam]) -> None:
        resp = await self._client.post(
            self._url("/cookies"),
            json={"cookies": [c.model_dump(exclude_none=True) for c in cookies]},
        )
        resp.raise_for_status()

    async def clear_cookies(self) -> None:
        resp = await self._client.delete(self._url("/cookies"))
        resp.raise_for_status()

    # ── Lifecycle ──

    async def destroy(self) -> None:
        resp = await self._client.delete(f"{self._base_url}/sessions/{self.id}")
        # 204 is expected
        if resp.status_code not in (200, 204):
            resp.raise_for_status()
