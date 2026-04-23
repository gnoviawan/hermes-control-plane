from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.core.settings import settings
from app.models import (
    AgentDefaults,
    AgentFiles,
    AgentRuntimeCollection,
    AgentRuntimeHints,
    AgentRuntimeSummary,
    AgentsResponse,
    AgentSummary,
    ConfigSummary,
    CreateProfileRequest,
    HealthResponse,
    LogEntry,
    RunCreateRequest,
    RunSummary,
    RunsResponse,
    SkillBroadcastRequest,
    SkillBroadcastResult,
    SkillsResponse,
    StatusResponse,
    SystemHealthResponse,
    SystemVersionResponse,
)
from app.services.hermes_adapter import (
    active_profile_name,
    broadcast_skill_configuration,
    config_summary,
    create_profile,
    ensure_profile_exists,
    list_cron_jobs,
    list_sessions,
    list_skills,
    log_payload,
    profile_contexts,
    profile_summary,
    status_payload,
)
from app.services.run_service import run_service
from app.services.runtime_registry import runtime_registry

app = FastAPI(title=settings.app_name, version=settings.app_version)


def adapter_descriptor() -> dict[str, str | bool]:
    return {
        'kind': 'hermes-dashboard-api',
        'hermes_home': str(settings.hermes_home),
        'hermes_bin': str(settings.hermes_bin),
        'hermes_bin_exists': settings.hermes_bin.exists(),
    }


def agent_contract(summary: AgentSummary | object) -> AgentSummary:
    if isinstance(summary, AgentSummary):
        return summary
    if not hasattr(summary, 'name'):
        raise TypeError('Expected profile summary-like object')
    return AgentSummary(
        id=summary.name,
        name=summary.name,
        path=summary.path,
        is_active=summary.is_active,
        exists=summary.exists,
        defaults=AgentDefaults(model=summary.model, provider=summary.provider),
        files=AgentFiles(has_env_file=summary.has_env_file, has_soul_file=summary.has_soul_file),
        runtime_hints=AgentRuntimeHints(gateway_state=summary.gateway_state, skill_count=summary.skill_count),
    )


@app.get('/api/health', response_model=HealthResponse, tags=['system'])
def get_health() -> HealthResponse:
    return HealthResponse(
        ok=True,
        service=settings.app_name,
        hermes_home=str(settings.hermes_home),
        hermes_bin=str(settings.hermes_bin),
        hermes_bin_exists=settings.hermes_bin.exists(),
    )


@app.get('/api/system/health', response_model=SystemHealthResponse, tags=['system'])
def get_system_health() -> SystemHealthResponse:
    return SystemHealthResponse(
        status='ok',
        service=settings.app_name,
        api_version=settings.dashboard_api_version,
        app_version=settings.app_version,
        adapter=adapter_descriptor(),
    )


@app.get('/api/system/version', response_model=SystemVersionResponse, tags=['system'])
def get_system_version() -> SystemVersionResponse:
    return SystemVersionResponse(
        service=settings.app_name,
        api_version=settings.dashboard_api_version,
        app_version=settings.app_version,
    )


@app.get('/api/status', response_model=StatusResponse, tags=['system'])
def get_status() -> StatusResponse:
    return StatusResponse(**status_payload())


@app.get('/api/agents', response_model=AgentsResponse, tags=['agents'])
def get_agents() -> AgentsResponse:
    active = active_profile_name()
    agents = [agent_contract(profile_summary(context, active_profile=active)) for context in profile_contexts()]
    return AgentsResponse(agents=agents, active_agent_id=active, total=len(agents))


@app.get('/api/agents/runtimes', response_model=AgentRuntimeCollection, tags=['agents'])
def get_agent_runtimes() -> AgentRuntimeCollection:
    runtimes = runtime_registry.list_runtimes()
    return AgentRuntimeCollection(runtimes=runtimes, total=len(runtimes))


@app.post('/api/agents/{agent_id}/runs', response_model=RunSummary, status_code=201, tags=['runs'])
def create_run(agent_id: str, payload: RunCreateRequest) -> RunSummary:
    ensure_profile_exists(agent_id)
    return run_service.create_run(agent_id, payload)


@app.get('/api/agents/{agent_id}/runs', response_model=RunsResponse, tags=['runs'])
def list_runs(agent_id: str) -> RunsResponse:
    ensure_profile_exists(agent_id)
    runs = run_service.list_runs(agent_id)
    return RunsResponse(runs=runs, total=len(runs))


