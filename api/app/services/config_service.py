from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from app.models import AgentConfigReloadResponse, AgentConfigResponse, RuntimeToggles
from app.services.hermes_adapter import ensure_profile_exists
from app.utils import load_yaml_file, redact_secrets

EDITABLE_FIELDS = [
    'display.personality',
    'model.default',
    'model.provider',
    'runtime.checkpoints_enabled',
    'runtime.worktree_enabled',
]
DEFERRED_FIELDS = ['providers', 'fallback_providers']
WRITE_RESTRICTIONS = [
    'Provider credentials and fallback chains remain read-only in Config v1.',
    'Only display.personality, model.default/provider, and runtime toggles are writable in this slice.',
]


class ConfigService:
    def get_config(self, agent_id: str) -> AgentConfigResponse:
        context = ensure_profile_exists(agent_id)
        config_path = context.home / 'config.yaml'
        config = load_yaml_file(config_path)
        return self._response(agent_id, config_path, config)

    def patch_config(self, agent_id: str, payload: dict[str, Any]) -> AgentConfigResponse:
        context = ensure_profile_exists(agent_id)
        config_path = context.home / 'config.yaml'
        config = load_yaml_file(config_path)

        if isinstance(payload.get('display'), dict):
            config.setdefault('display', {})
            personality = payload['display'].get('personality')
            if personality is not None:
                config['display']['personality'] = personality

        if isinstance(payload.get('model'), dict):
            config.setdefault('model', {})
            for key in ['default', 'provider']:
                if payload['model'].get(key) is not None:
                    config['model'][key] = payload['model'][key]

        if isinstance(payload.get('runtime'), dict):
            config.setdefault('runtime', {})
            for key in ['checkpoints_enabled', 'worktree_enabled']:
                if key in payload['runtime']:
                    config['runtime'][key] = bool(payload['runtime'][key])

        config_path.write_text(yaml.safe_dump(config, sort_keys=False), encoding='utf-8')
        return self._response(agent_id, config_path, config)

    def reload_config(self, agent_id: str) -> AgentConfigReloadResponse:
        context = ensure_profile_exists(agent_id)
        config_path = context.home / 'config.yaml'
        return AgentConfigReloadResponse(
            agent_id=agent_id,
            path=str(config_path),
            reloaded=True,
            message='Config reload requested',
        )

    def _response(self, agent_id: str, config_path: Path, config: dict[str, Any]) -> AgentConfigResponse:
        runtime = config.get('runtime') if isinstance(config.get('runtime'), dict) else {}
        return AgentConfigResponse(
            agent_id=agent_id,
            path=str(config_path),
            effective_config=redact_secrets(config),
            profile_overrides=redact_secrets(config),
            runtime_toggles=RuntimeToggles(
                checkpoints_enabled=bool(runtime.get('checkpoints_enabled', False)),
                worktree_enabled=bool(runtime.get('worktree_enabled', False)),
            ),
            editable_fields=EDITABLE_FIELDS,
            deferred_fields=DEFERRED_FIELDS,
            write_restrictions=WRITE_RESTRICTIONS,
        )


config_service = ConfigService()
