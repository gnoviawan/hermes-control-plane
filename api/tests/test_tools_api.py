from types import SimpleNamespace

import yaml
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_config(path, payload: dict) -> None:
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding='utf-8')


def test_agent_toolsets_and_tools_expand_builtin_and_mcp_inventory(tmp_path, monkeypatch) -> None:
    from app.services import tool_service as tool_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(
        config_path,
        {
            'toolsets': ['hermes-cli', 'browser'],
            'mcp_servers': {
                'mempalace': {'command': '/usr/bin/python3'},
            },
        },
    )

    monkeypatch.setattr(tool_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    toolsets_response = client.get('/api/agents/default/toolsets')
    assert toolsets_response.status_code == 200
    toolsets_payload = toolsets_response.json()
    assert toolsets_payload['agent_id'] == 'default'
    assert toolsets_payload['total'] == 3
    assert [item['name'] for item in toolsets_payload['toolsets']] == ['browser', 'hermes-cli', 'mcp:mempalace']
    assert toolsets_payload['toolsets'][0]['source'] == 'builtin'
    assert toolsets_payload['toolsets'][2]['source'] == 'mcp'

    tools_response = client.get('/api/agents/default/tools')
    assert tools_response.status_code == 200
    tools_payload = tools_response.json()
    names = [item['name'] for item in tools_payload['tools']]
    assert 'browser_navigate' in names
    assert 'terminal' in names
    assert 'mcp__mempalace' in names
    mcp_tool = next(item for item in tools_payload['tools'] if item['name'] == 'mcp__mempalace')
    assert mcp_tool['source_type'] == 'mcp'
    assert mcp_tool['source_id'] == 'mempalace'
    assert mcp_tool['availability_reason'] == 'MCP server configured'


def test_system_tool_catalog_deduplicates_inventory_across_profiles(tmp_path, monkeypatch) -> None:
    from app.services import tool_service as tool_service_module

    default_home = tmp_path / 'default-home'
    default_home.mkdir()
    write_config(default_home / 'config.yaml', {'toolsets': ['hermes-cli']})

    ops_home = tmp_path / 'ops-home'
    ops_home.mkdir()
    write_config(ops_home / 'config.yaml', {'toolsets': ['browser', 'hermes-cli']})

    def fake_profile_contexts():
        return [SimpleNamespace(profile='default', home=default_home), SimpleNamespace(profile='ops', home=ops_home)]

    monkeypatch.setattr(tool_service_module, 'profile_contexts', fake_profile_contexts)

    response = client.get('/api/system/toolsets')

    assert response.status_code == 200
    payload = response.json()
    assert payload['total'] == 2
    assert [item['name'] for item in payload['toolsets']] == ['browser', 'hermes-cli']

    tools_response = client.get('/api/system/tools')
    assert tools_response.status_code == 200
    tools_payload = tools_response.json()
    assert any(item['name'] == 'browser_navigate' for item in tools_payload['tools'])
    assert any(item['name'] == 'terminal' for item in tools_payload['tools'])


def test_agent_toolsets_patch_replaces_enabled_toolsets(tmp_path, monkeypatch) -> None:
    from app.services import tool_service as tool_service_module

    config_path = tmp_path / 'config.yaml'
    write_config(config_path, {'toolsets': ['hermes-cli']})

    monkeypatch.setattr(tool_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.patch('/api/agents/default/toolsets', json={'toolsets': ['browser']})

    assert response.status_code == 200
    payload = response.json()
    assert [item['name'] for item in payload['toolsets']] == ['browser']
    stored = yaml.safe_load(config_path.read_text(encoding='utf-8'))
    assert stored['toolsets'] == ['browser']


def test_agent_toolsets_patch_rejects_malformed_yaml_without_overwriting_file(tmp_path, monkeypatch) -> None:
    from app.services import tool_service as tool_service_module

    config_path = tmp_path / 'config.yaml'
    malformed = 'toolsets: [hermes-cli\n'
    config_path.write_text(malformed, encoding='utf-8')

    monkeypatch.setattr(tool_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.patch('/api/agents/default/toolsets', json={'toolsets': ['browser']})

    assert response.status_code == 409
    assert response.json()['detail'] == 'Cannot update toolsets because config.yaml is unreadable or malformed.'
    assert config_path.read_text(encoding='utf-8') == malformed
