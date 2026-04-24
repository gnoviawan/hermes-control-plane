from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[2]


CRITICAL_ROUTE_KEYS = [
    'overview',
    'console',
    'sessions',
    'tools',
    'mcp',
    'memory',
    'workspace',
    'gateway',
    'security',
    'cron-jobs',
    'logs',
    'profiles',
    'plugins',
    'config',
    'providers-models',
    'skills',
]


def test_ci_workflow_runs_ui_route_smoke_check() -> None:
    workflow_path = ROOT / '.github' / 'workflows' / 'ci.yml'
    workflow = yaml.safe_load(workflow_path.read_text(encoding='utf-8'))

    frontend_steps = workflow['jobs']['frontend']['steps']
    run_steps = [step.get('run') for step in frontend_steps if isinstance(step, dict) and 'run' in step]

    assert 'npm run smoke:routes' in run_steps


def test_route_manifest_covers_critical_dashboard_pages() -> None:
    manifest_path = ROOT / 'web' / 'route-manifest.json'
    assert manifest_path.exists(), 'route-manifest.json should define critical dashboard routes'

    manifest = yaml.safe_load(manifest_path.read_text(encoding='utf-8'))
    route_keys = [route['key'] for route in manifest['routes']]

    assert route_keys == CRITICAL_ROUTE_KEYS
