from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_system_diagnostics_contracts_expose_health_doctor_version_and_setup(monkeypatch) -> None:
    from app.models import SetupCheckItem, SetupCheckResponse
    from app.services import diagnostics_service as diagnostics_service_module

    monkeypatch.setattr(
        diagnostics_service_module.diagnostics_service,
        'get_setup_check',
        lambda: SetupCheckResponse(
            status='ok',
            items=[
                SetupCheckItem(key='hermes_home', configured=True, value='/opt/data'),
                SetupCheckItem(key='hermes_bin', configured=True, value='/opt/hermes/.venv/bin/hermes'),
                SetupCheckItem(key='hermes_root', configured=True, value='/opt/hermes'),
            ],
        ),
    )

    monkeypatch.setattr(
        diagnostics_service_module.diagnostics_service,
        'adapter_descriptor',
        lambda: {
            'kind': 'hermes-dashboard-api',
            'hermes_home': '/opt/data',
            'hermes_bin': '/opt/hermes/.venv/bin/hermes',
            'hermes_bin_exists': True,
        },
    )
    monkeypatch.setattr(
        diagnostics_service_module,
        'status_payload',
        lambda: {
            'ok': True,
            'active_profile': 'default',
            'profile_count': 3,
            'session_count': 7,
            'cron_job_count': 2,
            'gateway_state': 'running',
            'status_excerpt': ['Hermes OK', 'Gateway running'],
            'raw_status': 'Hermes OK\nGateway running',
        },
    )

    health_response = client.get('/api/system/health')
    assert health_response.status_code == 200
    health = health_response.json()
    assert health['status'] == 'ok'
    assert health['service'] == 'Hermes Control Plane API'
    assert health['adapter']['kind'] == 'hermes-dashboard-api'
    assert health['runtime']['active_profile'] == 'default'
    assert health['runtime']['gateway_state'] == 'running'

    doctor_response = client.get('/api/system/doctor')
    assert doctor_response.status_code == 200
    doctor = doctor_response.json()
    assert doctor['status'] == 'ok'
    assert doctor['checks'][0]['name'] == 'hermes-binary'
    assert doctor['checks'][0]['ok'] is True
    assert any(check['name'] == 'runtime-status' for check in doctor['checks'])

    version_response = client.get('/api/system/version')
    assert version_response.status_code == 200
    version = version_response.json()
    assert version['api_version'] == 'v1alpha1'
    assert version['app_version'] == '0.1.0'

    setup_response = client.get('/api/system/setup/check')
    assert setup_response.status_code == 200
    setup = setup_response.json()
    assert setup['status'] == 'ok'
    assert setup['items'][0]['key'] == 'hermes_home'
    assert setup['items'][0]['configured'] is True


def test_agent_diagnostics_and_logs_contracts_are_profile_scoped(tmp_path, monkeypatch) -> None:
    from app.services import diagnostics_service as diagnostics_service_module

    log_dir = tmp_path / 'logs'
    log_dir.mkdir(parents=True)
    (log_dir / 'agent.log').write_text('INFO boot complete\nWARN retrying gateway\n', encoding='utf-8')

    monkeypatch.setattr('app.main.ensure_profile_exists', lambda agent_id: object())
    monkeypatch.setattr(
        diagnostics_service_module,
        'ensure_profile_exists',
        lambda profile='default': SimpleNamespace(home=tmp_path, profile=profile),
    )
    monkeypatch.setattr(
        diagnostics_service_module,
        'status_payload',
        lambda: {
            'ok': True,
            'active_profile': 'default',
            'profile_count': 2,
            'session_count': 5,
            'cron_job_count': 1,
            'gateway_state': 'running',
            'status_excerpt': ['Hermes OK'],
            'raw_status': 'Hermes OK',
        },
    )
    monkeypatch.setattr(
        diagnostics_service_module,
        'log_payload',
        lambda profile='default', log_name='agent', lines=100: {
            'log_name': log_name,
            'path': str(log_dir / f'{log_name}.log'),
            'lines': ['INFO boot complete', 'WARN retrying gateway'],
            'total_lines_returned': 2,
        },
    )

    diagnostics_response = client.get('/api/agents/default/diagnostics')
    assert diagnostics_response.status_code == 200
    diagnostics = diagnostics_response.json()
    assert diagnostics['agent_id'] == 'default'
    assert diagnostics['status'] == 'ok'
    assert diagnostics['checks'][0]['name'] == 'profile-home'
    assert diagnostics['checks'][0]['ok'] is True
    assert any(check['name'] == 'agent-log' for check in diagnostics['checks'])

    logs_response = client.get('/api/agents/default/logs')
    assert logs_response.status_code == 200
    logs = logs_response.json()
    assert logs['log_name'] == 'agent'
    assert logs['path'].endswith('/logs/agent.log')
    assert logs['total_lines_returned'] == 2
    assert logs['lines'][0] == 'INFO boot complete'
