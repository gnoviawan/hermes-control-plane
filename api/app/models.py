from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    ok: bool
    service: str
    hermes_home: str
    hermes_bin: str
    hermes_bin_exists: bool


class CommandResult(BaseModel):
    command: list[str]
    exit_code: int
    stdout: str
    stderr: str = ""
    ok: bool


class ProfileSummary(BaseModel):
    name: str
    path: str
    is_active: bool = False
    exists: bool = True
    model: str | None = None
    provider: str | None = None
    gateway_state: str | None = None
    has_env_file: bool = False
    has_soul_file: bool = False
    skill_count: int = 0


class CreateProfileRequest(BaseModel):
    profile_name: str
    clone: bool = False
    clone_all: bool = False
    clone_from: str | None = None
    no_alias: bool = False


class SessionSummary(BaseModel):
    id: str
    title: str | None = None
    preview: str | None = None
    last_active: str | None = None


class SkillSummary(BaseModel):
    name: str
    category: str | None = None
    source: str | None = None
    trust: str | None = None
    enabled: bool = True
    path: str | None = None


class SkillsResponse(BaseModel):
    profile: str
    total: int
    skills: list[SkillSummary]


class SkillBroadcastRequest(BaseModel):
    source_profile: str = Field(..., description="Profile to copy from")
    target_profiles: list[str] = Field(..., min_length=1)
    include_snapshot: bool = True
    include_skills_dir: bool = True
    dry_run: bool = False


class SkillBroadcastResult(BaseModel):
    source_profile: str
    target_profiles: list[str]
    dry_run: bool
    copied_files: dict[str, list[str]]


class CronJobSummary(BaseModel):
    id: str
    name: str | None = None
    schedule: str | None = None
    enabled: bool = True
    state: str | None = None
    next_run_at: str | None = None
    last_run_at: str | None = None
    last_status: str | None = None
    deliver: str | None = None


class LogEntry(BaseModel):
    log_name: str
    path: str
    lines: list[str]
    total_lines_returned: int


class ConfigSummary(BaseModel):
    profile: str
    path: str
    keys: list[str]
    summary: dict[str, Any]


class StatusResponse(BaseModel):
    ok: bool
    active_profile: str
    profile_count: int
    session_count: int
    cron_job_count: int
    gateway_state: str | None = None
    status_excerpt: list[str]
    raw_status: str


class ErrorResponse(BaseModel):
    detail: str


class ApiEnvelope(BaseModel):
    data: Any
    meta: dict[str, Any] | None = None
