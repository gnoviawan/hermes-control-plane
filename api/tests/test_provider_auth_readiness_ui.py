from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_providers_page_includes_provider_auth_readiness_panel() -> None:
    providers_page = (ROOT / 'web' / 'src' / 'pages' / 'ProvidersPage.tsx').read_text(encoding='utf-8')
    client_source = (ROOT / 'web' / 'src' / 'api' / 'client.ts').read_text(encoding='utf-8')

    assert 'getProviders' in client_source
    assert 'getSystemEnvCatalog' in client_source
    assert 'getAgentEnv' in client_source

    assert 'Provider auth readiness' in providers_page
    assert 'Auth coverage' in providers_page
    assert 'Env-backed keys' in providers_page
    assert 'Credential source' in providers_page
    assert 'providerReadinessRows' in providers_page
    assert 'systemEnvCatalog' in providers_page
    assert 'agentEnvState' in providers_page
