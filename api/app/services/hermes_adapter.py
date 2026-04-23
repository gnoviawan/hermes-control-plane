from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.core.settings import settings
from app.models import CommandResult, CronJobSummary, ProfileSummary, SessionSummary, SkillSummary
from app.utils import load_json_file, load_yaml_file, parse_simple_table_row, summarize_config, tail_lines, validate_profile_name


@dataclass
class HermesContext:
    profile: str = "default"

    @property
    def home(self) -> Path:
        if self.profile == "default":
            return settings.hermes_home
        return settings.hermes_home / settings.profiles_dir_name / self.profile


def ensure_profile_exists(profile: str) -> HermesContext:
    if profile == "default":
        return HermesContext(profile=profile)
    if not validate_profile_name(profile):
        raise HTTPException(status_code=400, detail="Invalid profile name")
    context = HermesContext(profile=profile)
    if not context.home.exists():
        raise HTTPException(status_code=404, detail=f"Profile '{profile}' not found")
    return context


def run_hermes_command(args: list[str], *, profile: str = "default", timeout: int | None = None) -> CommandResult:
    context = ensure_profile_exists(profile)
    env = os.environ.copy()
    env["HERMES_HOME"] = str(context.home)
    command = [str(settings.hermes_bin), *args]
    try:
        process = subprocess.run(
            command,
            cwd="/opt/hermes",
            env=env,
            capture_output=True,
            text=True,
            timeout=timeout or settings.command_timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        return CommandResult(
            command=command,
            exit_code=124,
            stdout=exc.stdout or "",
            stderr=(exc.stderr or "").strip() or f"Hermes command timed out after {exc.timeout} seconds",
            ok=False,
        )
    except OSError as exc:
        return CommandResult(
            command=command,
            exit_code=1,
            stdout="",
            stderr=str(exc),
            ok=False,
        )
    return CommandResult(
        command=command,
        exit_code=process.returncode,
        stdout=process.stdout,
        stderr=process.stderr,
        ok=process.returncode == 0,
    )


def active_profile_name() -> str:
    result = run_hermes_command(["profile", "list"])
    if result.ok:
        for line in result.stdout.splitlines():
            stripped = line.strip()
            if stripped.startswith("◆"):
                row = parse_simple_table_row(stripped.lstrip("◆ "), 1)
                if row:
                    return row[0].split()[0]
                tail = stripped.lstrip("◆ ")
                return tail.split()[0]
    return "default"


def profile_contexts() -> list[HermesContext]:
    contexts = [HermesContext(profile="default")]
    profiles_dir = settings.hermes_home / settings.profiles_dir_name
    if profiles_dir.exists():
        for child in sorted(profiles_dir.iterdir()):
            if child.is_dir() and validate_profile_name(child.name):
                contexts.append(HermesContext(profile=child.name))
    return contexts


def profile_summary(context: HermesContext, *, active_profile: str) -> ProfileSummary:
    config = load_yaml_file(context.home / "config.yaml")
    gateway_state = None
    gateway_json = load_json_file(context.home / "gateway_state.json")
    if isinstance(gateway_json, dict):
        gateway_state = gateway_json.get("gateway_state") or gateway_json.get("status")
    skill_count = len(list((context.home / "skills").glob("**/SKILL.md"))) if (context.home / "skills").exists() else 0
    model_cfg = config.get("model") if isinstance(config.get("model"), dict) else {}
    return ProfileSummary(
        name=context.profile,
        path=str(context.home),
        is_active=context.profile == active_profile,
        exists=context.home.exists(),
        model=model_cfg.get("default"),
        provider=model_cfg.get("provider"),
        gateway_state=gateway_state,
        has_env_file=(context.home / ".env").exists(),
        has_soul_file=(context.home / "SOUL.md").exists(),
        skill_count=skill_count,
    )


def create_profile(profile_name: str, clone: bool, clone_all: bool, clone_from: str | None, no_alias: bool) -> CommandResult:
    if not validate_profile_name(profile_name):
        raise HTTPException(status_code=400, detail="Invalid profile name")
    args = ["profile", "create", profile_name]
    if clone:
        args.append("--clone")
    if clone_all:
        args.append("--clone-all")
    if clone_from:
        if not validate_profile_name(clone_from) and clone_from != "default":
            raise HTTPException(status_code=400, detail="Invalid source profile name")
        args.extend(["--clone-from", clone_from])
    if no_alias:
        args.append("--no-alias")
    result = run_hermes_command(args)
    if not result.ok:
        raise HTTPException(status_code=400, detail=result.stderr.strip() or result.stdout.strip() or "Profile creation failed")
    return result


def list_sessions(profile: str = "default") -> list[SessionSummary]:
    result = run_hermes_command(["sessions", "list"], profile=profile)
    if not result.ok:
        raise HTTPException(status_code=500, detail=result.stderr.strip() or "Failed to list sessions")
    sessions: list[SessionSummary] = []
    for line in result.stdout.splitlines():
        if not line.strip() or line.startswith("Title") or set(line.strip()) <= {"─", "-"}:
            continue
        parts = parse_simple_table_row(line, 4)
        if len(parts) >= 4:
            title, preview, last_active, session_id = parts[0], parts[1], parts[2], parts[3]
            sessions.append(SessionSummary(id=session_id, title=None if title == "—" else title, preview=preview, last_active=last_active))
    return sessions


def list_skills(profile: str = "default") -> list[SkillSummary]:
    context = ensure_profile_exists(profile)
    result = run_hermes_command(["skills", "list"], profile=profile)
    if not result.ok:
        raise HTTPException(status_code=500, detail=result.stderr.strip() or "Failed to list skills")
    skills: list[SkillSummary] = []
    for line in result.stdout.splitlines():
        parts = parse_simple_table_row(line, 4)
        if len(parts) < 4 or parts[0] in {"Name", "Installed Skills"}:
            continue
        name, category, source, trust = parts[:4]
        skill_path = next(context.home.glob(f"skills/**/{name}/SKILL.md"), None)
        skills.append(
            SkillSummary(
                name=name,
                category=category or None,
                source=source or None,
                trust=trust or None,
                enabled=skill_path is not None,
                path=str(skill_path.parent) if skill_path else None,
            )
        )
    return skills


def broadcast_skill_configuration(source_profile: str, target_profiles: list[str], include_snapshot: bool, include_skills_dir: bool, dry_run: bool) -> dict[str, list[str]]:
    source = ensure_profile_exists(source_profile)
    copied: dict[str, list[str]] = {}
    for target_profile in target_profiles:
        target = ensure_profile_exists(target_profile)
        if target.profile == source.profile:
            copied[target.profile] = []
            continue
        actions: list[str] = []
        if include_snapshot:
            source_snapshot = source.home / settings.skills_snapshot_name
            target_snapshot = target.home / settings.skills_snapshot_name
            if source_snapshot.exists():
                actions.append(str(target_snapshot))
                if not dry_run:
                    shutil.copy2(source_snapshot, target_snapshot)
        if include_skills_dir:
            source_skills = source.home / "skills"
            target_skills = target.home / "skills"
            if source_skills.exists():
                actions.append(str(target_skills))
                if not dry_run:
                    shutil.copytree(source_skills, target_skills, dirs_exist_ok=True)
        copied[target.profile] = actions
    return copied


def list_cron_jobs(profile: str = "default") -> list[CronJobSummary]:
    context = ensure_profile_exists(profile)
    jobs_file = context.home / settings.cron_dir_name / "jobs.json"
    payload = load_json_file(jobs_file) or {}
    jobs = payload.get("jobs", []) if isinstance(payload, dict) else []
    items: list[CronJobSummary] = []
    for job in jobs:
        schedule = job.get("schedule_display")
        if not schedule and isinstance(job.get("schedule"), dict):
            schedule = job["schedule"].get("display") or job["schedule"].get("expr")
        items.append(
            CronJobSummary(
                id=job.get("id", "unknown"),
                name=job.get("name"),
                schedule=schedule,
                enabled=bool(job.get("enabled", False)),
                state=job.get("state"),
                next_run_at=job.get("next_run_at"),
                last_run_at=job.get("last_run_at"),
                last_status=job.get("last_status"),
                deliver=job.get("deliver"),
            )
        )
    return items


def log_payload(profile: str = "default", log_name: str = "agent", lines: int = 100) -> dict[str, Any]:
    context = ensure_profile_exists(profile)
    path = context.home / settings.logs_dir_name / f"{log_name}.log"
    return {
        "log_name": log_name,
        "path": str(path),
        "lines": tail_lines(path, limit=lines),
        "total_lines_returned": min(lines, len(tail_lines(path, limit=lines))),
    }


def config_summary(profile: str = "default") -> dict[str, Any]:
    context = ensure_profile_exists(profile)
    config_path = context.home / "config.yaml"
    config = load_yaml_file(config_path)
    return {
        "profile": profile,
        "path": str(config_path),
        "keys": sorted(config.keys()),
        "summary": summarize_config(config),
    }


def status_payload() -> dict[str, Any]:
    active = active_profile_name()
    status = run_hermes_command(["status"])
    profiles = [profile_summary(context, active_profile=active) for context in profile_contexts()]
    try:
        sessions = list_sessions(active)
    except HTTPException:
        sessions = []
    try:
        cron_jobs = list_cron_jobs(active)
    except HTTPException:
        cron_jobs = []
    gateway_state = next((profile.gateway_state for profile in profiles if profile.name == active), None)
    raw_status = status.stdout or status.stderr
    return {
        "ok": status.ok,
        "active_profile": active,
        "profile_count": len(profiles),
        "session_count": len(sessions),
        "cron_job_count": len(cron_jobs),
        "gateway_state": gateway_state,
        "status_excerpt": [line for line in raw_status.splitlines() if line.strip()][:12],
        "raw_status": raw_status,
    }
