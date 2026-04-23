from pathlib import Path
from types import SimpleNamespace

from fastapi import HTTPException

from app.models import CommandResult, ProfileSummary
from app.services import hermes_adapter


def test_status_payload_is_defensive_when_hermes_commands_fail(monkeypatch) -> None:
    monkeypatch.setattr(hermes_adapter, "active_profile_name", lambda: "default")
    monkeypatch.setattr(
        hermes_adapter,
        "run_hermes_command",
        lambda args, profile="default", timeout=None: CommandResult(
            command=["hermes", *args],
            exit_code=1,
            stdout="",
            stderr="status failed",
            ok=False,
        ),
    )
    monkeypatch.setattr(hermes_adapter, "profile_contexts", lambda: [hermes_adapter.HermesContext(profile="default")])
    monkeypatch.setattr(
        hermes_adapter,
        "profile_summary",
        lambda context, active_profile: ProfileSummary(name=context.profile, path="/tmp/default", is_active=True, exists=False),
    )
    monkeypatch.setattr(hermes_adapter, "list_sessions", lambda profile="default": (_ for _ in ()).throw(HTTPException(status_code=500, detail="boom")))
    monkeypatch.setattr(hermes_adapter, "list_cron_jobs", lambda profile="default": (_ for _ in ()).throw(HTTPException(status_code=500, detail="boom")))

    payload = hermes_adapter.status_payload()

    assert payload["ok"] is False
    assert payload["active_profile"] == "default"
    assert payload["session_count"] == 0
    assert payload["cron_job_count"] == 0
    assert payload["raw_status"] == "status failed"
    assert payload["status_excerpt"] == ["status failed"]


def test_profile_summary_tolerates_invalid_partial_files(tmp_path, monkeypatch) -> None:
    (tmp_path / "config.yaml").write_text(": not valid yaml\n", encoding="utf-8")
    (tmp_path / "gateway_state.json").write_text("{not-json", encoding="utf-8")

    monkeypatch.setattr(
        hermes_adapter,
        "settings",
        SimpleNamespace(
            hermes_home=tmp_path,
            profiles_dir_name="profiles",
            logs_dir_name="logs",
            cron_dir_name="cron",
            skills_snapshot_name=".skills_prompt_snapshot.json",
            command_timeout_seconds=45,
            hermes_bin=Path("/opt/hermes/.venv/bin/hermes"),
        ),
    )

    summary = hermes_adapter.profile_summary(hermes_adapter.HermesContext(profile="default"), active_profile="default")

    assert summary.name == "default"
    assert summary.exists is True
    assert summary.is_active is True
    assert summary.model is None
    assert summary.provider is None
    assert summary.gateway_state is None
    assert summary.skill_count == 0


def test_run_hermes_command_catches_oserror(monkeypatch) -> None:
    monkeypatch.setattr(hermes_adapter, "ensure_profile_exists", lambda profile: hermes_adapter.HermesContext(profile=profile))
    monkeypatch.setattr(
        hermes_adapter.subprocess,
        "run",
        lambda *args, **kwargs: (_ for _ in ()).throw(FileNotFoundError("missing hermes binary")),
    )

    result = hermes_adapter.run_hermes_command(["status"])

    assert result.ok is False
    assert result.exit_code == 1
    assert "missing hermes binary" in result.stderr


def test_list_skills_falls_back_to_filesystem(tmp_path, monkeypatch) -> None:
    skills_root = tmp_path / "skills" / "devops" / "sample-skill"
    skills_root.mkdir(parents=True)
    (skills_root / "SKILL.md").write_text("# sample", encoding="utf-8")
    monkeypatch.setattr(hermes_adapter, "ensure_profile_exists", lambda profile: hermes_adapter.HermesContext(profile=profile))
    monkeypatch.setattr(hermes_adapter, "settings", SimpleNamespace(hermes_home=tmp_path, profiles_dir_name="profiles", logs_dir_name="logs", cron_dir_name="cron", skills_snapshot_name=".skills_prompt_snapshot.json", command_timeout_seconds=45, hermes_bin=Path("/opt/hermes/.venv/bin/hermes")))
    monkeypatch.setattr(hermes_adapter, "run_hermes_command", lambda args, profile="default", timeout=None: CommandResult(command=["hermes", *args], exit_code=1, stdout="", stderr="[Errno 2] No such file or directory: '/opt/hermes/.venv/bin/hermes'", ok=False))

    items = hermes_adapter.list_skills("default")

    assert len(items) == 1
    assert items[0].name == "sample-skill"
    assert items[0].category == "devops"
    assert items[0].source == "filesystem"


def test_list_sessions_falls_back_to_filesystem(tmp_path, monkeypatch) -> None:
    session_dir = tmp_path / "sessions"
    session_dir.mkdir(parents=True)
    (session_dir / "session_20260422_050952_3edbc6.json").write_text('{"session_id":"20260422_050952_3edbc6","platform":"discord","last_updated":"2026-04-22T05:11:16.853158"}', encoding="utf-8")
    monkeypatch.setattr(hermes_adapter, "ensure_profile_exists", lambda profile: hermes_adapter.HermesContext(profile=profile))
    monkeypatch.setattr(hermes_adapter, "settings", SimpleNamespace(hermes_home=tmp_path, profiles_dir_name="profiles", logs_dir_name="logs", cron_dir_name="cron", skills_snapshot_name=".skills_prompt_snapshot.json", command_timeout_seconds=45, hermes_bin=Path("/opt/hermes/.venv/bin/hermes")))
    monkeypatch.setattr(hermes_adapter, "run_hermes_command", lambda args, profile="default", timeout=None: CommandResult(command=["hermes", *args], exit_code=1, stdout="", stderr="[Errno 2] No such file or directory: '/opt/hermes/.venv/bin/hermes'", ok=False))

    items = hermes_adapter.list_sessions("default")

    assert len(items) == 1
    assert items[0].id == "20260422_050952_3edbc6"
    assert items[0].preview == "discord"


def test_create_profile_falls_back_to_filesystem_clone(tmp_path, monkeypatch) -> None:
    (tmp_path / "config.yaml").write_text("model: {}\n", encoding="utf-8")
    (tmp_path / ".env").write_text("TEST=1\n", encoding="utf-8")
    (tmp_path / "SOUL.md").write_text("hello\n", encoding="utf-8")
    monkeypatch.setattr(hermes_adapter, "settings", SimpleNamespace(hermes_home=tmp_path, profiles_dir_name="profiles", logs_dir_name="logs", cron_dir_name="cron", skills_snapshot_name=".skills_prompt_snapshot.json", command_timeout_seconds=45, hermes_bin=Path("/opt/hermes/.venv/bin/hermes")))
    monkeypatch.setattr(hermes_adapter, "run_hermes_command", lambda args, profile="default", timeout=None: CommandResult(command=["hermes", *args], exit_code=1, stdout="", stderr="[Errno 2] No such file or directory: '/opt/hermes/.venv/bin/hermes'", ok=False))

    result = hermes_adapter.create_profile("demo", clone=False, clone_all=False, clone_from=None, no_alias=False)

    assert result.ok is True
    assert (tmp_path / "profiles" / "demo" / "config.yaml").exists()
