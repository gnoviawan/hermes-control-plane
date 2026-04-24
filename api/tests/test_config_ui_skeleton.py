from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_config_page_uses_schema_driven_editor_sections() -> None:
    config_page = (ROOT / 'web' / 'src' / 'pages' / 'ConfigPage.tsx').read_text(encoding='utf-8')

    assert 'getAgentConfigSchema' in config_page
    assert 'schema?.sections' in config_page
    assert 'statusColorMap' in config_page
    assert 'Input' in config_page
    assert 'Select' in config_page
    assert 'Editable schema' in config_page
    assert 'Raw effective config' in config_page
    assert 'Write restrictions' in config_page


def test_config_page_includes_validate_preview_and_reload_save_flow() -> None:
    config_page = (ROOT / 'web' / 'src' / 'pages' / 'ConfigPage.tsx').read_text(encoding='utf-8')
    client_source = (ROOT / 'web' / 'src' / 'api' / 'client.ts').read_text(encoding='utf-8')

    assert 'validateAgentConfig' in client_source
    assert 'patchAgentConfig' in client_source
    assert 'reloadAgentConfig' in client_source

    assert 'draftValues' in config_page
    assert 'pendingChanges' in config_page
    assert 'Validation preview' in config_page
    assert 'Save changes' in config_page
    assert 'Discard changes' in config_page
    assert 'Reload config' in config_page
    assert 'validateAgentConfig' in config_page
    assert 'patchAgentConfig' in config_page
    assert 'reloadAgentConfig' in config_page


def test_config_page_includes_env_and_api_keys_workspace() -> None:
    config_page = (ROOT / 'web' / 'src' / 'pages' / 'ConfigPage.tsx').read_text(encoding='utf-8')
    client_source = (ROOT / 'web' / 'src' / 'api' / 'client.ts').read_text(encoding='utf-8')

    assert 'getSystemEnvCatalog' in client_source
    assert 'getAgentEnv' in client_source
    assert 'setAgentEnv' in client_source
    assert 'deleteAgentEnv' in client_source

    assert 'Env & API Keys' in config_page
    assert 'systemEnvCatalog' in config_page
    assert 'agentEnvState' in config_page
    assert 'Save key' in config_page
    assert 'Delete key' in config_page
