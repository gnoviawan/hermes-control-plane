import json

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def write_json(path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding='utf-8')


def test_system_plugins_contract_exposes_slot_catalog_and_registered_plugins(tmp_path, monkeypatch) -> None:
    from app.services import plugin_service as plugin_service_module

    write_json(
        tmp_path / 'dashboard_plugins.json',
        {
            'plugins': [
                {
                    'id': 'ops-insights',
                    'name': 'Ops Insights',
                    'version': '0.1.0',
                    'enabled': True,
                    'source': 'local',
                    'description': 'Adds operational extensions.',
                    'extensions': [
                        {
                            'key': 'ops-route',
                            'kind': 'page_route',
                            'title': 'Ops Insights',
                            'description': 'Plugin route for operations dashboards.',
                            'target': 'settings.plugins',
                            'path': '/plugins/ops-insights/ops-route',
                        },
                        {
                            'key': 'queue-depth',
                            'kind': 'dashboard_widget',
                            'title': 'Queue Depth',
                            'description': 'Shows queued work across agents.',
                            'target': 'overview.sidebar',
                        },
                        {
                            'key': 'tool-gallery',
                            'kind': 'tool_result_renderer',
                            'title': 'Tool Gallery',
                            'description': 'Renders media-heavy tool outputs.',
                            'target': 'tool:browser_get_images',
                        },
                    ],
                }
            ]
        },
    )

    monkeypatch.setattr(plugin_service_module.plugin_service, '_manifest_path', lambda: tmp_path / 'dashboard_plugins.json')

    response = client.get('/api/system/plugins')
    assert response.status_code == 200

    payload = response.json()
    assert payload['total_plugins'] == 1
    assert payload['supported_slots'][0]['kind'] == 'page_route'
    assert payload['supported_slots'][1]['kind'] == 'dashboard_widget'
    assert payload['supported_slots'][2]['kind'] == 'tool_result_renderer'
    assert payload['plugins'][0]['id'] == 'ops-insights'
    assert payload['plugins'][0]['extensions'][0]['path'] == '/plugins/ops-insights/ops-route'
    assert payload['plugins'][0]['extensions'][1]['target'] == 'overview.sidebar'


def test_system_plugins_contract_handles_missing_manifest() -> None:
    response = client.get('/api/system/plugins')
    assert response.status_code == 200

    payload = response.json()
    assert payload['supported_slots']
    assert payload['plugins'] == []
    assert payload['total_plugins'] == 0