@app.get('/api/agents/{agent_id}/runs/{run_id}', response_model=RunSummary, tags=['runs'])
def get_run(agent_id: str, run_id: str) -> RunSummary:
    ensure_profile_exists(agent_id)
    return run_service.get_run(agent_id, run_id)


@app.post('/api/agents/{agent_id}/runs/{run_id}/stop', response_model=RunSummary, tags=['runs'])
def stop_run(agent_id: str, run_id: str) -> RunSummary:
    ensure_profile_exists(agent_id)
    return run_service.stop_run(agent_id, run_id)


@app.get('/api/agents/{agent_id}/runs/{run_id}/stream', tags=['runs'])
def stream_run(agent_id: str, run_id: str) -> StreamingResponse:
    ensure_profile_exists(agent_id)
    return StreamingResponse(iter([run_service.event_stream_payload(agent_id, run_id)]), media_type='text/event-stream')


@app.get('/api/agents/{agent_id}/runs/{run_id}/events', tags=['runs'])
def get_run_events(agent_id: str, run_id: str) -> StreamingResponse:
    ensure_profile_exists(agent_id)
    return StreamingResponse(iter([run_service.event_stream_payload(agent_id, run_id)]), media_type='text/event-stream')


@app.get('/api/agents/{agent_id}/runtime', response_model=AgentRuntimeSummary, tags=['agents'])
def get_agent_runtime(agent_id: str) -> AgentRuntimeSummary:
    return runtime_registry.get_runtime(agent_id)


@app.get('/api/agents/{agent_id}', response_model=AgentSummary, tags=['agents'])
def get_agent(agent_id: str) -> AgentSummary:
    active = active_profile_name()
    context = ensure_profile_exists(agent_id)
    return agent_contract(profile_summary(context, active_profile=active))


@app.get('/api/profiles', tags=['profiles'])
def get_profiles() -> dict:
    active = active_profile_name()
    profiles = [profile_summary(context, active_profile=active).model_dump() for context in profile_contexts()]
    return {'profiles': profiles, 'active_profile': active}


@app.post('/api/profiles', tags=['profiles'])
def post_profiles(payload: CreateProfileRequest) -> dict:
    result = create_profile(
        profile_name=payload.profile_name,
        clone=payload.clone,
        clone_all=payload.clone_all,
        clone_from=payload.clone_from,
        no_alias=payload.no_alias,
    )
    return {'ok': True, 'stdout': result.stdout, 'stderr': result.stderr}


@app.get('/api/sessions', tags=['sessions'])
def get_sessions(profile: str = Query('default')) -> dict:
    return {'profile': profile, 'sessions': [item.model_dump() for item in list_sessions(profile)]}


@app.get('/api/skills', response_model=SkillsResponse, tags=['skills'])
def get_skills(profile: str = Query('default')) -> SkillsResponse:
    skills = list_skills(profile)
    return SkillsResponse(profile=profile, total=len(skills), skills=skills)


@app.post('/api/skills/broadcast', response_model=SkillBroadcastResult, tags=['skills'])
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


@app.get('/api/cron/jobs', tags=['cron'])
def get_cron_jobs(profile: str = Query('default')) -> dict:
    jobs = list_cron_jobs(profile)
    return {'profile': profile, 'jobs': [job.model_dump() for job in jobs], 'total': len(jobs)}


@app.get('/api/logs', response_model=LogEntry, tags=['logs'])
def get_logs(
    profile: str = Query('default'),
    log_name: str = Query('agent'),
    lines: int = Query(100, ge=1, le=500),
) -> LogEntry:
    return LogEntry(**log_payload(profile=profile, log_name=log_name, lines=lines))


@app.get('/api/config/summary', response_model=ConfigSummary, tags=['config'])
def get_config_summary(profile: str = Query('default')) -> ConfigSummary:
    return ConfigSummary(**config_summary(profile))


STATIC_DIR = Path(os.environ.get('STATIC_DIR', '/app/static'))

if STATIC_DIR.is_dir():
    app.mount('/assets', StaticFiles(directory=STATIC_DIR / 'assets'), name='static-assets')

    @app.get('/{full_path:path}')
    def serve_spa(full_path: str):
        return FileResponse(STATIC_DIR / 'index.html')
