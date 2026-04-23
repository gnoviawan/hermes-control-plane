from app.utils import parse_simple_table_row, redact_secrets, summarize_config, validate_profile_name


def test_validate_profile_name() -> None:
    assert validate_profile_name("marketing") is True
    assert validate_profile_name("bad/name") is False


def test_redact_and_summarize_config() -> None:
    config = {
        "model": {"default": "gpt-5.4", "provider": "custom"},
        "providers": {"custom": {"api_key": "secret-key", "base_url": "https://example.com"}},
        "display": {"personality": "creative"},
    }
    redacted = redact_secrets(config)
    assert redacted["providers"]["custom"]["api_key"] == "***redacted***"

    summary = summarize_config(config)
    assert summary["model"]["default"] == "gpt-5.4"
    assert summary["provider_names"] == ["custom"]


def test_parse_simple_table_row_for_box_drawing_table() -> None:
    row = "│ dogfood │ category │ builtin │ builtin │"
    assert parse_simple_table_row(row, 4) == ["dogfood", "category", "builtin", "builtin"]
