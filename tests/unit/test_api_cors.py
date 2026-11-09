"""FR6.2: the API allows only the configured UI origins, never '*'."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "api"))

from cors import LOCAL_DEV_ORIGIN, allowed_origins  # noqa: E402


def test_two_configured_origins_are_returned_in_order():
    env = {"ALLOWED_ORIGINS": "https://d111111abcdef8.cloudfront.net, http://localhost:5173/"}

    assert allowed_origins(env) == [
        "https://d111111abcdef8.cloudfront.net",
        "http://localhost:5173",
    ]


def test_empty_env_allows_only_localhost():
    assert allowed_origins({}) == [LOCAL_DEV_ORIGIN]
    assert allowed_origins({"ALLOWED_ORIGINS": " , "}) == [LOCAL_DEV_ORIGIN]


def test_wildcard_is_never_returned():
    assert allowed_origins({"ALLOWED_ORIGINS": "*"}) == [LOCAL_DEV_ORIGIN]
    assert "*" not in allowed_origins({"ALLOWED_ORIGINS": "https://ui.example.test,*"})
