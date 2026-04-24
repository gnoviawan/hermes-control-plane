from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_json(path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(__import__('json').dumps(payload, indent=2), encoding='utf-8')


def test_agent_memory_crud_and_provider_status_are_exposed(tmp_path, monkeypatch) -> None:
    from app.services import memory_service as memory_service_module

    write_json(
        tmp_path / 'memory.json',
        {
            'entries': [
                {'id': 'mem-1', 'scope': 'memory', 'content': 'User prefers CLI-first workflows.', 'updated_at': '2026-04-24T04:00:00Z'},
                {'id': 'user-1', 'scope': 'user', 'content': 'Timezone: WIB.', 'updated_at': '2026-04-24T04:01:00Z'},
            ],
            'providers': [
                {'name': 'memory-tool', 'status': 'healthy', 'source': 'local-file', 'entry_count': 2},
            ],
        },
    )

    monkeypatch.setattr(memory_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path, profile=profile))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    list_response = client.get('/api/agents/default/memory')
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload['agent_id'] == 'default'
    assert payload['total'] == 2
    assert payload['entries'][0]['scope'] == 'memory'
    assert payload['entries'][1]['scope'] == 'user'

    create_response = client.post('/api/agents/default/memory', json={'scope': 'memory', 'content': 'Never expose raw API keys.'})
    assert create_response.status_code == 200
    created = create_response.json()
    assert created['scope'] == 'memory'
    assert created['content'] == 'Never expose raw API keys.'

    patch_response = client.patch('/api/agents/default/memory', json={'id': created['id'], 'content': 'Never expose raw API keys or tokens.'})
    assert patch_response.status_code == 200
    assert patch_response.json()['content'] == 'Never expose raw API keys or tokens.'

    delete_response = client.request('DELETE', '/api/agents/default/memory', json={'id': created['id']})
    assert delete_response.status_code == 200
    assert delete_response.json()['deleted'] is True

    providers_response = client.get('/api/agents/default/memory/providers')
    assert providers_response.status_code == 200
    providers = providers_response.json()
    assert providers['agent_id'] == 'default'
    assert providers['providers'][0]['name'] == 'memory-tool'
    assert providers['providers'][0]['entry_count'] == 2


def test_agent_memory_redacts_secret_like_content(tmp_path, monkeypatch) -> None:
    from app.services import memory_service as memory_service_module

    write_json(
        tmp_path / 'memory.json',
        {
            'entries': [
                {'id': 'mem-1', 'scope': 'memory', 'content': 'Dokploy API key: super-secret-token', 'updated_at': '2026-04-24T04:00:00Z'},
            ],
            'providers': [],
        },
    )

    monkeypatch.setattr(memory_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path, profile=profile))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.get('/api/agents/default/memory')
    assert response.status_code == 200
    entry = response.json()['entries'][0]
    assert entry['content'] == '***redacted***'


def test_system_memory_summary_aggregates_profiles(tmp_path, monkeypatch) -> None:
    from app.services import memory_service as memory_service_module

    default_home = tmp_path / 'default'
    ops_home = tmp_path / 'ops'
    write_json(default_home / 'memory.json', {'entries': [{'id': 'mem-1', 'scope': 'memory', 'content': 'CLI first', 'updated_at': '2026-04-24T04:00:00Z'}], 'providers': []})
    write_json(ops_home / 'memory.json', {'entries': [{'id': 'user-1', 'scope': 'user', 'content': 'Timezone WIB', 'updated_at': '2026-04-24T04:01:00Z'}], 'providers': []})

    monkeypatch.setattr(memory_service_module, 'profile_contexts', lambda: [SimpleNamespace(home=default_home, profile='default'), SimpleNamespace(home=ops_home, profile='ops')])
    monkeypatch.setattr(memory_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=default_home if profile == 'default' else ops_home, profile=profile))

    response = client.get('/api/system/memory')
    assert response.status_code == 200
    payload = response.json()
    assert payload['total_entries'] == 2
    assert payload['profiles'][0]['agent_id'] == 'default'
    assert payload['profiles'][1]['agent_id'] == 'ops'
