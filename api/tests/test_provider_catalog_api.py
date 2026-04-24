from pathlib import Path
from types import SimpleNamespace

import yaml
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_config(path: Path, payload: dict) -> None:
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding='utf-8')


def test_system_providers_and_models_expose_redacted_catalog(tmp_path, monkeypatch) -> None:
    from app.services import provider_service as provider_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(
        config_path,
        {
            'model': {'default': 'gpt-5.4', 'provider': 'custom'},
            'providers': {
                'custom': {'api_key': 'super-secret', 'base_url': 'https://providers.example/v1'},
                'backup': {'api_key': 'backup-secret', 'base_url': 'https://backup.example/v1'},
            },
            'fallback_providers': ['backup'],
            'models': {
                'custom': ['gpt-5-mini'],
                'backup': ['glm-5.1'],
            },
        },
    )

    monkeypatch.setattr(provider_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))

    providers_response = client.get('/api/system/providers')
    assert providers_response.status_code == 200
    providers_payload = providers_response.json()
    assert providers_payload['total'] == 2
    assert providers_payload['providers'][0]['name'] == 'backup'
    assert providers_payload['providers'][0]['config']['api_key'] == '***redacted***'

    models_response = client.get('/api/system/models')
    assert models_response.status_code == 200
    models_payload = models_response.json()
    assert models_payload['default_model'] == 'gpt-5.4'
    assert models_payload['default_provider'] == 'custom'
    assert {'provider': 'custom', 'id': 'gpt-5.4', 'source': 'config'} in models_payload['models']
    assert models_payload['models'][0]['provider'] == 'backup'
    assert models_payload['models'][0]['id'] == 'glm-5.1'


def test_provider_routing_endpoint_returns_default_and_fallbacks(tmp_path, monkeypatch) -> None:
    from app.services import provider_service as provider_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(
        config_path,
        {
            'model': {'default': 'gpt-5.4', 'provider': 'custom'},
            'providers': {'custom': {'api_key': 'super-secret'}},
            'fallback_providers': ['backup-a', 'backup-b'],
        },
    )

    monkeypatch.setattr(provider_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))

    response = client.get('/api/system/provider-routing')

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        'default_provider': 'custom',
        'default_model': 'gpt-5.4',
        'fallback_providers': ['backup-a', 'backup-b'],
        'effective_provider_count': 3,
        'write_restrictions': ['Provider credentials remain redacted in provider routing views.'],
    }


def test_provider_routing_patch_updates_default_provider_model_and_fallbacks(tmp_path, monkeypatch) -> None:
    from app.services import provider_service as provider_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(
        config_path,
        {
            'model': {'default': 'gpt-5.4', 'provider': 'custom'},
            'providers': {'custom': {'api_key': 'super-secret'}, 'backup': {'api_key': 'backup-secret'}},
            'fallback_providers': ['backup'],
        },
    )

    monkeypatch.setattr(provider_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))

    response = client.patch(
        '/api/system/provider-routing',
        json={
            'default_provider': 'backup',
            'default_model': 'glm-5.1',
            'fallback_providers': ['custom'],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['default_provider'] == 'backup'
    assert payload['default_model'] == 'glm-5.1'
    assert payload['fallback_providers'] == ['custom']
    assert payload['effective_provider_count'] == 2

    stored = yaml.safe_load(config_path.read_text(encoding='utf-8'))
    assert stored['model']['provider'] == 'backup'
    assert stored['model']['default'] == 'glm-5.1'
    assert stored['fallback_providers'] == ['custom']
    assert stored['providers']['custom']['api_key'] == 'super-secret'


def test_provider_routing_patch_recovers_from_non_dict_model_shape(tmp_path, monkeypatch) -> None:
    from app.services import provider_service as provider_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(
        config_path,
        {
            'model': 'broken',
            'providers': {'custom': {'api_key': 'super-secret'}},
            'fallback_providers': ['backup'],
        },
    )

    monkeypatch.setattr(provider_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))

    response = client.patch(
        '/api/system/provider-routing',
        json={
            'default_provider': 'custom',
            'default_model': 'gpt-5.4',
            'fallback_providers': ['backup'],
        },
    )

    assert response.status_code == 200
    stored = yaml.safe_load(config_path.read_text(encoding='utf-8'))
    assert stored['model'] == {'provider': 'custom', 'default': 'gpt-5.4'}
