from types import SimpleNamespace

import yaml
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_config(path, payload: dict) -> None:
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding='utf-8')


def test_agent_security_and_approvals_expose_scoped_redacted_state(tmp_path, monkeypatch) -> None:
    from app.services import security_service as security_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(
        config_path,
        {
            'security': {
                'approval_policy': 'strict',
                'allow_yolo': False,
                'dangerous_commands': ['rm -rf', 'sudo'],
                'allowlists': {
                    'commands': ['git status'],
                    'paths': ['/tmp/hermes-safe'],
                    'secrets': {'api_key': 'should-not-leak'},
                },
            }
        },
    )

    monkeypatch.setattr(security_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    security_service_module.security_service.set_pending_approvals(
        'default',
        [
            {
                'id': 'approval-1',
                'run_id': 'run-1',
                'session_id': 'session-1',
                'command_or_action': 'rm -rf /tmp/test',
                'severity': 'high',
                'reason': 'Dangerous command',
                'expires_at': '2026-04-24T02:00:00Z',
                'state': 'pending',
            }
        ],
    )

    approvals_response = client.get('/api/agents/default/approvals')
    assert approvals_response.status_code == 200
    approvals_payload = approvals_response.json()
    assert approvals_payload['agent_id'] == 'default'
    assert approvals_payload['total'] == 1
    assert approvals_payload['approvals'][0]['run_id'] == 'run-1'
    assert approvals_payload['approvals'][0]['session_id'] == 'session-1'

    security_response = client.get('/api/agents/default/security')
    assert security_response.status_code == 200
    security_payload = security_response.json()
    assert security_payload['agent_id'] == 'default'
    assert security_payload['approval_policy'] == 'strict'
    assert security_payload['allow_yolo'] is False
    assert security_payload['dangerous_commands'] == ['rm -rf', 'sudo']
    assert security_payload['allowlists']['secrets']['api_key'] == '***redacted***'


def test_agent_security_patch_updates_policy_and_allowlists(tmp_path, monkeypatch) -> None:
    from app.services import security_service as security_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(config_path, {'security': {'approval_policy': 'strict', 'allow_yolo': False, 'allowlists': {'commands': ['git status']}}})

    monkeypatch.setattr(security_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.patch(
        '/api/agents/default/security',
        json={
            'approval_policy': 'on-request',
            'allow_yolo': True,
            'allowlists': {'commands': ['git status', 'git diff'], 'paths': ['/tmp/hermes-safe']},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['approval_policy'] == 'on-request'
    assert payload['allow_yolo'] is True
    assert payload['allowlists']['commands'] == ['git status', 'git diff']

    stored = yaml.safe_load(config_path.read_text(encoding='utf-8'))
    assert stored['security']['approval_policy'] == 'on-request'
    assert stored['security']['allow_yolo'] is True
    assert stored['security']['allowlists']['paths'] == ['/tmp/hermes-safe']


def test_system_security_and_allowlists_aggregate_profiles(tmp_path, monkeypatch) -> None:
    from app.services import security_service as security_service_module

    default_home = tmp_path / 'default-home'
    default_home.mkdir()
    write_config(default_home / 'config.yaml', {'security': {'approval_policy': 'strict', 'allowlists': {'commands': ['git status']}}})

    ops_home = tmp_path / 'ops-home'
    ops_home.mkdir()
    write_config(ops_home / 'config.yaml', {'security': {'approval_policy': 'on-request', 'allowlists': {'commands': ['git diff'], 'paths': ['/tmp/hermes-safe']}}})

    def fake_profile_contexts():
        return [SimpleNamespace(profile='default', home=default_home), SimpleNamespace(profile='ops', home=ops_home)]

    monkeypatch.setattr(security_service_module, 'profile_contexts', fake_profile_contexts)

    security_response = client.get('/api/system/security')
    assert security_response.status_code == 200
    security_payload = security_response.json()
    assert security_payload['profiles'] == ['default', 'ops']
    assert security_payload['approval_policies'] == ['on-request', 'strict']

    allowlists_response = client.get('/api/system/allowlists')
    assert allowlists_response.status_code == 200
    allowlists_payload = allowlists_response.json()
    assert allowlists_payload['commands'] == ['git diff', 'git status']
    assert allowlists_payload['paths'] == ['/tmp/hermes-safe']
