import base64
import binascii
import json
from collections.abc import Mapping
from typing import Any

DEFAULT_ACTOR_ID = "default"


def _authorization_value(headers: Mapping[str, str] | None) -> str | None:
    """Return the Authorization header value, matching the header name case-insensitively."""
    if not headers:
        return None
    for name, value in headers.items():
        if isinstance(name, str) and name.lower() == "authorization" and isinstance(value, str):
            return value.strip() or None
    return None


def actor_id_from_headers(headers: Mapping[str, str] | None) -> str | None:
    """Read the caller's `sub` from the JWT in the Authorization header (FR6.3).

    AgentCore's Cognito authorizer has already validated the token's signature,
    issuer and client before the request reaches the container, so the payload is
    only decoded here. Returns None when no token is present; raises ValueError
    when a token is present but cannot be read, so callers never fall back to a
    shared actor id for an authenticated request.
    """
    value = _authorization_value(headers)
    if value is None:
        return None
    token = value[7:].strip() if value.lower().startswith("bearer ") else value
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Authorization header does not hold a JWT")
    encoded = parts[1] + "=" * (-len(parts[1]) % 4)
    try:
        claims = json.loads(base64.urlsafe_b64decode(encoded))
    except (binascii.Error, ValueError) as error:
        raise ValueError("JWT payload is not readable") from error
    sub = claims.get("sub") if isinstance(claims, dict) else None
    if not isinstance(sub, str) or not sub:
        raise ValueError("JWT has no sub claim")
    return sub


def _strip_trailing_tool_use(messages: Any) -> list[dict]:
    """Strip toolUse blocks from the tail until the last message has none."""
    if not isinstance(messages, list):
        raise ValueError("messages must be a list")

    messages = list(messages)
    while messages:
        last = messages[-1]
        if not isinstance(last, dict):
            raise ValueError("each message must be an object")
        original_content = last.get("content", [])
        if not isinstance(original_content, list) or not all(isinstance(block, dict) for block in original_content):
            raise ValueError("each message content value must be a list of content blocks")

        content = [block for block in original_content if "toolUse" not in block]
        if len(content) == len(original_content):
            break
        if content:
            messages[-1] = {**last, "content": content}
            break
        messages.pop()

    return messages

def parse_payload(payload: dict, headers: Mapping[str, str] | None = None):
    """Accept a caller-supplied message history or a plain prompt string.

    The actor id comes from the validated JWT's `sub` (FR6.3); any `actorId` in the
    body is ignored. Without a token (local `agentcore dev`) it is DEFAULT_ACTOR_ID.
    """
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")
    actor_id = actor_id_from_headers(headers) or DEFAULT_ACTOR_ID
    if "messages" in payload:
        return _strip_trailing_tool_use(payload["messages"]), actor_id
    prompt = payload.get("prompt", "")
    if not isinstance(prompt, str):
        raise ValueError("prompt must be a string")
    return prompt, actor_id
