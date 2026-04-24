from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.core.settings import settings
from app.models import (
    AgentConfigPatchRequest,
    AgentConfigReloadResponse,
    AgentConfigResponse,
    AgentCronJob,
    AgentCronJobCreateRequest,
    AgentCronJobDeleteResponse,
    AgentCronJobPatchRequest,
    AgentCronJobsResponse,
    AgentDefaults,
    AgentFiles,
    AgentMemoryProvidersResponse,
    AgentMemoryResponse,
    AgentMcpServersResponse,
    AgentRuntimeCollection,
    AgentRuntimeHints,
    AgentRuntimeSummary,
    AgentSecurityPatchRequest,
    AgentSecurityResponse,
    AgentsResponse,
    AgentSkill,
    AgentSkillPatchRequest,
    AgentSkillRunResponse,
    AgentSkillsResponse,
    AgentSessionsResponse,
    AgentSummary,
    AgentCheckpointsResponse,
    AgentWorkspaceArtifactsResponse,
    AgentWorkspaceTreeResponse,
    ApprovalQueueResponse,
    CheckpointRestoreResponse,
    ConfigSummary,
    CreateProfileRequest,
    HealthResponse,
    LogEntry,
    McpReloadResponse,
    McpServerInfo,
    MemoryDeleteResponse,
    MemoryEntry,
    MemoryEntryCreateRequest,
    MemoryEntryDeleteRequest,
    MemoryEntryPatchRequest,
    ModelCatalogResponse,
    ProviderCatalogResponse,
    ProviderRoutingPatchRequest,
    ProviderRoutingResponse,
    RunCreateRequest,
    RunSummary,
    RunsResponse,
    SessionDetail,
    SessionSearchResponse,
    SkillBroadcastRequest,
    SkillBroadcastResult,
    SkillsResponse,
    StatusResponse,
    SystemAllowlistsResponse,
    SystemHealthResponse,
    SystemMcpServersResponse,
    SystemMemorySummaryResponse,
    SystemSecurityResponse,
    SystemSkillsLibraryResponse,
    SystemVersionResponse,
    ToolCatalogResponse,
    ToolInfo,
    ToolsetPatchRequest,
    ToolsetResponse,
    WorkspaceFileResponse,
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
from app.services.config_service import config_service
from app.services.cron_service import cron_service
from app.services.mcp_service import mcp_service
from app.services.memory_service import memory_service
from app.services.provider_service import provider_service
from app.services.run_service import run_service
from app.services.runtime_registry import runtime_registry
from app.services.security_service import security_service
from app.services.session_service import session_service
from app.services.skill_service import skill_service
from app.services.tool_service import tool_service
from app.services.workspace_service import workspace_service

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


@app.get('/api/system/providers', response_model=ProviderCatalogResponse, tags=['system'])
def get_system_providers() -> ProviderCatalogResponse:
    return provider_service.list_providers()


@app.get('/api/system/models', response_model=ModelCatalogResponse, tags=['system'])
def get_system_models() -> ModelCatalogResponse:
    return provider_service.list_models()


@app.get('/api/system/provider-routing', response_model=ProviderRoutingResponse, tags=['system'])
def get_system_provider_routing() -> ProviderRoutingResponse:
    return provider_service.get_routing()


@app.patch('/api/system/provider-routing', response_model=ProviderRoutingResponse, tags=['system'])
def patch_system_provider_routing(payload: ProviderRoutingPatchRequest) -> ProviderRoutingResponse:
    return provider_service.patch_routing(payload.model_dump(exclude_none=True))


@app.get('/api/system/toolsets', response_model=ToolsetResponse, tags=['system'])
def get_system_toolsets() -> ToolsetResponse:
    return tool_service.list_system_toolsets()


@app.get('/api/system/tools', response_model=ToolCatalogResponse, tags=['system'])
def get_system_tools() -> ToolCatalogResponse:
    return tool_service.list_system_tools()


@app.get('/api/system/mcp/servers', response_model=SystemMcpServersResponse, tags=['mcp'])
def get_system_mcp_servers() -> SystemMcpServersResponse:
    return mcp_service.list_system_servers()


@app.get('/api/system/memory', response_model=SystemMemorySummaryResponse, tags=['memory'])
def get_system_memory_summary() -> SystemMemorySummaryResponse:
    return memory_service.system_summary()


@app.get('/api/system/security', response_model=SystemSecurityResponse, tags=['system'])
def get_system_security() -> SystemSecurityResponse:
    return security_service.get_system_security()


@app.get('/api/system/allowlists', response_model=SystemAllowlistsResponse, tags=['system'])
def get_system_allowlists() -> SystemAllowlistsResponse:
    return security_service.get_system_allowlists()


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


@app.get('/api/agents/{agent_id}/toolsets', response_model=ToolsetResponse, tags=['tools'])
def list_agent_toolsets(agent_id: str) -> ToolsetResponse:
    ensure_profile_exists(agent_id)
    return tool_service.list_agent_toolsets(agent_id)


@app.patch('/api/agents/{agent_id}/toolsets', response_model=ToolsetResponse, tags=['tools'])
def patch_agent_toolsets(agent_id: str, payload: ToolsetPatchRequest) -> ToolsetResponse:
    ensure_profile_exists(agent_id)
    return tool_service.patch_agent_toolsets(agent_id, payload)


@app.get('/api/agents/{agent_id}/tools', response_model=ToolCatalogResponse, tags=['tools'])
def list_agent_tools(agent_id: str) -> ToolCatalogResponse:
    ensure_profile_exists(agent_id)
    return tool_service.list_agent_tools(agent_id)


@app.get('/api/agents/{agent_id}/mcp/servers', response_model=AgentMcpServersResponse, tags=['mcp'])
def list_agent_mcp_servers(agent_id: str) -> AgentMcpServersResponse:
    ensure_profile_exists(agent_id)
    return mcp_service.list_agent_servers(agent_id)


@app.get('/api/agents/{agent_id}/mcp/tools', response_model=ToolCatalogResponse, tags=['mcp'])
def list_agent_mcp_tools(agent_id: str) -> ToolCatalogResponse:
    ensure_profile_exists(agent_id)
    return mcp_service.list_agent_tools(agent_id)


@app.post('/api/agents/{agent_id}/mcp/reload', response_model=McpReloadResponse, tags=['mcp'])
def reload_agent_mcp_servers(agent_id: str) -> McpReloadResponse:
    ensure_profile_exists(agent_id)
    return mcp_service.reload_agent_servers(agent_id)


@app.post('/api/agents/{agent_id}/mcp/{server_id}/connect', response_model=McpServerInfo, tags=['mcp'])
def connect_agent_mcp_server(agent_id: str, server_id: str) -> McpServerInfo:
    ensure_profile_exists(agent_id)
    return mcp_service.connect_server(agent_id, server_id)


@app.post('/api/agents/{agent_id}/mcp/{server_id}/disconnect', response_model=McpServerInfo, tags=['mcp'])
def disconnect_agent_mcp_server(agent_id: str, server_id: str) -> McpServerInfo:
    ensure_profile_exists(agent_id)
    return mcp_service.disconnect_server(agent_id, server_id)


@app.get('/api/agents/{agent_id}/memory', response_model=AgentMemoryResponse, tags=['memory'])
def list_agent_memory(agent_id: str) -> AgentMemoryResponse:
    ensure_profile_exists(agent_id)
    return memory_service.list_entries(agent_id)


@app.post('/api/agents/{agent_id}/memory', response_model=MemoryEntry, tags=['memory'])
def create_agent_memory(agent_id: str, payload: MemoryEntryCreateRequest) -> MemoryEntry:
    ensure_profile_exists(agent_id)
    return memory_service.create_entry(agent_id, payload)


@app.patch('/api/agents/{agent_id}/memory', response_model=MemoryEntry, tags=['memory'])
def patch_agent_memory(agent_id: str, payload: MemoryEntryPatchRequest) -> MemoryEntry:
    ensure_profile_exists(agent_id)
    return memory_service.patch_entry(agent_id, payload)


@app.delete('/api/agents/{agent_id}/memory', response_model=MemoryDeleteResponse, tags=['memory'])
def delete_agent_memory(agent_id: str, payload: MemoryEntryDeleteRequest) -> MemoryDeleteResponse:
    ensure_profile_exists(agent_id)
    return memory_service.delete_entry(agent_id, payload)


@app.get('/api/agents/{agent_id}/memory/providers', response_model=AgentMemoryProvidersResponse, tags=['memory'])
def list_agent_memory_providers(agent_id: str) -> AgentMemoryProvidersResponse:
    ensure_profile_exists(agent_id)
    return memory_service.list_providers(agent_id)


@app.get('/api/agents/{agent_id}/workspace/tree', response_model=AgentWorkspaceTreeResponse, tags=['workspace'])
def list_agent_workspace_tree(agent_id: str) -> AgentWorkspaceTreeResponse:
    ensure_profile_exists(agent_id)
    return workspace_service.list_tree(agent_id)


@app.get('/api/agents/{agent_id}/workspace/file', response_model=WorkspaceFileResponse, tags=['workspace'])
def get_agent_workspace_file(agent_id: str, path: str = Query(...)) -> WorkspaceFileResponse:
    ensure_profile_exists(agent_id)
    return workspace_service.read_file(agent_id, path)


@app.get('/api/agents/{agent_id}/workspace/artifacts', response_model=AgentWorkspaceArtifactsResponse, tags=['workspace'])
def list_agent_workspace_artifacts(agent_id: str) -> AgentWorkspaceArtifactsResponse:
    ensure_profile_exists(agent_id)
    return workspace_service.list_artifacts(agent_id)


@app.get('/api/agents/{agent_id}/checkpoints', response_model=AgentCheckpointsResponse, tags=['workspace'])
def list_agent_checkpoints(agent_id: str) -> AgentCheckpointsResponse:
    ensure_profile_exists(agent_id)
    return workspace_service.list_checkpoints(agent_id)


@app.post('/api/agents/{agent_id}/checkpoints/{checkpoint_id}/restore', response_model=CheckpointRestoreResponse, tags=['workspace'])
def restore_agent_checkpoint(agent_id: str, checkpoint_id: str) -> CheckpointRestoreResponse:
    ensure_profile_exists(agent_id)
    return workspace_service.restore_checkpoint(agent_id, checkpoint_id)


@app.get('/api/agents/{agent_id}/approvals', response_model=ApprovalQueueResponse, tags=['security'])
def list_agent_approvals(agent_id: str) -> ApprovalQueueResponse:
    ensure_profile_exists(agent_id)
    return security_service.list_approvals(agent_id)


@app.get('/api/agents/{agent_id}/security', response_model=AgentSecurityResponse, tags=['security'])
def get_agent_security(agent_id: str) -> AgentSecurityResponse:
    ensure_profile_exists(agent_id)
    return security_service.get_agent_security(agent_id)


@app.patch('/api/agents/{agent_id}/security', response_model=AgentSecurityResponse, tags=['security'])
def patch_agent_security(agent_id: str, payload: AgentSecurityPatchRequest) -> AgentSecurityResponse:
    ensure_profile_exists(agent_id)
    return security_service.patch_agent_security(agent_id, payload)


@app.get('/api/agents/{agent_id}/sessions/search', response_model=SessionSearchResponse, tags=['sessions'])
def search_agent_sessions(agent_id: str, q: str = Query('')) -> SessionSearchResponse:
    ensure_profile_exists(agent_id)
    return session_service.search_sessions(agent_id, q)


@app.get('/api/agents/{agent_id}/sessions', response_model=AgentSessionsResponse, tags=['sessions'])
def list_agent_sessions(agent_id: str) -> AgentSessionsResponse:
    ensure_profile_exists(agent_id)
    return session_service.list_agent_sessions(agent_id)


@app.get('/api/agents/{agent_id}/sessions/{session_id}', response_model=SessionDetail, tags=['sessions'])
def get_agent_session(agent_id: str, session_id: str) -> SessionDetail:
    ensure_profile_exists(agent_id)
    return session_service.get_session(agent_id, session_id)


@app.get('/api/skills', response_model=SkillsResponse, tags=['skills'])
def get_skills(profile: str = Query('default')) -> SkillsResponse:
    skills = list_skills(profile)
    return SkillsResponse(profile=profile, total=len(skills), skills=skills)


@app.get('/api/agents/{agent_id}/skills', response_model=AgentSkillsResponse, tags=['skills'])
def list_agent_skills(agent_id: str) -> AgentSkillsResponse:
    ensure_profile_exists(agent_id)
    return skill_service.list_agent_skills(agent_id)


@app.get('/api/agents/{agent_id}/skills/{skill_name}', response_model=AgentSkill, tags=['skills'])
def get_agent_skill(agent_id: str, skill_name: str) -> AgentSkill:
    ensure_profile_exists(agent_id)
    return skill_service.get_agent_skill(agent_id, skill_name)


@app.patch('/api/agents/{agent_id}/skills/{skill_name}', response_model=AgentSkill, tags=['skills'])
def patch_agent_skill(agent_id: str, skill_name: str, payload: AgentSkillPatchRequest) -> AgentSkill:
    ensure_profile_exists(agent_id)
    return skill_service.patch_agent_skill(agent_id, skill_name, payload)


@app.post('/api/agents/{agent_id}/skills/{skill_name}/run', response_model=AgentSkillRunResponse, tags=['skills'])
def run_agent_skill(agent_id: str, skill_name: str) -> AgentSkillRunResponse:
    ensure_profile_exists(agent_id)
    return skill_service.run_agent_skill(agent_id, skill_name)


@app.get('/api/system/skills', response_model=SystemSkillsLibraryResponse, tags=['skills'])
def get_system_skills() -> SystemSkillsLibraryResponse:
    return skill_service.list_system_library()


@app.get('/api/system/skills/catalog', response_model=SystemSkillsLibraryResponse, tags=['skills'])
def get_system_skills_catalog() -> SystemSkillsLibraryResponse:
    return skill_service.list_system_library()


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


@app.get('/api/agents/{agent_id}/cron/jobs', response_model=AgentCronJobsResponse, tags=['cron'])
def list_agent_cron_jobs(agent_id: str) -> AgentCronJobsResponse:
    ensure_profile_exists(agent_id)
    return cron_service.list_jobs(agent_id)


@app.post('/api/agents/{agent_id}/cron/jobs', response_model=AgentCronJob, tags=['cron'])
def create_agent_cron_job(agent_id: str, payload: AgentCronJobCreateRequest) -> AgentCronJob:
    ensure_profile_exists(agent_id)
    return cron_service.create_job(agent_id, payload)


@app.get('/api/agents/{agent_id}/cron/jobs/{job_id}', response_model=AgentCronJob, tags=['cron'])
def get_agent_cron_job(agent_id: str, job_id: str) -> AgentCronJob:
    ensure_profile_exists(agent_id)
    return cron_service.get_job(agent_id, job_id)


@app.patch('/api/agents/{agent_id}/cron/jobs/{job_id}', response_model=AgentCronJob, tags=['cron'])
def patch_agent_cron_job(agent_id: str, job_id: str, payload: AgentCronJobPatchRequest) -> AgentCronJob:
    ensure_profile_exists(agent_id)
    return cron_service.patch_job(agent_id, job_id, payload)


@app.delete('/api/agents/{agent_id}/cron/jobs/{job_id}', response_model=AgentCronJobDeleteResponse, tags=['cron'])
def delete_agent_cron_job(agent_id: str, job_id: str) -> AgentCronJobDeleteResponse:
    ensure_profile_exists(agent_id)
    return cron_service.delete_job(agent_id, job_id)


@app.post('/api/agents/{agent_id}/cron/jobs/{job_id}/trigger', response_model=AgentCronJob, tags=['cron'])
def trigger_agent_cron_job(agent_id: str, job_id: str) -> AgentCronJob:
    ensure_profile_exists(agent_id)
    return cron_service.trigger_job(agent_id, job_id)


@app.post('/api/agents/{agent_id}/cron/jobs/{job_id}/pause', response_model=AgentCronJob, tags=['cron'])
def pause_agent_cron_job(agent_id: str, job_id: str) -> AgentCronJob:
    ensure_profile_exists(agent_id)
    return cron_service.pause_job(agent_id, job_id)


@app.post('/api/agents/{agent_id}/cron/jobs/{job_id}/resume', response_model=AgentCronJob, tags=['cron'])
def resume_agent_cron_job(agent_id: str, job_id: str) -> AgentCronJob:
    ensure_profile_exists(agent_id)
    return cron_service.resume_job(agent_id, job_id)


@app.get('/api/logs', response_model=LogEntry, tags=['logs'])
def get_logs(
    profile: str = Query('default'),
    log_name: str = Query('agent'),
    lines: int = Query(100, ge=1, le=500),
) -> LogEntry:
    return LogEntry(**log_payload(profile=profile, log_name=log_name, lines=lines))


@app.get('/api/agents/{agent_id}/config', response_model=AgentConfigResponse, tags=['config'])
def get_agent_config(agent_id: str) -> AgentConfigResponse:
    ensure_profile_exists(agent_id)
    return config_service.get_config(agent_id)


@app.patch('/api/agents/{agent_id}/config', response_model=AgentConfigResponse, tags=['config'])
def patch_agent_config(agent_id: str, payload: AgentConfigPatchRequest) -> AgentConfigResponse:
    ensure_profile_exists(agent_id)
    return config_service.patch_config(agent_id, payload.model_dump(exclude_none=True))


@app.post('/api/agents/{agent_id}/config/reload', response_model=AgentConfigReloadResponse, tags=['config'])
def reload_agent_config(agent_id: str) -> AgentConfigReloadResponse:
    ensure_profile_exists(agent_id)
    return config_service.reload_config(agent_id)


@app.get('/api/config/summary', response_model=ConfigSummary, tags=['config'])
def get_config_summary(profile: str = Query('default')) -> ConfigSummary:
    return ConfigSummary(**config_summary(profile))


STATIC_DIR = Path(os.environ.get('STATIC_DIR', '/app/static'))

if STATIC_DIR.is_dir():
    app.mount('/assets', StaticFiles(directory=STATIC_DIR / 'assets'), name='static-assets')

    @app.get('/{full_path:path}')
    def serve_spa(full_path: str):
        return FileResponse(STATIC_DIR / 'index.html')
