from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from app.main import app


ROOT = Path(__file__).resolve().parents[2]
client = TestClient(app)


def test_ci_workflow_enforces_frontend_bundle_check() -> None:
    workflow_path = ROOT / '.github' / 'workflows' / 'ci.yml'
    workflow = yaml.safe_load(workflow_path.read_text(encoding='utf-8'))

    frontend_steps = workflow['jobs']['frontend']['steps']
    run_steps = [step.get('run') for step in frontend_steps if isinstance(step, dict) and 'run' in step]

    assert 'npm run build:ci' in run_steps


def test_dashboard_api_smoke_contracts_cover_critical_system_surfaces() -> None:
    critical_paths = [
        '/api/health',
        '/api/system/health',
        '/api/system/providers',
        '/api/system/gateway',
        '/api/system/plugins',
    ]

    for path in critical_paths:
        response = client.get(path)
        assert response.status_code == 200, path
