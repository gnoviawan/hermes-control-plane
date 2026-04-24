from types import SimpleNamespace

import yaml
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_jobs(path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(__import__('json').dumps(payload), encoding='utf-8')


def write_config(path, payload: dict) -> None:
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding='utf-8')


def test_agent_cron_jobs_expose_stable_list_and_detail(tmp_path, monkeypatch) -> None:
    from app.services import cron_service as cron_service_module

    write_config(tmp_path / 'config.yaml', {})
    write_jobs(
        tmp_path / 'cron' / 'jobs.json',
        {
            'jobs': [
                {
                    'id': 'cron-summary',
                    'name': 'Daily summary',
                    'prompt': 'Summarize activity',
                    'skills': ['daily-summary'],
                    'schedule_display': '0 9 * * *',
                    'enabled': True,
                    'state': 'scheduled',
                    'next_run_at': '2026-04-24T02:00:00Z',
                    'last_run_at': '2026-04-23T02:00:00Z',
                    'last_status': 'success',
                    'deliver': 'origin',
                }
            ]
        },
    )

    monkeypatch.setattr(cron_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    list_response = client.get('/api/agents/default/cron/jobs')
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload['agent_id'] == 'default'
    assert payload['total'] == 1
    assert payload['jobs'][0]['id'] == 'cron-summary'
    assert payload['jobs'][0]['schedule'] == '0 9 * * *'
    assert payload['jobs'][0]['deliver_target'] == 'origin'

    detail_response = client.get('/api/agents/default/cron/jobs/cron-summary')
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail['prompt_preview'] == 'Summarize activity'
    assert detail['skills'] == ['daily-summary']


def test_agent_cron_job_actions_update_state(tmp_path, monkeypatch) -> None:
    from app.services import cron_service as cron_service_module

    write_config(tmp_path / 'config.yaml', {})
    write_jobs(
        tmp_path / 'cron' / 'jobs.json',
        {
            'jobs': [
                {
                    'id': 'cron-summary',
                    'name': 'Daily summary',
                    'schedule_display': '0 9 * * *',
                    'enabled': True,
                    'state': 'scheduled',
                    'deliver': 'origin',
                }
            ]
        },
    )

    monkeypatch.setattr(cron_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    pause_response = client.post('/api/agents/default/cron/jobs/cron-summary/pause')
    assert pause_response.status_code == 200
    assert pause_response.json()['status'] == 'paused'

    resume_response = client.post('/api/agents/default/cron/jobs/cron-summary/resume')
    assert resume_response.status_code == 200
    assert resume_response.json()['status'] == 'scheduled'

    trigger_response = client.post('/api/agents/default/cron/jobs/cron-summary/trigger')
    assert trigger_response.status_code == 200
    assert trigger_response.json()['last_status'] == 'triggered'


def test_agent_cron_job_create_update_and_delete(tmp_path, monkeypatch) -> None:
    from app.services import cron_service as cron_service_module

    write_config(tmp_path / 'config.yaml', {})
    write_jobs(tmp_path / 'cron' / 'jobs.json', {'jobs': []})

    monkeypatch.setattr(cron_service_module, 'ensure_profile_exists', lambda profile='default': SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    create_response = client.post(
        '/api/agents/default/cron/jobs',
        json={
            'name': 'Digest',
            'prompt': 'Send digest',
            'skills': ['digest'],
            'schedule': '0 9 * * *',
            'deliver_target': 'origin',
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created['name'] == 'Digest'
    assert created['status'] == 'scheduled'

    job_id = created['id']
    update_response = client.patch(
        f'/api/agents/default/cron/jobs/{job_id}',
        json={'schedule': '0 18 * * *', 'deliver_target': 'local'},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated['schedule'] == '0 18 * * *'
    assert updated['deliver_target'] == 'local'

    delete_response = client.delete(f'/api/agents/default/cron/jobs/{job_id}')
    assert delete_response.status_code == 200
    assert delete_response.json() == {'ok': True, 'id': job_id}

    list_response = client.get('/api/agents/default/cron/jobs')
    assert list_response.status_code == 200
    assert list_response.json()['total'] == 0
