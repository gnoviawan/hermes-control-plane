from pathlib import Path
from types import SimpleNamespace

import yaml
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_config(path: Path, payload: dict) -> None:
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding='utf-8')


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
