from types import SimpleNamespace

import yaml
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_config(path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding='utf-8')


def test_agent_mcp_servers_and_tools_expose_stable_contracts(tmp_path, monkeypatch) -> None:
    from app.services import mcp_service as mcp_service_module

    write_config(
        tmp_path / 'config.yaml',
        {
            'mcp_servers': {
                'mempalace': {
                    'command': '/usr/bin/python3',
                    'args': ['-m', 'mempalace.server'],
                    'env': {'MEMPALACE_TOKEN': 'secret'},
                    'sampling': {'enabled': False},
                },
                'notion': {
                    'url': 'https://mcp.example.com/notion',
                    'headers': {'Authorization': 'Bearer token'},
                },
            }
        },
    )

    monkeypatch.setattr(mcp_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path, profile=profile))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    servers_response = client.get('/api/agents/default/mcp/servers')
    assert servers_response.status_code == 200
    payload = servers_response.json()
    assert payload['agent_id'] == 'default'
    assert payload['total'] == 2
    assert [item['id'] for item in payload['servers']] == ['mempalace', 'notion']
    assert payload['servers'][0]['transport'] == 'stdio'
    assert payload['servers'][0]['connection_state'] == 'configured'
    assert payload['servers'][0]['auth_state'] == 'configured'
    assert payload['servers'][0]['discovered_tools_count'] == 1
    assert payload['servers'][0]['sampling_enabled'] is False
    assert payload['servers'][1]['transport'] == 'http'

    tools_response = client.get('/api/agents/default/mcp/tools')
    assert tools_response.status_code == 200
    tools_payload = tools_response.json()
    assert tools_payload['agent_id'] == 'default'
    assert tools_payload['total'] == 2
    first_tool = tools_payload['tools'][0]
    assert first_tool['name'] == 'mcp__mempalace'
    assert first_tool['source_type'] == 'mcp'
    assert first_tool['source_id'] == 'mempalace'
    assert first_tool['availability_reason'] == 'MCP server configured'


def test_agent_mcp_actions_update_server_state(tmp_path, monkeypatch) -> None:
    from app.services import mcp_service as mcp_service_module

    write_config(tmp_path / 'config.yaml', {'mcp_servers': {'mempalace': {'command': '/usr/bin/python3'}}})

    monkeypatch.setattr(mcp_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path, profile=profile))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    connect_response = client.post('/api/agents/default/mcp/mempalace/connect')
    assert connect_response.status_code == 200
    assert connect_response.json()['connection_state'] == 'connected'

    disconnect_response = client.post('/api/agents/default/mcp/mempalace/disconnect')
    assert disconnect_response.status_code == 200
    assert disconnect_response.json()['connection_state'] == 'disconnected'

    reload_response = client.post('/api/agents/default/mcp/reload')
    assert reload_response.status_code == 200
    reload_payload = reload_response.json()
    assert reload_payload['agent_id'] == 'default'
    assert reload_payload['reloaded'] is True
    assert reload_payload['server_count'] == 1


def test_system_mcp_registry_aggregates_profiles(tmp_path, monkeypatch) -> None:
    from app.services import mcp_service as mcp_service_module

    default_home = tmp_path / 'default'
    ops_home = tmp_path / 'ops'
    write_config(default_home / 'config.yaml', {'mcp_servers': {'mempalace': {'command': '/usr/bin/python3'}}})
    write_config(ops_home / 'config.yaml', {'mcp_servers': {'notion': {'url': 'https://mcp.example.com/notion'}}})

    monkeypatch.setattr(mcp_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=default_home if profile == 'default' else ops_home, profile=profile))
    monkeypatch.setattr(mcp_service_module, 'profile_contexts', lambda: [SimpleNamespace(home=default_home, profile='default'), SimpleNamespace(home=ops_home, profile='ops')])

    response = client.get('/api/system/mcp/servers')
    assert response.status_code == 200
    payload = response.json()
    assert payload['total'] == 2
    by_id = {item['id']: item for item in payload['servers']}
    assert by_id['mempalace']['profiles'] == ['default']
    assert by_id['notion']['profiles'] == ['ops']
