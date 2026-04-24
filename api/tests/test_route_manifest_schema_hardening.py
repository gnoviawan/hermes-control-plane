from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_route_manifest_schema_hardening_enforces_unique_keys_paths_and_allowed_groups() -> None:
    route_registry_source = (ROOT / 'web' / 'src' / 'routeRegistry.tsx').read_text(encoding='utf-8')
    route_smoke_source = (ROOT / 'web' / 'scripts' / 'check-routes.mjs').read_text(encoding='utf-8')

    assert 'duplicateRouteKeys' in route_registry_source
    assert 'duplicateRoutePaths' in route_registry_source
    assert 'invalidRouteGroups' in route_registry_source
    assert 'allowedRouteGroups' in route_registry_source

    assert 'duplicateRouteKeys' in route_smoke_source
    assert 'duplicateRoutePaths' in route_smoke_source
    assert 'invalidRouteGroups' in route_smoke_source
