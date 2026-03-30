"""
Python Agent Example — Use AI Browser as a research tool.

Run: python examples/python-agent/example.py
Requires: API server running on localhost:3000, ai-browser pip package installed
"""

import asyncio
from ai_browser import AIBrowser


async def research(query: str) -> dict:
    """Navigate to a search-friendly site and extract information."""
    async with AIBrowser("http://localhost:3000") as browser:
        session = await browser.create_session()

        # Navigate to Wikipedia search
        await session.navigate(f"https://en.wikipedia.org/wiki/{query.replace(' ', '_')}")

        # Extract structured content
        content = await session.get_content()

        # Get key metadata
        metadata = await session.get_metadata()

        # Get all outbound links for further research
        links = await session.get_links()
        external_links = [l for l in links if "wikipedia" not in l.href and l.href.startswith("http")]

        await session.destroy()

        return {
            "title": content.title,
            "summary": content.text[:500],
            "metadata": metadata,
            "link_count": len(content.links),
            "external_references": [{"text": l.text, "href": l.href} for l in external_links[:5]],
        }


async def main():
    topics = ["Artificial intelligence", "Neural network", "Large language model"]

    for topic in topics:
        print(f"\n{'='*60}")
        print(f"Researching: {topic}")
        print("=" * 60)

        result = await research(topic)
        print(f"Title: {result['title']}")
        print(f"Summary: {result['summary'][:200]}...")
        print(f"Total links: {result['link_count']}")
        print(f"External references:")
        for ref in result["external_references"]:
            print(f"  - {ref['text']}: {ref['href']}")


if __name__ == "__main__":
    asyncio.run(main())
