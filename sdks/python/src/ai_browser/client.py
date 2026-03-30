from __future__ import annotations

from types import TracebackType

import httpx

from ai_browser.session import Session
from ai_browser.types import SessionInfo


class AIBrowser:
    """AI Browser Python SDK client.

    Usage::

        async with AIBrowser("http://localhost:3000") as browser:
            session = await browser.create_session()
            await session.navigate("https://example.com")
            content = await session.get_content()
            print(content.text)
            await session.destroy()
    """

    def __init__(self, base_url: str = "http://127.0.0.1:3000") -> None:
        self._base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(timeout=60.0)

    async def __aenter__(self) -> AIBrowser:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        await self.close()

    async def close(self) -> None:
        await self._client.aclose()

    async def health(self) -> dict:
        resp = await self._client.get(f"{self._base_url}/health")
        resp.raise_for_status()
        return resp.json()

    async def create_session(self) -> Session:
        resp = await self._client.post(f"{self._base_url}/sessions")
        resp.raise_for_status()
        data = resp.json()["session"]
        return Session(data["id"], self._base_url, self._client)

    async def list_sessions(self) -> list[SessionInfo]:
        resp = await self._client.get(f"{self._base_url}/sessions")
        resp.raise_for_status()
        return [SessionInfo(**s) for s in resp.json()["sessions"]]

    async def get_session(self, session_id: str) -> Session:
        resp = await self._client.get(f"{self._base_url}/sessions/{session_id}")
        resp.raise_for_status()
        return Session(session_id, self._base_url, self._client)
