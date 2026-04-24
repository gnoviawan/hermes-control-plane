from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    ok: bool
    service: str
    hermes_home: str
    hermes_bin: str
    hermes_bin_exists: bool


class AdapterDescriptor(BaseModel):
    kind: str
    hermes_home: str
    hermes_bin: str
    hermes_bin_exists: bool


class SystemHealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    api_version: str
    app_version: str
    adapter: AdapterDescriptor


class SystemVersionResponse(BaseModel):
    service: str
    api_version: str
    app_version: str


class AgentDefaults(BaseModel):
    model: str | None = None
    provider: str | None = None


class AgentFiles(BaseModel):
    has_env_file: bool = False
    has_soul_file: bool = False


class AgentRuntimeHints(BaseModel):
    gateway_state: str | None = None
    skill_count: int = 0


class AgentSummary(BaseModel):
    id: str
    name: str
    path: str
    is_active: bool = False
    exists: bool = True
    defaults: AgentDefaults
    files: AgentFiles
    runtime_hints: AgentRuntimeHints


class AgentsResponse(BaseModel):
    agents: list[AgentSummary]
    active_agent_id: str
    total: int


class AgentRuntimeSummary(BaseModel):
    agent_id: str
    status: Literal["active", "idle", "degraded", "missing"]
    active_run_count: int = 0
    active_session_count: int = 0
    active_session_id: str | None = None
    effective_provider: str | None = None
    effective_model: str | None = None
    mcp_status: str | None = None
    gateway_status: str | None = None
    last_activity_at: str | None = None


class AgentRuntimeCollection(BaseModel):
    runtimes: list[AgentRuntimeSummary]
    total: int


class RunCreateRequest(BaseModel):
    session_id: str | None = None
    input: str


class RunSummary(BaseModel):
    id: str
    agent_id: str
    session_id: str | None = None
    status: Literal['queued', 'running', 'completed', 'failed', 'stopped']
    started_at: str
    ended_at: str | None = None
    current_model: str | None = None
    current_provider: str | None = None
    summary: str | None = None
    stream_url: str
    events_url: str


class RunsResponse(BaseModel):
    runs: list[RunSummary]
    total: int


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


class SessionListItem(BaseModel):
    id: str
    title: str
    status: Literal['running', 'queued', 'complete', 'failed'] = 'complete'
    started_at: str | None = None
    updated_at: str | None = None
    source: str
    searchable_excerpt: str | None = None
    message_count: int = 0


class SessionMessage(BaseModel):
    role: str
    content: str


class SessionDetail(BaseModel):
    id: str
    agent_id: str
    title: str
    started_at: str | None = None
    updated_at: str | None = None
    source: str
    searchable_excerpt: str | None = None
    message_count: int = 0
    messages: list[SessionMessage]


class AgentSessionsResponse(BaseModel):
    agent_id: str
    sessions: list[SessionListItem]
    total: int


class SessionSearchResponse(BaseModel):
    agent_id: str
    query: str
    sessions: list[SessionListItem]
    total: int


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


class RuntimeToggles(BaseModel):
    checkpoints_enabled: bool = False
    worktree_enabled: bool = False


class AgentConfigResponse(BaseModel):
    agent_id: str
    path: str
    effective_config: dict[str, Any]
    profile_overrides: dict[str, Any]
    runtime_toggles: RuntimeToggles
    editable_fields: list[str]
    deferred_fields: list[str]
    write_restrictions: list[str]


class AgentConfigPatchRequest(BaseModel):
    model: dict[str, Any] | None = None
    display: dict[str, Any] | None = None
    runtime: dict[str, Any] | None = None


class AgentConfigReloadResponse(BaseModel):
    agent_id: str
    path: str
    reloaded: bool
    message: str


class ProviderCatalogItem(BaseModel):
    name: str
    config: dict[str, Any]
    has_credentials: bool = False
    source: str = 'config'


class ProviderCatalogResponse(BaseModel):
    providers: list[ProviderCatalogItem]
    total: int


class ModelCatalogItem(BaseModel):
    id: str
    provider: str
    source: str = 'config'


class ModelCatalogResponse(BaseModel):
    models: list[ModelCatalogItem]
    total: int
    default_model: str | None = None
    default_provider: str | None = None


class ProviderRoutingResponse(BaseModel):
    default_provider: str | None = None
    default_model: str | None = None
    fallback_providers: list[str]
    effective_provider_count: int = 0
    write_restrictions: list[str]


class ProviderRoutingPatchRequest(BaseModel):
    default_provider: str | None = None
    default_model: str | None = None
    fallback_providers: list[str] | None = None


class ToolsetInfo(BaseModel):
    name: str
    source: str
    enabled: bool = True
    tool_count: int = 0


class ToolsetResponse(BaseModel):
    agent_id: str
    toolsets: list[ToolsetInfo]
    total: int


class ToolsetPatchRequest(BaseModel):
    toolsets: list[str]


class ToolInfo(BaseModel):
    name: str
    toolset: str
    source_type: str
    source_id: str | None = None
    available: bool = True
    availability_reason: str | None = None
    schema_summary: dict[str, Any] = Field(default_factory=dict)


class ToolCatalogResponse(BaseModel):
    agent_id: str
    tools: list[ToolInfo]
    total: int


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
