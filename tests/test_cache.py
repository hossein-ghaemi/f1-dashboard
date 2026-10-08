from concurrent.futures import ThreadPoolExecutor
import threading

import pytest

from backend.runtime import SessionCache
import backend.runtime as runtime


def test_concurrent_requests_share_one_loaded_session():
    entered, release = threading.Event(), threading.Event()
    calls = []
    session = object()
    def load(*key):
        calls.append(key)
        entered.set()
        assert release.wait(3)
        return session
    cache = SessionCache(load)
    with ThreadPoolExecutor(max_workers=4) as pool:
        requests = [pool.submit(cache.get, 2024, 1, "Race") for _ in range(4)]
        assert entered.wait(3)
        release.set()
        assert all(f.result(timeout=3) is session for f in requests)
    assert calls == [(2024, 1, "Race")]


def test_failure_is_not_cached():
    calls = []
    def load(*key):
        calls.append(key)
        if len(calls) == 1:
            raise RuntimeError("temporary upstream failure")
        return "session"
    cache = SessionCache(load)
    with pytest.raises(RuntimeError):
        cache.get(2024, 1, "Race")
    assert cache.get(2024, 1, "Race") == "session"
    assert len(calls) == 2


def test_cache_bounds_and_expiry(monkeypatch):
    now = [0.0]
    monkeypatch.setattr(runtime.time, "monotonic", lambda: now[0])
    calls = []
    def load(*key):
        calls.append(key)
        return object()
    cache = SessionCache(load, max_entries=2, ttl_seconds=10)
    first = cache.get(2024, 1, "Race")
    cache.get(2024, 2, "Race")
    assert cache.get(2024, 1, "Race") is first
    cache.get(2024, 3, "Race")
    cache.get(2024, 2, "Race")  # Least recently used entry was evicted.
    assert len(calls) == 4
    now[0] = 11
    cache.get(2024, 2, "Race")
    assert len(calls) == 5
