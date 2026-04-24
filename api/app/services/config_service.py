from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from app.models import (
    AgentConfigReloadResponse,
    AgentConfigResponse,
    AgentConfigSchemaResponse,
    ConfigFieldDescriptor,
    ConfigSectionDescriptor,
    RuntimeToggles,
)
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

SCHEMA_SECTIONS = [
    {
        'key': 'model',
        'label': 'Model',
        'fields': [
            {
                'key': 'model.default',
                'label': 'Default model',
                'description': 'Primary model used for new runs unless overridden.',
                'type': 'string',
                'status': 'editable',
                'impact': 'new_session',
            },
            {
                'key': 'model.provider',
                'label': 'Default provider',
                'description': 'Provider used for new runs unless overridden.',
                'type': 'string',
                'status': 'editable',
                'impact': 'new_session',
            },
        ],
    },
    {
        'key': 'display',
        'label': 'Display',
        'fields': [
            {
                'key': 'display.personality',
                'label': 'Personality',
                'description': 'Active personality preset for the profile.',
                'type': 'string',
                'status': 'editable',
                'impact': 'new_session',
            },
        ],
    },
    {
        'key': 'runtime',
        'label': 'Runtime',
        'fields': [
            {
                'key': 'runtime.checkpoints_enabled',
                'label': 'Checkpoints enabled',
                'description': 'Enable checkpoint creation during agent execution.',
                'type': 'boolean',
                'status': 'editable',
                'impact': 'reload',
            },
            {
                'key': 'runtime.worktree_enabled',
                'label': 'Worktree enabled',
                'description': 'Enable isolated git worktree behavior for execution.',
                'type': 'boolean',
                'status': 'editable',
                'impact': 'reload',
            },
        ],
    },
]

DEFERRED_SCHEMA_FIELDS = [
    {
        'key': 'providers.custom.api_key',
        'label': 'Provider API key',
        'description': 'Credential-bearing provider settings stay deferred in config schema v1.',
        'type': 'string',
        'status': 'deferred',
        'impact': 'restart',
        'sensitive': True,
    },
    {
        'key': 'fallback_providers',
        'label': 'Fallback providers',
        'description': 'Fallback chains remain read-only until a later config editor slice.',
        'type': 'list',
        'status': 'deferred',
        'impact': 'new_session',
    },
]


class ConfigService:
    def get_config(self, agent_id: str) -> AgentConfigResponse:
        context = ensure_profile_exists(agent_id)
        config_path = context.home / 'config.yaml'
        config = load_yaml_file(config_path)
        return self._response(agent_id, config_path, config)

    def get_schema(self, agent_id: str) -> AgentConfigSchemaResponse:
        context = ensure_profile_exists(agent_id)
        config_path = context.home / 'config.yaml'
        config = load_yaml_file(config_path)

        sections = [
            ConfigSectionDescriptor(
                key=section['key'],
                label=section['label'],
                fields=[self._field_descriptor(config, field) for field in section['fields']],
            )
            for section in SCHEMA_SECTIONS
        ]
        deferred_fields = [self._field_descriptor(config, field) for field in DEFERRED_SCHEMA_FIELDS]

        return AgentConfigSchemaResponse(
            agent_id=agent_id,
            path=str(config_path),
            sections=sections,
            deferred_fields=deferred_fields,
            field_count=sum(len(section.fields) for section in sections) + len(deferred_fields),
            editable_count=sum(1 for section in sections for field in section.fields if field.status == 'editable'),
            deferred_count=sum(1 for field in deferred_fields if field.status == 'deferred'),
            forbidden_count=sum(1 for section in sections for field in section.fields if field.status == 'forbidden')
            + sum(1 for field in deferred_fields if field.status == 'forbidden'),
        )

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

    def _field_descriptor(self, config: dict[str, Any], definition: dict[str, Any]) -> ConfigFieldDescriptor:
        value = self._get_path_value(config, definition['key'])
        if definition.get('sensitive') and value is not None:
            value = '***redacted***'
        return ConfigFieldDescriptor(
            key=definition['key'],
            label=definition['label'],
            description=definition['description'],
            type=definition['type'],
            status=definition['status'],
            impact=definition['impact'],
            value=value,
            sensitive=bool(definition.get('sensitive', False)),
            options=list(definition.get('options', [])),
        )

    def _get_path_value(self, config: dict[str, Any], dotted_key: str) -> Any:
        current: Any = config
        for part in dotted_key.split('.'):
            if not isinstance(current, dict) or part not in current:
                return None
            current = current[part]
        return current


config_service = ConfigService()
