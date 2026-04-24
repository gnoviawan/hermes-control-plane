from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_route_registry_hardening_enforces_manifest_component_and_icon_coverage() -> None:
    route_registry_source = (ROOT / 'web' / 'src' / 'routeRegistry.tsx').read_text(encoding='utf-8')
    route_smoke_source = (ROOT / 'web' / 'scripts' / 'check-routes.mjs').read_text(encoding='utf-8')

    assert 'assertRouteRegistryCoverage' in route_registry_source
    assert 'missingComponentKeys' in route_registry_source
    assert 'missingIconKeys' in route_registry_source
    assert 'missingComponentKeys' in route_smoke_source
    assert 'missingIconKeys' in route_smoke_source
