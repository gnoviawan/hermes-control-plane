from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from app.models import (
    AgentConfigReloadResponse,
    AgentConfigResponse,
    AgentConfigSchemaResponse,
    AgentConfigValidationResponse,
    ConfigFieldDescriptor,
    ConfigSectionDescriptor,
    RuntimeToggles,
)
from app.services.hermes_adapter import ensure_profile_exists
from app.utils import load_yaml_file, redact_secrets

EDITABLE_FIELDS = [
    'display.personality',
    'display.streaming',
    'display.show_reasoning',
    'display.inline_diffs',
    'model.default',
    'model.provider',
    'runtime.checkpoints_enabled',
    'runtime.worktree_enabled',
    'browser.allow_private_urls',
    'terminal.timeout',
    'approvals.mode',
    'memory.user_profile_enabled',
    'security.redact_secrets',
]
DEFERRED_FIELDS = ['providers', 'fallback_providers']
WRITE_RESTRICTIONS = [
    'Provider credentials and fallback chains remain read-only in Config v2.',
    'Credential-bearing provider settings stay deferred to the Env/API Keys surface.',
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
            {
                'key': 'display.streaming',
                'label': 'Streaming output',
                'description': 'Render streaming response output in the UI when supported.',
                'type': 'boolean',
                'status': 'editable',
                'impact': 'reload',
            },
            {
                'key': 'display.show_reasoning',
                'label': 'Show reasoning',
                'description': 'Expose reasoning traces when the runtime/config permits it.',
                'type': 'boolean',
                'status': 'editable',
                'impact': 'reload',
            },
            {
                'key': 'display.inline_diffs',
                'label': 'Inline diffs',
                'description': 'Display code and file diffs inline in the dashboard experience.',
                'type': 'boolean',
                'status': 'editable',
                'impact': 'reload',
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
    {
        'key': 'browser',
        'label': 'Browser',
        'fields': [
            {
                'key': 'browser.allow_private_urls',
                'label': 'Allow private URLs',
                'description': 'Permit browser tooling to access private-network URLs.',
                'type': 'boolean',
                'status': 'editable',
                'impact': 'restart',
            },
        ],
    },
    {
        'key': 'terminal',
        'label': 'Terminal',
        'fields': [
            {
                'key': 'terminal.timeout',
                'label': 'Terminal timeout',
                'description': 'Default timeout in seconds for terminal commands.',
                'type': 'number',
                'status': 'editable',
                'impact': 'restart',
            },
        ],
    },
    {
        'key': 'approvals',
        'label': 'Approvals',
        'fields': [
            {
                'key': 'approvals.mode',
                'label': 'Approval mode',
                'description': 'Control how dangerous actions are approved.',
                'type': 'string',
                'status': 'editable',
                'impact': 'restart',
                'options': ['manual', 'auto', 'yolo'],
            },
        ],
    },
    {
        'key': 'memory',
        'label': 'Memory',
        'fields': [
            {
                'key': 'memory.user_profile_enabled',
                'label': 'User profile memory',
                'description': 'Persist durable user profile facts across sessions.',
                'type': 'boolean',
                'status': 'editable',
                'impact': 'restart',
            },
        ],
    },
    {
        'key': 'security',
        'label': 'Security',
        'fields': [
            {
                'key': 'security.redact_secrets',
                'label': 'Redact secrets',
                'description': 'Mask secrets in UI payloads and logs.',
                'type': 'boolean',
                'status': 'editable',
                'impact': 'restart',
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

    def validate_config(self, agent_id: str, payload: dict[str, Any]) -> AgentConfigValidationResponse:
        ensure_profile_exists(agent_id)

        changed_keys = self._flatten_payload(payload)
        errors = [f'{key} is not editable in config v1.' for key in changed_keys if key not in EDITABLE_FIELDS]
        allowed_keys = [key for key in changed_keys if key in EDITABLE_FIELDS]
        impacts = [self._impact_for_key(key) for key in allowed_keys]

        return AgentConfigValidationResponse(
            agent_id=agent_id,
            valid=not errors,
            errors=errors,
            warnings=[],
            changed_keys=allowed_keys if not errors else [],
            requires_reload=not errors and any(impact == 'reload' for impact in impacts),
            requires_restart=not errors and any(impact == 'restart' for impact in impacts),
            requires_new_session=not errors and any(impact == 'new_session' for impact in impacts),
        )

    def patch_config(self, agent_id: str, payload: dict[str, Any]) -> AgentConfigResponse:
        context = ensure_profile_exists(agent_id)
        config_path = context.home / 'config.yaml'
        config = load_yaml_file(config_path)

        if isinstance(payload.get('display'), dict):
            config.setdefault('display', {})
            for key in ['personality', 'streaming', 'show_reasoning', 'inline_diffs']:
                if key in payload['display']:
                    value = payload['display'][key]
                    if key == 'personality':
                        config['display'][key] = value
                    else:
                        config['display'][key] = bool(value)

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

        if isinstance(payload.get('browser'), dict):
            config.setdefault('browser', {})
            if 'allow_private_urls' in payload['browser']:
                config['browser']['allow_private_urls'] = bool(payload['browser']['allow_private_urls'])

        if isinstance(payload.get('terminal'), dict):
            config.setdefault('terminal', {})
            if payload['terminal'].get('timeout') is not None:
                config['terminal']['timeout'] = int(payload['terminal']['timeout'])

        if isinstance(payload.get('approvals'), dict):
            config.setdefault('approvals', {})
            if payload['approvals'].get('mode') is not None:
                config['approvals']['mode'] = payload['approvals']['mode']

        if isinstance(payload.get('memory'), dict):
            config.setdefault('memory', {})
            if 'user_profile_enabled' in payload['memory']:
                config['memory']['user_profile_enabled'] = bool(payload['memory']['user_profile_enabled'])

        if isinstance(payload.get('security'), dict):
            config.setdefault('security', {})
            if 'redact_secrets' in payload['security']:
                config['security']['redact_secrets'] = bool(payload['security']['redact_secrets'])

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

    def _flatten_payload(self, payload: dict[str, Any], prefix: str = '') -> list[str]:
        changed_keys: list[str] = []
        for key, value in payload.items():
            dotted = f'{prefix}.{key}' if prefix else key
            if isinstance(value, dict):
                changed_keys.extend(self._flatten_payload(value, dotted))
            else:
                changed_keys.append(dotted)
        return changed_keys

    def _impact_for_key(self, key: str) -> str:
        for section in SCHEMA_SECTIONS:
            for field in section['fields']:
                if field['key'] == key:
                    return field['impact']
        for field in DEFERRED_SCHEMA_FIELDS:
            if field['key'] == key:
                return field['impact']
        return 'new_session'


config_service = ConfigService()
