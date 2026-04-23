import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import SessionSummary


client = TestClient(app)


@pytest.fixture
def isolated_session_service(tmp_path, monkeypatch):
    from app.services import session_service as session_service_module

    session_dir = tmp_path / 'sessions'
    session_dir.mkdir(parents=True)

    def write_session(name: str, payload: dict) -> None:
        (session_dir / name).write_text(json.dumps(payload), encoding='utf-8')

    write_session(
        'session_release.json',
        {
            'session_id': 'sess-release',
            'title': 'Release readiness review',
            'platform': 'discord',
            'session_start': '2026-04-23T09:00:00Z',
            'last_updated': '2026-04-23T09:30:00Z',
            'message_count': 2,
            'messages': [
                {'role': 'user', 'content': 'Check release blockers'},
                {'role': 'assistant', 'content': 'Two blockers remain'},
            ],
        },
    )
    write_session(
        'session_incident.json',
        {
            'session_id': 'sess-incident',
            'title': 'Incident triage',
            'platform': 'telegram',
            'session_start': '2026-04-23T08:00:00Z',
            'last_updated': '2026-04-23T08:45:00Z',
            'message_count': 1,
            'messages': [
                {'role': 'user', 'content': 'Gateway heartbeat jitter investigation'},
            ],
        },
    )

    monkeypatch.setattr(session_service_module, 'ensure_profile_exists', lambda profile: SimpleNamespace(home=tmp_path))
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    service = session_service_module.SessionService(
        summary_reader=lambda agent_id: [
            SessionSummary(
                id='sess-incident',
                title='Incident triage',
                preview='telegram',
                last_active='2026-04-23T08:45:00Z',
            ),
            SessionSummary(
                id='sess-release',
                title='Release readiness review',
                preview='discord',
                last_active='2026-04-23T09:30:00Z',
            ),
        ]
    )
    monkeypatch.setattr('app.main.session_service', service)

    return service


def test_agent_scoped_sessions_list_endpoint_returns_stable_contract(isolated_session_service) -> None:
    response = client.get('/api/agents/default/sessions')

    assert response.status_code == 200
    payload = response.json()
    assert payload['agent_id'] == 'default'
    assert payload['total'] == 2
    assert [session['id'] for session in payload['sessions']] == ['sess-release', 'sess-incident']
    assert payload['sessions'][0]['title'] == 'Release readiness review'
    assert payload['sessions'][0]['searchable_excerpt'] == 'discord'
    assert payload['sessions'][0]['message_count'] == 2


def test_agent_scoped_session_detail_endpoint_returns_transcript(isolated_session_service) -> None:
    response = client.get('/api/agents/default/sessions/sess-release')

    assert response.status_code == 200
    payload = response.json()
    assert payload['id'] == 'sess-release'
    assert payload['agent_id'] == 'default'
    assert payload['title'] == 'Release readiness review'
    assert payload['message_count'] == 2
    assert payload['messages'][0] == {'role': 'user', 'content': 'Check release blockers'}
    assert payload['messages'][1]['role'] == 'assistant'


def test_agent_scoped_sessions_search_endpoint_filters_results(isolated_session_service) -> None:
    response = client.get('/api/agents/default/sessions/search?q=incident')

    assert response.status_code == 200
    payload = response.json()
    assert payload['agent_id'] == 'default'
    assert payload['query'] == 'incident'
    assert payload['total'] == 1
    assert payload['sessions'][0]['id'] == 'sess-incident'
    assert payload['sessions'][0]['title'] == 'Incident triage'
