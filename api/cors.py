"""Allowed browser origins for the HR API (FR6.2).

The backend stack sets ALLOWED_ORIGINS to the UI's CloudFront origin plus the local
Vite dev server. A wildcard is never returned, even if it is configured.
"""

import os
from collections.abc import Mapping

LOCAL_DEV_ORIGIN = "http://localhost:5173"
WILDCARD = "*"


def allowed_origins(env: Mapping[str, str] | None = None) -> list[str]:
    """Return the comma-separated ALLOWED_ORIGINS as a list, or only localhost when unset."""
    source = os.environ if env is None else env
    raw = source.get("ALLOWED_ORIGINS", "")
    origins: list[str] = []
    for item in raw.split(","):
        origin = item.strip().rstrip("/")
        if origin and origin != WILDCARD and origin not in origins:
            origins.append(origin)
    return origins or [LOCAL_DEV_ORIGIN]
