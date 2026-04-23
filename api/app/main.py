from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.settings import settings
from app.models import (
    ConfigSummary,
    CreateProfileRequest,
    HealthResponse,
    LogEntry,
    SkillBroadcastRequest,
    SkillBroadcastResult,
    SkillsResponse,
    StatusResponse,
)
from app.services.hermes_adapter import (
    active_profile_name,
    broadcast_skill_configuration,
    config_summary,
    create_profile,
    list_cron_jobs,
    list_sessions,
    list_skills,
    log_payload,
    profile_contexts,
    profile_summary,
    status_payload,
)

app = FastAPI(title=settings.app_name, version="0.1.0")

# ── API routes ────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse, tags=["system"])
def get_health() -> HealthResponse:
    return HealthResponse(
        ok=True,
        service=settings.app_name,
        hermes_home=str(settings.hermes_home),
        hermes_bin=str(settings.hermes_bin),
        hermes_bin_exists=settings.hermes_bin.exists(),
    )


@app.get("/api/status", response_model=StatusResponse, tags=["system"])
def get_status() -> StatusResponse:
    return StatusResponse(**status_payload())


@app.get("/api/profiles", tags=["profiles"])
def get_profiles() -> dict:
    active = active_profile_name()
    profiles = [profile_summary(context, active_profile=active).model_dump() for context in profile_contexts()]
    return {"profiles": profiles, "active_profile": active}


@app.post("/api/profiles", tags=["profiles"])
def post_profiles(payload: CreateProfileRequest) -> dict:
    result = create_profile(
        profile_name=payload.profile_name,
        clone=payload.clone,
        clone_all=payload.clone_all,
        clone_from=payload.clone_from,
        no_alias=payload.no_alias,
    )
    return {"ok": True, "stdout": result.stdout, "stderr": result.stderr}


@app.get("/api/sessions", tags=["sessions"])
def get_sessions(profile: str = Query("default")) -> dict:
    return {"profile": profile, "sessions": [item.model_dump() for item in list_sessions(profile)]}


@app.get("/api/skills", response_model=SkillsResponse, tags=["skills"])
def get_skills(profile: str = Query("default")) -> SkillsResponse:
    skills = list_skills(profile)
    return SkillsResponse(profile=profile, total=len(skills), skills=skills)


@app.post("/api/skills/broadcast", response_model=SkillBroadcastResult, tags=["skills"])
def post_skill_broadcast(payload: SkillBroadcastRequest) -> SkillBroadcastResult:
    copied = broadcast_skill_configuration(
        source_profile=payload.source_profile,
        target_profiles=payload.target_profiles,
        include_snapshot=payload.include_snapshot,
        include_skills_dir=payload.include_skills_dir,
        dry_run=payload.dry_run,
    )
    return SkillBroadcastResult(
        source_profile=payload.source_profile,
        target_profiles=payload.target_profiles,
        dry_run=payload.dry_run,
        copied_files=copied,
    )


@app.get("/api/cron/jobs", tags=["cron"])
def get_cron_jobs(profile: str = Query("default")) -> dict:
    jobs = list_cron_jobs(profile)
    return {"profile": profile, "jobs": [job.model_dump() for job in jobs], "total": len(jobs)}


@app.get("/api/logs", response_model=LogEntry, tags=["logs"])
def get_logs(
    profile: str = Query("default"),
    log_name: str = Query("agent"),
    lines: int = Query(100, ge=1, le=500),
) -> LogEntry:
    return LogEntry(**log_payload(profile=profile, log_name=log_name, lines=lines))


@app.get("/api/config/summary", response_model=ConfigSummary, tags=["config"])
def get_config_summary(profile: str = Query("default")) -> ConfigSummary:
    return ConfigSummary(**config_summary(profile))


# ── Frontend static files (SPA catch-all) ────────────────────────────────

STATIC_DIR = Path(os.environ.get("STATIC_DIR", "/app/static"))

# Mount static assets (js, css, images)
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="static-assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        """Catch-all: serve index.html for SPA routing."""
        return FileResponse(STATIC_DIR / "index.html")
