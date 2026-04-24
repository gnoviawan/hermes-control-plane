from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_agent_workspace_tree_file_artifacts_and_checkpoints_expose_stable_contracts(tmp_path, monkeypatch) -> None:
    from app.services import workspace_service as workspace_service_module

    workspace_root = tmp_path / 'workspace'
    artifacts_root = workspace_root / 'artifacts'
    checkpoints_root = workspace_root / 'checkpoints'
    (workspace_root / 'notes').mkdir(parents=True)
    (artifacts_root).mkdir(parents=True)
    (checkpoints_root / 'checkpoint-alpha').mkdir(parents=True)
    (workspace_root / 'notes' / 'todo.md').write_text('# TODO\nship workspace page\n', encoding='utf-8')
    (artifacts_root / 'run-summary.txt').write_text('artifact output', encoding='utf-8')
    (checkpoints_root / 'checkpoint-alpha' / 'manifest.json').write_text('{"status":"ready"}', encoding='utf-8')

    monkeypatch.setattr(workspace_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path, profile=profile))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    tree_response = client.get('/api/agents/default/workspace/tree')
    assert tree_response.status_code == 200
    tree_payload = tree_response.json()
    assert tree_payload['agent_id'] == 'default'
    assert tree_payload['root_path'] == str(workspace_root)
    assert {entry['name'] for entry in tree_payload['entries']} >= {'notes', 'artifacts', 'checkpoints'}

    file_response = client.get('/api/agents/default/workspace/file', params={'path': 'notes/todo.md'})
    assert file_response.status_code == 200
    file_payload = file_response.json()
    assert file_payload['path'] == 'notes/todo.md'
    assert 'ship workspace page' in file_payload['content']

    artifacts_response = client.get('/api/agents/default/workspace/artifacts')
    assert artifacts_response.status_code == 200
    artifacts_payload = artifacts_response.json()
    assert artifacts_payload['total'] == 1
    assert artifacts_payload['artifacts'][0]['name'] == 'run-summary.txt'
    assert artifacts_payload['artifacts'][0]['kind'] == 'file'

    checkpoints_response = client.get('/api/agents/default/checkpoints')
    assert checkpoints_response.status_code == 200
    checkpoints_payload = checkpoints_response.json()
    assert checkpoints_payload['total'] == 1
    assert checkpoints_payload['checkpoints'][0]['id'] == 'checkpoint-alpha'
    assert checkpoints_payload['checkpoints'][0]['status'] == 'available'


def test_workspace_checkpoint_restore_returns_stable_status(tmp_path, monkeypatch) -> None:
    from app.services import workspace_service as workspace_service_module

    workspace_root = tmp_path / 'workspace'
    checkpoint_dir = workspace_root / 'checkpoints' / 'checkpoint-beta'
    checkpoint_dir.mkdir(parents=True)
    (checkpoint_dir / 'manifest.json').write_text('{"status":"ready"}', encoding='utf-8')

    monkeypatch.setattr(workspace_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path, profile=profile))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.post('/api/agents/default/checkpoints/checkpoint-beta/restore')
    assert response.status_code == 200
    payload = response.json()
    assert payload['agent_id'] == 'default'
    assert payload['checkpoint_id'] == 'checkpoint-beta'
    assert payload['restored'] is True
    assert payload['message'] == 'Restored checkpoint checkpoint-beta for default.'
