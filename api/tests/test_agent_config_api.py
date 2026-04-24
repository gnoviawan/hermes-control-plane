from pathlib import Path
from types import SimpleNamespace

import yaml
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_config(path: Path, payload: dict) -> None:
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding='utf-8')


def write_env(path: Path, payload: dict[str, str]) -> None:
    path.write_text('\n'.join(f'{key}={value}' for key, value in payload.items()) + '\n', encoding='utf-8')


def test_agent_config_endpoint_returns_redacted_effective_config(tmp_path, monkeypatch) -> None:
    from app.services import config_service as config_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(
        config_path,
        {
            'model': {'default': 'gpt-5.4', 'provider': 'custom'},
            'display': {'personality': 'creative'},
            'providers': {'custom': {'api_key': 'super-secret', 'base_url': 'https://example.com'}},
            'runtime': {'checkpoints_enabled': True, 'worktree_enabled': False},
            'fallback_providers': ['backup-a'],
        },
    )

    monkeypatch.setattr(config_service_module, 'ensure_profile_exists', lambda profile: SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.get('/api/agents/default/config')

    assert response.status_code == 200
    payload = response.json()
    assert payload['agent_id'] == 'default'
    assert payload['path'] == str(config_path)
    assert payload['effective_config']['providers']['custom']['api_key'] == '***redacted***'
    assert payload['effective_config']['display']['personality'] == 'creative'
    assert payload['runtime_toggles'] == {'checkpoints_enabled': True, 'worktree_enabled': False}
    assert 'providers' in payload['deferred_fields']
    assert 'fallback_providers' in payload['deferred_fields']


def test_agent_config_patch_updates_allowed_fields_only(tmp_path, monkeypatch) -> None:
    from app.services import config_service as config_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(
        config_path,
        {
            'model': {'default': 'gpt-5.4', 'provider': 'custom'},
            'display': {'personality': 'creative'},
            'providers': {'custom': {'api_key': 'super-secret', 'base_url': 'https://example.com'}},
            'runtime': {'checkpoints_enabled': True, 'worktree_enabled': False},
        },
    )

    monkeypatch.setattr(config_service_module, 'ensure_profile_exists', lambda profile: SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.patch(
        '/api/agents/default/config',
        json={
            'display': {'personality': 'focused'},
            'model': {'default': 'gpt-5.5', 'provider': 'custom'},
            'runtime': {'checkpoints_enabled': False, 'worktree_enabled': True},
            'providers': {'custom': {'api_key': 'should-not-overwrite'}},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['effective_config']['display']['personality'] == 'focused'
    assert payload['effective_config']['model']['default'] == 'gpt-5.5'
    assert payload['runtime_toggles'] == {'checkpoints_enabled': False, 'worktree_enabled': True}

    stored = yaml.safe_load(config_path.read_text(encoding='utf-8'))
    assert stored['display']['personality'] == 'focused'
    assert stored['model']['default'] == 'gpt-5.5'
    assert stored['runtime']['checkpoints_enabled'] is False
    assert stored['runtime']['worktree_enabled'] is True
    assert stored['providers']['custom']['api_key'] == 'super-secret'


def test_agent_config_reload_endpoint_returns_reload_status(tmp_path, monkeypatch) -> None:
    from app.services import config_service as config_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(config_path, {'display': {'personality': 'creative'}})

    monkeypatch.setattr(config_service_module, 'ensure_profile_exists', lambda profile: SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.post('/api/agents/default/config/reload')

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        'agent_id': 'default',
        'path': str(config_path),
        'reloaded': True,
        'message': 'Config reload requested',
    }


def test_agent_config_schema_endpoint_returns_grouped_field_metadata(tmp_path, monkeypatch) -> None:
    from app.services import config_service as config_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(
        config_path,
        {
            'model': {'default': 'gpt-5.4', 'provider': 'custom'},
            'display': {'personality': 'creative'},
            'providers': {'custom': {'api_key': 'super-secret'}},
            'runtime': {'checkpoints_enabled': True, 'worktree_enabled': False},
            'fallback_providers': ['backup-a'],
        },
    )

    monkeypatch.setattr(config_service_module, 'ensure_profile_exists', lambda profile: SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.get('/api/agents/default/config/schema')

    assert response.status_code == 200
    payload = response.json()
    assert payload['agent_id'] == 'default'
    assert payload['field_count'] >= 5
    assert payload['editable_count'] >= 5
    assert payload['deferred_count'] >= 2
    assert payload['forbidden_count'] == 0

    sections = {section['key']: section for section in payload['sections']}
    assert {'model', 'display', 'runtime'} <= sections.keys()

    model_fields = {field['key']: field for field in sections['model']['fields']}
    assert model_fields['model.default']['status'] == 'editable'
    assert model_fields['model.default']['type'] == 'string'
    assert model_fields['model.default']['value'] == 'gpt-5.4'
    assert model_fields['model.provider']['impact'] == 'new_session'

    runtime_fields = {field['key']: field for field in sections['runtime']['fields']}
    assert runtime_fields['runtime.checkpoints_enabled']['type'] == 'boolean'
    assert runtime_fields['runtime.checkpoints_enabled']['value'] is True

    deferred_fields = {field['key']: field for field in payload['deferred_fields']}
    assert deferred_fields['providers.custom.api_key']['status'] == 'deferred'
    assert deferred_fields['providers.custom.api_key']['sensitive'] is True
    assert deferred_fields['providers.custom.api_key']['value'] == '***redacted***'
    assert deferred_fields['fallback_providers']['value'] == ['backup-a']


def test_agent_config_validate_endpoint_reports_change_effects(tmp_path, monkeypatch) -> None:
    from app.services import config_service as config_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(
        config_path,
        {
            'model': {'default': 'gpt-5.4', 'provider': 'custom'},
            'display': {'personality': 'creative'},
            'runtime': {'checkpoints_enabled': True, 'worktree_enabled': False},
        },
    )

    monkeypatch.setattr(config_service_module, 'ensure_profile_exists', lambda profile: SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.post(
        '/api/agents/default/config/validate',
        json={
            'display': {'personality': 'focused'},
            'runtime': {'checkpoints_enabled': False},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        'agent_id': 'default',
        'valid': True,
        'errors': [],
        'warnings': [],
        'changed_keys': ['display.personality', 'runtime.checkpoints_enabled'],
        'requires_reload': True,
        'requires_restart': False,
        'requires_new_session': True,
    }


def test_agent_config_validate_endpoint_rejects_forbidden_fields(tmp_path, monkeypatch) -> None:
    from app.services import config_service as config_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(config_path, {'providers': {'custom': {'api_key': 'super-secret'}}})

    monkeypatch.setattr(config_service_module, 'ensure_profile_exists', lambda profile: SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.post(
        '/api/agents/default/config/validate',
        json={
            'providers': {'custom': {'api_key': 'attempted-overwrite'}},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['agent_id'] == 'default'
    assert payload['valid'] is False
    assert payload['changed_keys'] == []
    assert payload['requires_reload'] is False
    assert payload['requires_restart'] is False
    assert payload['requires_new_session'] is False
    assert payload['errors'] == ['providers.custom.api_key is not editable in config v1.']


def test_system_env_catalog_endpoint_returns_grouped_known_keys() -> None:
    response = client.get('/api/system/env/catalog')

    assert response.status_code == 200
    payload = response.json()
    assert payload['total_count'] >= 4
    categories = {category['key']: category for category in payload['categories']}
    assert {'providers', 'tool_apis', 'gateway_messaging', 'runtime'} <= categories.keys()

    provider_keys = {record['key']: record for record in categories['providers']['variables']}
    assert provider_keys['OPENAI_API_KEY']['sensitive'] is True
    assert provider_keys['OPENAI_API_KEY']['impact'] == 'restart'
    assert provider_keys['OPENAI_API_KEY']['docs_url']


def test_agent_env_endpoint_returns_masked_state(tmp_path, monkeypatch) -> None:
    from app.services import env_service as env_service_module

    env_path = tmp_path / '.env'
    write_env(
        env_path,
        {
            'OPENAI_API_KEY': 'sk-live-1234567890',
            'DISCORD_TOKEN': 'discord-secret-abcdef',
        },
    )

    monkeypatch.setattr(env_service_module, 'ensure_profile_exists', lambda profile: SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.get('/api/agents/default/env')

    assert response.status_code == 200
    payload = response.json()
    assert payload['agent_id'] == 'default'
    assert payload['path'] == str(env_path)
    records = {record['key']: record for record in payload['variables']}
    assert records['OPENAI_API_KEY']['is_set'] is True
    assert records['OPENAI_API_KEY']['redacted_preview'].startswith('***')
    assert records['DISCORD_TOKEN']['is_set'] is True
    assert records['DISCORD_TOKEN']['redacted_preview'].startswith('***')
    assert records['ANTHROPIC_API_KEY']['is_set'] is False
    assert records['ANTHROPIC_API_KEY']['redacted_preview'] is None


def test_agent_env_put_endpoint_sets_single_key(tmp_path, monkeypatch) -> None:
    from app.services import env_service as env_service_module

    env_path = tmp_path / '.env'
    write_env(env_path, {'OPENAI_API_KEY': 'old-secret'})

    monkeypatch.setattr(env_service_module, 'ensure_profile_exists', lambda profile: SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.put('/api/agents/default/env/ANTHROPIC_API_KEY', json={'value': 'new-anthropic-secret'})

    assert response.status_code == 200
    payload = response.json()
    assert payload['agent_id'] == 'default'
    assert payload['key'] == 'ANTHROPIC_API_KEY'
    assert payload['is_set'] is True
    assert payload['redacted_preview'].startswith('***')
    assert payload['message'] == 'Environment variable updated'
    env_contents = env_path.read_text(encoding='utf-8')
    assert 'ANTHROPIC_API_KEY=new-anthropic-secret' in env_contents


def test_agent_env_delete_endpoint_removes_single_key(tmp_path, monkeypatch) -> None:
    from app.services import env_service as env_service_module

    env_path = tmp_path / '.env'
    write_env(
        env_path,
        {
            'OPENAI_API_KEY': 'old-secret',
            'ANTHROPIC_API_KEY': 'delete-me',
        },
    )

    monkeypatch.setattr(env_service_module, 'ensure_profile_exists', lambda profile: SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.delete('/api/agents/default/env/ANTHROPIC_API_KEY')

    assert response.status_code == 200
    payload = response.json()
    assert payload['agent_id'] == 'default'
    assert payload['key'] == 'ANTHROPIC_API_KEY'
    assert payload['is_set'] is False
    assert payload['redacted_preview'] is None
    assert payload['message'] == 'Environment variable deleted'
    env_contents = env_path.read_text(encoding='utf-8')
    assert 'ANTHROPIC_API_KEY=delete-me' not in env_contents
    assert 'OPENAI_API_KEY=old-secret' in env_contents
