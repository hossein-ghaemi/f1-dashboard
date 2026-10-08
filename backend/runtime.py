"""JSON normalization and bounded, process-local FastF1 session reuse."""
from collections import OrderedDict
from datetime import date, datetime, timedelta
import math
import threading
import time

import numpy as np
import pandas as pd


def json_safe(value):
    if value is None or value is pd.NA or value is pd.NaT:
        return None
    if isinstance(value, pd.DataFrame):
        return json_safe(value.to_dict(orient="records"))
    if isinstance(value, pd.Series):
        return json_safe(value.to_dict())
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, np.ndarray)):
        return [json_safe(v) for v in value]
    if isinstance(value, (timedelta, pd.Timedelta)):
        return value.total_seconds()
    if isinstance(value, (datetime, date, pd.Timestamp)):
        return value.isoformat()
    if isinstance(value, np.generic):
        return json_safe(value.item())
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


class SessionCache:
    """Serialize loads to bound memory pressure and deduplicate concurrent misses.

    Sessions are treated as read-only after load. TTL also refreshes incomplete
    sessions; each server process owns its own small cache.
    """
    def __init__(self, loader, max_entries=3, ttl_seconds=300):
        self.loader = loader
        self.max_entries = max(1, max_entries)
        self.ttl_seconds = max(1, ttl_seconds)
        self._entries = OrderedDict()
        self._lock = threading.Lock()
        self._load_lock = threading.Lock()

    def _cached(self, key):
        with self._lock:
            now = time.monotonic()
            for old_key, (created, _) in list(self._entries.items()):
                if now - created >= self.ttl_seconds:
                    del self._entries[old_key]
            if key in self._entries:
                self._entries.move_to_end(key)
                return self._entries[key][1]
        return None

    def get(self, year, round_number, identifier):
        key = (year, round_number, identifier.strip())
        session = self._cached(key)
        if session is not None:
            return session
        # Loading has a separate lock: warm reads never wait on a download.
        with self._load_lock:
            session = self._cached(key)
            if session is not None:
                return session
            with self._lock:
                while len(self._entries) >= self.max_entries:
                    self._entries.popitem(last=False)
            session = self.loader(*key)
            with self._lock:
                self._entries[key] = (time.monotonic(), session)
            return session
