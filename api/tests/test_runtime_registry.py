from fastapi.testclient import TestClient

from app.main import app
from app.models import AgentRuntimeSummary, ProfileSummary, SessionSummary
from app.services.hermes_adapter import HermesContext
from app.services.runtime_registry import RuntimeRegistry


client = TestClient(app)


def _profile_summary(*, name: str, is_active: bool, gateway_state: str | None, model: str, provider: str) -> ProfileSummary:
    return ProfileSummary(
        name=name,
        path=f'/opt/data/profiles/{name}' if name != 'default' else '/opt/data',
        is_active=is_active,
        exists=True,
        model=model,
        provider=provider,
        gateway_state=gateway_state,
        has_env_file=True,
        has_soul_file=name == 'default',
        skill_count=3,
    )


def test_runtime_registry_passes_active_profile_as_keyword_only_argument() -> None:
    calls: list[tuple[str, str]] = []

    def strict_profile_summary(context: HermesContext, *, active_profile: str) -> ProfileSummary:
        calls.append((context.profile, active_profile))
        return _profile_summary(
            name=context.profile,
            is_active=context.profile == active_profile,
            gateway_state='online',
            model='gpt-5.4',
            provider='custom',
        )

    registry = RuntimeRegistry(
        contexts_provider=lambda: [HermesContext(profile='default')],
        active_profile_provider=lambda: 'default',
        profile_summary_provider=strict_profile_summary,
        session_reader=lambda profile: [],
        active_run_counter=lambda profile: 0,
        mcp_status_provider=lambda profile: 'idle',
    )

    runtime = registry.get_runtime('default')

    assert runtime.agent_id == 'default'
    assert calls == [('default', 'default')]


def test_runtime_registry_builds_profile_scoped_capsule_summary() -> None:
    registry = RuntimeRegistry(
        contexts_provider=lambda: [HermesContext(profile='default'), HermesContext(profile='nightowl')],
        active_profile_provider=lambda: 'nightowl',
        profile_summary_provider=lambda context, active_profile: {
            'default': _profile_summary(
                name='default',
                is_active=False,
                gateway_state='offline',
                model='gpt-5.4',
                provider='custom',
            ),
            'nightowl': _profile_summary(
                name='nightowl',
                is_active=True,
                gateway_state='online',
                model='opus',
                provider='airouter',
            ),
        }[context.profile],
        session_reader=lambda profile: [
            SessionSummary(id='sess-1', title='Earlier', preview='...', last_active='2026-04-23T14:00:00Z'),
            SessionSummary(id='sess-2', title='Latest', preview='...', last_active='2026-04-23T16:00:00Z'),
        ]
        if profile == 'nightowl'
        else [],
        active_run_counter=lambda profile: 2 if profile == 'nightowl' else 0,
        mcp_status_provider=lambda profile: 'connected' if profile == 'nightowl' else 'idle',
    )

    runtime = registry.get_runtime('nightowl')

    assert runtime == AgentRuntimeSummary(
        agent_id='nightowl',
        status='active',
        active_run_count=2,
        active_session_count=2,
        active_session_id='sess-2',
        effective_provider='airouter',
        effective_model='opus',
        mcp_status='connected',
        gateway_status='online',
        last_activity_at='2026-04-23T16:00:00Z',
    )


def test_agent_runtime_endpoint_uses_registry_contract(monkeypatch) -> None:
    registry = RuntimeRegistry(
        contexts_provider=lambda: [HermesContext(profile='nightowl')],
        active_profile_provider=lambda: 'nightowl',
        profile_summary_provider=lambda context, active_profile: _profile_summary(
            name=context.profile,
            is_active=True,
            gateway_state='online',
            model='opus',
            provider='airouter',
        ),
        session_reader=lambda profile: [
            SessionSummary(id='sess-9', title='Runtime', preview='...', last_active='2026-04-23T16:15:00Z')
        ],
        active_run_counter=lambda profile: 1,
        mcp_status_provider=lambda profile: 'connected',
    )
    monkeypatch.setattr('app.main.runtime_registry', registry)

    response = client.get('/api/agents/nightowl/runtime')

    assert response.status_code == 200
    assert response.json() == {
        'agent_id': 'nightowl',
        'status': 'active',
        'active_run_count': 1,
        'active_session_count': 1,
        'active_session_id': 'sess-9',
        'effective_provider': 'airouter',
        'effective_model': 'opus',
        'mcp_status': 'connected',
        'gateway_status': 'online',
        'last_activity_at': '2026-04-23T16:15:00Z',
    }


def test_agent_runtime_collection_lists_all_runtime_capsules(monkeypatch) -> None:
    registry = RuntimeRegistry(
        contexts_provider=lambda: [HermesContext(profile='default'), HermesContext(profile='nightowl')],
        active_profile_provider=lambda: 'default',
        profile_summary_provider=lambda context, active_profile: _profile_summary(
            name=context.profile,
            is_active=context.profile == active_profile,
            gateway_state='online' if context.profile == 'default' else 'offline',
            model='gpt-5.4' if context.profile == 'default' else 'opus',
            provider='custom' if context.profile == 'default' else 'airouter',
        ),
        session_reader=lambda profile: [],
        active_run_counter=lambda profile: 0,
        mcp_status_provider=lambda profile: 'idle',
    )
    monkeypatch.setattr('app.main.runtime_registry', registry)

    response = client.get('/api/agents/runtimes')

    assert response.status_code == 200
    assert response.json() == {
        'runtimes': [
            {
                'agent_id': 'default',
                'status': 'active',
                'active_run_count': 0,
                'active_session_count': 0,
                'active_session_id': None,
                'effective_provider': 'custom',
                'effective_model': 'gpt-5.4',
                'mcp_status': 'idle',
                'gateway_status': 'online',
                'last_activity_at': None,
            },
            {
                'agent_id': 'nightowl',
                'status': 'idle',
                'active_run_count': 0,
                'active_session_count': 0,
                'active_session_id': None,
                'effective_provider': 'airouter',
                'effective_model': 'opus',
                'mcp_status': 'idle',
                'gateway_status': 'offline',
                'last_activity_at': None,
            },
        ],
        'total': 2,
    }
