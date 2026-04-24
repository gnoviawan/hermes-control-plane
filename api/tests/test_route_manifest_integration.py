from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_frontend_route_registry_consumes_manifest_as_single_source_of_truth() -> None:
    route_registry = ROOT / 'web' / 'src' / 'routeRegistry.tsx'
    app_source = (ROOT / 'web' / 'src' / 'App.tsx').read_text(encoding='utf-8')
    layout_source = (ROOT / 'web' / 'src' / 'layouts' / 'DashboardLayout.tsx').read_text(encoding='utf-8')

    assert route_registry.exists(), 'routeRegistry.tsx should centralize manifest-backed route metadata'

    registry_source = route_registry.read_text(encoding='utf-8')
    assert "from '../route-manifest.json'" in registry_source or 'from "../route-manifest.json"' in registry_source
    assert 'dashboardRoutes' in registry_source
    assert 'navigationItems' in registry_source
    assert 'dashboardRoutes' in app_source
    assert 'navigationItems' in layout_source
    assert "path=\"/overview\"" not in app_source
    assert "key: '/overview'" not in layout_source
