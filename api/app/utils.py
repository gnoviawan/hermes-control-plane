from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import yaml

_SECRET_KEYS = {"api_key", "token", "password", "secret", "authorization"}
_PROFILE_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


def validate_profile_name(name: str) -> bool:
    return bool(_PROFILE_NAME_RE.fullmatch(name or ""))


def load_yaml_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def load_json_file(path: Path) -> Any:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def redact_secrets(value: Any) -> Any:
    if isinstance(value, dict):
        redacted: dict[str, Any] = {}
        for key, item in value.items():
            if any(secret_key in key.lower() for secret_key in _SECRET_KEYS):
                redacted[key] = "***redacted***"
            else:
                redacted[key] = redact_secrets(item)
        return redacted
    if isinstance(value, list):
        return [redact_secrets(item) for item in value]
    return value


def summarize_config(config: dict[str, Any]) -> dict[str, Any]:
    safe = redact_secrets(config)
    model = safe.get("model") if isinstance(safe.get("model"), dict) else {}
    display = safe.get("display") if isinstance(safe.get("display"), dict) else {}
    agent = safe.get("agent") if isinstance(safe.get("agent"), dict) else {}
    providers = safe.get("providers") if isinstance(safe.get("providers"), dict) else {}
    return {
        "model": model,
        "display": display,
        "agent": agent,
        "provider_names": sorted(providers.keys()),
        "has_fallback_providers": bool(safe.get("fallback_providers")),
        "top_level_keys": sorted(safe.keys()),
    }


def tail_lines(path: Path, limit: int = 100) -> list[str]:
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    return lines[-limit:]


def parse_simple_table_row(line: str, expected_columns: int) -> list[str]:
    stripped = line.strip()
    if not stripped or set(stripped) <= {"-", "─", "┏", "┓", "┗", "┛", "┳", "┻", "┡", "┩", "━", "│", "└", "┌", "┴", "┬", "┼"}:
        return []
    if "│" in stripped:
        parts = [part.strip() for part in stripped.strip("│").split("│")]
        return parts if len(parts) >= expected_columns else []
    parts = re.split(r"\s{2,}", stripped)
    return parts if len(parts) >= expected_columns else []
