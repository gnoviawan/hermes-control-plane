from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_route_registry_and_smoke_script_use_shared_validator_module() -> None:
    validator_source = (ROOT / 'web' / 'src' / 'routeManifestValidator.ts').read_text(encoding='utf-8')
    route_registry_source = (ROOT / 'web' / 'src' / 'routeRegistry.tsx').read_text(encoding='utf-8')
    route_smoke_source = (ROOT / 'web' / 'scripts' / 'check-routes.mjs').read_text(encoding='utf-8')

    assert 'export const allowedRouteGroups' in validator_source
    assert 'export const countDuplicates' in validator_source
    assert 'export const collectRouteManifestProblems' in validator_source
    assert 'duplicateRouteKeys' in validator_source
    assert 'missingComponentKeys' in validator_source

    assert "from './routeManifestValidator'" in route_registry_source
    assert 'collectRouteManifestProblems' in route_registry_source

    assert "routeManifestValidator" in route_smoke_source
    assert 'collectRouteManifestProblems' in route_smoke_source
    assert 'duplicateRouteKeys = countDuplicates' not in route_smoke_source
    assert 'const allowedRouteGroups =' not in route_smoke_source
