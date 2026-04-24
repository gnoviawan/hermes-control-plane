from types import SimpleNamespace

import yaml
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_yaml(path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding='utf-8')


def write_json(path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(__import__('json').dumps(payload, indent=2), encoding='utf-8')


def test_system_gateway_contracts_expose_summary_platforms_and_lifecycle(tmp_path, monkeypatch) -> None:
    from app.services import gateway_service as gateway_service_module

    write_yaml(
        tmp_path / 'config.yaml',
        {
            'gateway': {
                'enabled': True,
                'default_platform': 'discord',
                'platforms': {
                    'discord': {
                        'enabled': True,
                        'channels': ['1496901287827214508', '1468181721357877248'],
                        'token': 'super-secret',
                    },
                    'telegram': {
                        'enabled': False,
                        'channels': ['-1001234567890'],
                    },
                },
            },
        },
    )
    write_json(tmp_path / 'gateway_state.json', {'status': 'running'})

    monkeypatch.setattr(gateway_service_module.gateway_service, '_config_path', lambda: tmp_path / 'config.yaml')
    monkeypatch.setattr(gateway_service_module.gateway_service, '_state_path', lambda: tmp_path / 'gateway_state.json')

    summary_response = client.get('/api/system/gateway')
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary['enabled'] is True
    assert summary['status'] == 'running'
    assert summary['default_platform'] == 'discord'
    assert summary['platform_count'] == 2
    assert summary['channel_count'] == 3
    assert summary['platforms'][0]['name'] == 'discord'
    assert summary['platforms'][0]['channel_count'] == 2
    assert summary['platforms'][0]['config']['token'] == '***redacted***'

    platforms_response = client.get('/api/system/gateway/platforms')
    assert platforms_response.status_code == 200
    platforms = platforms_response.json()
    assert platforms['total'] == 2
    assert {item['name'] for item in platforms['platforms']} == {'discord', 'telegram'}

    start_response = client.post('/api/system/gateway/start')
    assert start_response.status_code == 200
    assert start_response.json()['status'] == 'running'

    stop_response = client.post('/api/system/gateway/stop')
    assert stop_response.status_code == 200
    assert stop_response.json()['status'] == 'stopped'


def test_system_gateway_patch_updates_gateway_config(tmp_path, monkeypatch) -> None:
    from app.services import gateway_service as gateway_service_module

    write_yaml(
        tmp_path / 'config.yaml',
        {
            'gateway': {
                'enabled': False,
                'default_platform': 'telegram',
                'platforms': {
                    'telegram': {'enabled': True, 'channels': ['-1001234567890']},
                },
            },
        },
    )

    monkeypatch.setattr(gateway_service_module.gateway_service, '_config_path', lambda: tmp_path / 'config.yaml')
    monkeypatch.setattr(gateway_service_module.gateway_service, '_state_path', lambda: tmp_path / 'gateway_state.json')

    response = client.patch(
        '/api/system/gateway',
        json={
            'enabled': True,
            'default_platform': 'discord',
            'platforms': {
                'discord': {'enabled': True, 'channels': ['1496901287827214508']},
                'telegram': {'enabled': False, 'channels': ['-1001234567890']},
            },
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['enabled'] is True
    assert payload['default_platform'] == 'discord'
    assert payload['platform_count'] == 2
    assert payload['channel_count'] == 2

    written = yaml.safe_load((tmp_path / 'config.yaml').read_text(encoding='utf-8'))
    assert written['gateway']['enabled'] is True
    assert written['gateway']['default_platform'] == 'discord'
    assert written['gateway']['platforms']['telegram']['enabled'] is False
