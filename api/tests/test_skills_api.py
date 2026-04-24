from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_skill(root, category: str, name: str, body: str = '# Title\n\nSample description\n'):
    skill_dir = root / 'skills' / category / name
    skill_dir.mkdir(parents=True, exist_ok=True)
    skill_file = skill_dir / 'SKILL.md'
    skill_file.write_text(body, encoding='utf-8')
    return skill_file


def test_agent_skills_and_system_catalog_expose_stable_contracts(tmp_path, monkeypatch) -> None:
    from app.services import skill_service as skill_service_module

    write_skill(tmp_path, 'ops', 'incident-escalation', '# Incident\n\nCoordinate escalation paths.\n')
    write_skill(tmp_path, 'ops', 'release-ops', '# Release\n\nAutomate release checks.\n')

    ops_home = tmp_path / 'profiles' / 'ops'
    write_skill(ops_home, 'ops', 'incident-escalation', '# Incident\n\nCoordinate escalation paths.\n')

    monkeypatch.setattr(skill_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path if profile == 'default' else ops_home, profile=profile))
    monkeypatch.setattr(skill_service_module, 'profile_contexts', lambda: [SimpleNamespace(home=tmp_path, profile='default'), SimpleNamespace(home=ops_home, profile='ops')])
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    list_response = client.get('/api/agents/default/skills')
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload['agent_id'] == 'default'
    assert payload['total'] == 2
    assert payload['skills'][0]['name'] == 'incident-escalation'
    assert payload['skills'][0]['installed'] is True
    assert payload['skills'][0]['enabled'] is True
    assert payload['skills'][0]['description'] == 'Coordinate escalation paths.'

    detail_response = client.get('/api/agents/default/skills/incident-escalation')
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail['name'] == 'incident-escalation'
    assert detail['category'] == 'ops'
    assert detail['source'] == 'filesystem'

    catalog_response = client.get('/api/system/skills/catalog')
    assert catalog_response.status_code == 200
    catalog = catalog_response.json()
    entry = next(item for item in catalog['skills'] if item['name'] == 'incident-escalation')
    assert entry['installed_profiles'] == ['default', 'ops']
    assert entry['profile_count'] == 2


def test_agent_skill_patch_and_run_actions(tmp_path, monkeypatch) -> None:
    from app.services import skill_service as skill_service_module

    write_skill(tmp_path, 'ops', 'incident-escalation', '# Incident\n\nCoordinate escalation paths.\n')

    monkeypatch.setattr(skill_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path, profile=profile))
    monkeypatch.setattr(skill_service_module, 'profile_contexts', lambda: [SimpleNamespace(home=tmp_path, profile='default')])
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    patch_response = client.patch('/api/agents/default/skills/incident-escalation', json={'enabled': False})
    assert patch_response.status_code == 200
    patched = patch_response.json()
    assert patched['enabled'] is False

    persisted = client.get('/api/agents/default/skills/incident-escalation')
    assert persisted.status_code == 200
    assert persisted.json()['enabled'] is False

    run_response = client.post('/api/agents/default/skills/incident-escalation/run')
    assert run_response.status_code == 200
    run = run_response.json()
    assert run['agent_id'] == 'default'
    assert run['skill_name'] == 'incident-escalation'
    assert run['status'] == 'queued'
    datetime.fromisoformat(run['requested_at'].replace('Z', '+00:00')).astimezone(timezone.utc)
