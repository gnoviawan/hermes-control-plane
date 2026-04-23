from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_create_run_contract_returns_reconnectable_links(monkeypatch) -> None:
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    response = client.post(
        '/api/agents/nightowl/runs',
        json={
            'session_id': 'sess-123',
            'input': 'Summarize latest runtime health',
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload['agent_id'] == 'nightowl'
    assert payload['session_id'] == 'sess-123'
    assert payload['status'] == 'queued'
    assert payload['summary'] == 'Summarize latest runtime health'
    assert payload['stream_url'].endswith(f"/api/agents/nightowl/runs/{payload['id']}/stream")
    assert payload['events_url'].endswith(f"/api/agents/nightowl/runs/{payload['id']}/events")
    assert payload['started_at'] is not None
    assert payload['ended_at'] is None


def test_run_lifecycle_endpoints_create_list_get_and_stop(monkeypatch) -> None:
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    created = client.post(
        '/api/agents/default/runs',
        json={'session_id': 'sess-default', 'input': 'Check console'},
    )
    run_id = created.json()['id']

    list_response = client.get('/api/agents/default/runs')
    assert list_response.status_code == 200
    assert list_response.json()['total'] >= 1
    assert any(run['id'] == run_id for run in list_response.json()['runs'])

    detail_response = client.get(f'/api/agents/default/runs/{run_id}')
    assert detail_response.status_code == 200
    assert detail_response.json()['id'] == run_id
    assert detail_response.json()['status'] == 'queued'

    stop_response = client.post(f'/api/agents/default/runs/{run_id}/stop')
    assert stop_response.status_code == 200
    assert stop_response.json()['status'] == 'stopped'
    assert stop_response.json()['ended_at'] is not None

    stopped_detail = client.get(f'/api/agents/default/runs/{run_id}')
    assert stopped_detail.status_code == 200
    assert stopped_detail.json()['status'] == 'stopped'


def test_run_events_endpoint_exposes_sse_contract(monkeypatch) -> None:
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())

    created = client.post(
        '/api/agents/default/runs',
        json={'session_id': 'sess-stream', 'input': 'Stream hello'},
    )
    run_id = created.json()['id']

    response = client.get(f'/api/agents/default/runs/{run_id}/events')

    assert response.status_code == 200
    assert response.headers['content-type'].startswith('text/event-stream')
    body = response.text
    assert 'event: run.snapshot' in body
    assert f'id: {run_id}:1' in body
    assert '"status": "queued"' in body
    assert '"agent_id": "default"' in body
