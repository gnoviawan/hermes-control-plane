from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
from typing import Any

import os
import yaml
from fastapi import HTTPException

from app.models import (
    AgentSecurityPatchRequest,
    AgentSecurityResponse,
    ApprovalQueueResponse,
    ApprovalRequest,
    SystemAllowlistsResponse,
    SystemSecurityResponse,
)
from app.services.hermes_adapter import ensure_profile_exists, profile_contexts
from app.utils import load_yaml_file, redact_secrets

_ALLOWLIST_SECRET_CONTAINER_KEYS = {'secrets', 'credentials', 'tokens'}

_WRITE_LOCK = RLock()
_PENDING_LOCK = RLock()
_WRITE_RESTRICTIONS = [
    'Secrets remain redacted in security surfaces.',
    'Approval queue entries are read-only from the dashboard in v1.',
]


class SecurityService:
    def __init__(self) -> None:
        self._pending: dict[str, list[dict[str, Any]]] = {}

    def set_pending_approvals(self, agent_id: str, approvals: list[dict[str, Any]]) -> None:
        with _PENDING_LOCK:
            self._pending[agent_id] = approvals

    def list_approvals(self, agent_id: str) -> ApprovalQueueResponse:
        ensure_profile_exists(agent_id)
        with _PENDING_LOCK:
            raw_items = list(self._pending.get(agent_id, []))
        items = [
            ApprovalRequest(
                id=item['id'],
                agent_id=agent_id,
                run_id=item.get('run_id'),
                session_id=item.get('session_id'),
                command_or_action=item.get('command_or_action', ''),
                severity=item.get('severity', 'unknown'),
                reason=item.get('reason'),
                created_at=item.get('created_at') or self._now_iso(),
                expires_at=item.get('expires_at'),
                state=item.get('state', 'pending'),
            )
            for item in raw_items
        ]
        return ApprovalQueueResponse(agent_id=agent_id, approvals=items, total=len(items))

    def get_agent_security(self, agent_id: str) -> AgentSecurityResponse:
        context = ensure_profile_exists(agent_id)
        return self._agent_security_from_path(agent_id, context.home / 'config.yaml')

    def patch_agent_security(self, agent_id: str, payload: AgentSecurityPatchRequest) -> AgentSecurityResponse:
        context = ensure_profile_exists(agent_id)
        config_path = context.home / 'config.yaml'
        with _WRITE_LOCK:
            config = self._load_writable_config(config_path)
            security = config.get('security') if isinstance(config.get('security'), dict) else {}
            config['security'] = dict(security)
            if payload.approval_policy is not None:
                config['security']['approval_policy'] = payload.approval_policy
            if payload.allow_yolo is not None:
                config['security']['allow_yolo'] = payload.allow_yolo
            if payload.dangerous_commands is not None:
                config['security']['dangerous_commands'] = payload.dangerous_commands
            if payload.allowlists is not None:
                config['security']['allowlists'] = payload.allowlists
            self._atomic_write_yaml(config_path, config)
        return self.get_agent_security(agent_id)

    def get_system_security(self) -> SystemSecurityResponse:
        profiles: list[str] = []
        approval_policies: set[str] = set()
        yolo_profiles: list[str] = []
        for context in profile_contexts():
            profiles.append(context.profile)
            config = load_yaml_file(context.home / 'config.yaml')
            security = config.get('security') if isinstance(config.get('security'), dict) else {}
            policy = security.get('approval_policy')
            if policy:
                approval_policies.add(str(policy))
            if bool(security.get('allow_yolo')):
                yolo_profiles.append(context.profile)
        return SystemSecurityResponse(
            profiles=sorted(profiles),
            approval_policies=sorted(approval_policies),
            yolo_enabled_profiles=sorted(yolo_profiles),
            write_restrictions=_WRITE_RESTRICTIONS,
        )

    def get_system_allowlists(self) -> SystemAllowlistsResponse:
        commands: set[str] = set()
        paths: set[str] = set()
        hosts: set[str] = set()
        profiles: list[str] = []
        for context in profile_contexts():
            profiles.append(context.profile)
            config = load_yaml_file(context.home / 'config.yaml')
            security = config.get('security') if isinstance(config.get('security'), dict) else {}
            allowlists = security.get('allowlists') if isinstance(security.get('allowlists'), dict) else {}
            commands.update(str(item) for item in allowlists.get('commands', []) if item)
            paths.update(str(item) for item in allowlists.get('paths', []) if item)
            hosts.update(str(item) for item in allowlists.get('hosts', []) if item)
        return SystemAllowlistsResponse(
            commands=sorted(commands),
            paths=sorted(paths),
            hosts=sorted(hosts),
            profiles=sorted(profiles),
        )

    def _agent_security_from_path(self, agent_id: str, path: Path) -> AgentSecurityResponse:
        config = load_yaml_file(path)
        security = config.get('security') if isinstance(config.get('security'), dict) else {}
        allowlists = security.get('allowlists') if isinstance(security.get('allowlists'), dict) else {}
        dangerous_commands = security.get('dangerous_commands') if isinstance(security.get('dangerous_commands'), list) else []
        return AgentSecurityResponse(
            agent_id=agent_id,
            approval_policy=str(security.get('approval_policy') or 'on-request'),
            allow_yolo=bool(security.get('allow_yolo')),
            dangerous_commands=[str(item) for item in dangerous_commands],
            allowlists=self._redact_allowlists(allowlists),
            write_restrictions=_WRITE_RESTRICTIONS,
        )

    def _redact_allowlists(self, value: Any) -> Any:
        if isinstance(value, dict):
            redacted: dict[str, Any] = {}
            for key, item in value.items():
                if key.lower() in _ALLOWLIST_SECRET_CONTAINER_KEYS and isinstance(item, dict):
                    redacted[key] = {nested_key: '***redacted***' for nested_key in item.keys()}
                else:
                    redacted[key] = redact_secrets(item)
            return redacted
        return redact_secrets(value)

    def _load_writable_config(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            return {}
        try:
            raw = yaml.safe_load(path.read_text(encoding='utf-8'))
        except (OSError, yaml.YAMLError) as exc:
            raise HTTPException(status_code=409, detail='Cannot update security because config.yaml is unreadable or malformed.') from exc
        if raw is None:
            return {}
        if not isinstance(raw, dict):
            raise HTTPException(status_code=409, detail='Cannot update security because config.yaml is unreadable or malformed.')
        return raw

    def _atomic_write_yaml(self, path: Path, payload: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path: Path | None = None
        try:
            with NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False) as handle:
                yaml.safe_dump(payload, handle, sort_keys=False)
                handle.flush()
                os.fsync(handle.fileno())
                temp_path = Path(handle.name)
            temp_path.replace(path)
        finally:
            if temp_path is not None and temp_path.exists():
                temp_path.unlink(missing_ok=True)

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


security_service = SecurityService()
