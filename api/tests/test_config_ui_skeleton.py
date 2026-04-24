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
