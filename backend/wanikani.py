import asyncio
import httpx
import logging
import os
import time

WANIKANI_BASE = "https://api.wanikani.com/v2"
API_KEY = os.getenv("WANIKANI_API_KEY", "")

log = logging.getLogger("wanikani")


class _TokenBucket:
    """Token bucket with a global backoff so one 429 pauses all requests."""
    def __init__(self, rate: float, capacity: int):
        self._rate = rate
        self._capacity = capacity
        self._tokens = float(capacity)
        self._last = time.monotonic()
        self._backoff_until = 0.0
        self._lock = asyncio.Lock()

    def notify_rate_limited(self, retry_after: int):
        """Drain the bucket and set a global cooldown. Call this on any 429."""
        deadline = time.monotonic() + retry_after
        if deadline > self._backoff_until:
            self._backoff_until = deadline
            self._tokens = 0
            log.warning("429 received — pausing all WaniKani requests for %ds", retry_after)

    async def acquire(self):
        async with self._lock:
            # Honour any global backoff set by a 429
            backoff_wait = self._backoff_until - time.monotonic()
            if backoff_wait > 0:
                log.info("Global backoff active, waiting %.1fs before next request", backoff_wait)
                await asyncio.sleep(backoff_wait)

            # Normal token-bucket throttle
            while True:
                now = time.monotonic()
                self._tokens = min(self._capacity, self._tokens + (now - self._last) * self._rate)
                self._last = now
                if self._tokens >= 1:
                    self._tokens -= 1
                    return
                wait = (1 - self._tokens) / self._rate
                log.debug("Bucket empty, waiting %.2fs", wait)
                await asyncio.sleep(wait)


# 55 req/min gives comfortable headroom under WaniKani's 60/min limit
_limiter = _TokenBucket(rate=55 / 60, capacity=55)


def get_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Wanikani-Revision": "20170710",
    }


async def _request_with_retry(client: httpx.AsyncClient, method: str, url: str, **kwargs) -> httpx.Response:
    """Throttle via token bucket, then make a request, retrying on 429 using the Retry-After header."""
    max_retries = 5
    for attempt in range(max_retries):
        await _limiter.acquire()
        short_url = url.replace(WANIKANI_BASE, "")
        params = kwargs.get("params") or {}
        log.info("→ %s %s %s", method, short_url, params or "")
        resp = await client.request(method, url, **kwargs)
        log.info("← %d %s", resp.status_code, short_url)

        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", "10"))
            log.warning("429 on %s (attempt %d/%d) — backing off %ds",
                        short_url, attempt + 1, max_retries, retry_after)
            _limiter.notify_rate_limited(retry_after)
            continue

        resp.raise_for_status()
        return resp

    # Final attempt — let it raise naturally
    await _limiter.acquire()
    resp = await client.request(method, url, **kwargs)
    log.info("← %d %s (final attempt)", resp.status_code, url.replace(WANIKANI_BASE, ""))
    resp.raise_for_status()
    return resp


async def get_all_pages(url: str, params: dict | None = None) -> list[dict]:
    """Fetch all pages of a paginated WaniKani collection."""
    results: list[dict] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        next_url: str | None = url
        req_params = params or {}
        first = True
        while next_url:
            resp = await _request_with_retry(
                client, "GET", next_url,
                headers=get_headers(),
                params=req_params if first else {},
            )
            data = resp.json()
            results.extend(data.get("data", []))
            next_url = data.get("pages", {}).get("next_url")
            first = False
    log.info("get_all_pages fetched %d items from %s", len(results), url.replace(WANIKANI_BASE, ""))
    return results


async def get_one(path: str, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await _request_with_retry(
            client, "GET", f"{WANIKANI_BASE}{path}",
            headers=get_headers(),
            params=params or {},
        )
        return resp.json()


async def post(path: str, body: dict) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await _request_with_retry(
            client, "POST", f"{WANIKANI_BASE}{path}",
            headers=get_headers(),
            json=body,
        )
        return resp.json()


async def put(path: str, body: dict) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await _request_with_retry(
            client, "PUT", f"{WANIKANI_BASE}{path}",
            headers=get_headers(),
            json=body,
        )
        return resp.json()
