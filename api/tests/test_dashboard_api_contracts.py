from fastapi.testclient import TestClient

from app.core.settings import settings
from app.main import app
from app.models import ProfileSummary
from app.services import hermes_adapter


client = TestClient(app)


def test_system_health_contract_is_available() -> None:
    response = client.get('/api/system/health')

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        'status': 'ok',
        'service': 'Hermes Control Plane API',
        'api_version': 'v1alpha1',
        'app_version': '0.1.0',
        'adapter': {
            'kind': 'hermes-dashboard-api',
            'hermes_home': '/opt/data',
            'hermes_bin': '/opt/hermes/.venv/bin/hermes',
            'hermes_bin_exists': settings.hermes_bin.exists(),
        },
    }


def test_system_version_contract_is_available() -> None:
    response = client.get('/api/system/version')

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        'service': 'Hermes Control Plane API',
        'api_version': 'v1alpha1',
        'app_version': '0.1.0',
    }


def test_agents_collection_uses_stable_dashboard_contract(monkeypatch) -> None:
    monkeypatch.setattr('app.main.active_profile_name', lambda: 'default')
    monkeypatch.setattr(
        'app.main.profile_contexts',
        lambda: [hermes_adapter.HermesContext(profile='default'), hermes_adapter.HermesContext(profile='nightowl')],
    )

    summaries = {
        'default': ProfileSummary(
            name='default',
            path='/opt/data',
            is_active=True,
            exists=True,
            model='gpt-5.4',
            provider='custom',
            gateway_state='online',
            has_env_file=True,
            has_soul_file=True,
            skill_count=12,
        ),
        'nightowl': ProfileSummary(
            name='nightowl',
            path='/opt/data/profiles/nightowl',
            is_active=False,
            exists=True,
            model='opus',
            provider='airouter',
            gateway_state='offline',
            has_env_file=True,
            has_soul_file=False,
            skill_count=4,
        ),
    }
    monkeypatch.setattr('app.main.profile_summary', lambda context, active_profile: summaries[context.profile])

    response = client.get('/api/agents')

    assert response.status_code == 200
    payload = response.json()
    assert payload['active_agent_id'] == 'default'
    assert payload['total'] == 2
    assert payload['agents'] == [
        {
            'id': 'default',
            'name': 'default',
            'path': '/opt/data',
            'is_active': True,
            'exists': True,
            'defaults': {'model': 'gpt-5.4', 'provider': 'custom'},
            'files': {'has_env_file': True, 'has_soul_file': True},
            'runtime_hints': {'gateway_state': 'online', 'skill_count': 12},
        },
        {
            'id': 'nightowl',
            'name': 'nightowl',
            'path': '/opt/data/profiles/nightowl',
            'is_active': False,
            'exists': True,
            'defaults': {'model': 'opus', 'provider': 'airouter'},
            'files': {'has_env_file': True, 'has_soul_file': False},
            'runtime_hints': {'gateway_state': 'offline', 'skill_count': 4},
        },
    ]


def test_agent_detail_contract_is_available(monkeypatch) -> None:
    monkeypatch.setattr('app.main.active_profile_name', lambda: 'nightowl')
    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: hermes_adapter.HermesContext(profile=agent_id))
    monkeypatch.setattr(
        'app.main.profile_summary',
        lambda context, active_profile: ProfileSummary(
            name=context.profile,
            path=f'/opt/data/profiles/{context.profile}',
            is_active=context.profile == active_profile,
            exists=True,
            model='opus',
            provider='airouter',
            gateway_state='online',
            has_env_file=True,
            has_soul_file=True,
            skill_count=9,
        ),
    )

    response = client.get('/api/agents/nightowl')

    assert response.status_code == 200
    assert response.json() == {
        'id': 'nightowl',
        'name': 'nightowl',
        'path': '/opt/data/profiles/nightowl',
        'is_active': True,
        'exists': True,
        'defaults': {'model': 'opus', 'provider': 'airouter'},
        'files': {'has_env_file': True, 'has_soul_file': True},
        'runtime_hints': {'gateway_state': 'online', 'skill_count': 9},
    }
