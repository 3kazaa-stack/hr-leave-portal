"""FR6.3: the hrAgent takes the actor id from the validated JWT's sub, not the body."""

import base64
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "hrAgent" / "app" / "agent"))

from parse import DEFAULT_ACTOR_ID, actor_id_from_headers, parse_payload  # noqa: E402


def _b64url(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()


def _jwt(claims: dict) -> str:
    return f"{_b64url({'alg': 'RS256', 'kid': 'test'})}.{_b64url(claims)}.signature"


def test_jwt_sub_wins_over_body_actor_id():
    headers = {"Authorization": f"Bearer {_jwt({'sub': 'user-x', 'client_id': 'c1'})}"}

    prompt, actor_id = parse_payload({"prompt": "List employees", "actorId": "user-y"}, headers)

    assert prompt == "List employees"
    assert actor_id == "user-x"


def test_header_name_is_matched_case_insensitively():
    headers = {"authorization": f"Bearer {_jwt({'sub': 'user-z'})}"}

    assert actor_id_from_headers(headers) == "user-z"


def test_missing_header_gives_default_actor():
    _, actor_id = parse_payload({"prompt": "Hi", "actorId": "user-y"}, {})

    assert actor_id == DEFAULT_ACTOR_ID == "default"


def test_unreadable_token_is_rejected_instead_of_shared():
    with pytest.raises(ValueError):
        parse_payload({"prompt": "Hi"}, {"Authorization": "Bearer not-a-jwt"})
