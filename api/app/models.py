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


class AgentSkill(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    source: str | None = None
    installed: bool = True
    enabled: bool = True
    updated_at: str | None = None


class AgentSkillsResponse(BaseModel):
    agent_id: str
    skills: list[AgentSkill]
    total: int


class AgentSkillPatchRequest(BaseModel):
    enabled: bool | None = None


class AgentSkillRunResponse(BaseModel):
    agent_id: str
    skill_name: str
    status: str
    requested_at: str
    message: str


class SystemSkillLibraryItem(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    source: str | None = None
    installed_profiles: list[str] = Field(default_factory=list)
    profile_count: int
    updated_at: str | None = None


class SystemSkillsLibraryResponse(BaseModel):
    skills: list[SystemSkillLibraryItem]
    total: int


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


class McpServerInfo(BaseModel):
    id: str
    name: str
    transport: str
    enabled: bool = True
    connection_state: str = 'configured'
    auth_state: str = 'none'
    discovered_tools_count: int = 0
    last_reload_at: str | None = None
    sampling_enabled: bool = True
    profiles: list[str] = Field(default_factory=list)


class AgentMcpServersResponse(BaseModel):
    agent_id: str
    servers: list[McpServerInfo]
    total: int


class SystemMcpServersResponse(BaseModel):
    servers: list[McpServerInfo]
    total: int


class McpReloadResponse(BaseModel):
    agent_id: str
    reloaded: bool
    server_count: int
    message: str


class MemoryEntry(BaseModel):
    id: str
    scope: Literal['memory', 'user']
    content: str
    updated_at: str


class AgentMemoryResponse(BaseModel):
    agent_id: str
    entries: list[MemoryEntry]
    total: int


class MemoryEntryCreateRequest(BaseModel):
    scope: Literal['memory', 'user']
    content: str


class MemoryEntryPatchRequest(BaseModel):
    id: str
    content: str


class MemoryEntryDeleteRequest(BaseModel):
    id: str


class MemoryDeleteResponse(BaseModel):
    agent_id: str
    id: str
    deleted: bool


class MemoryProviderStatus(BaseModel):
    name: str
    status: str
    source: str | None = None
    entry_count: int = 0


class AgentMemoryProvidersResponse(BaseModel):
    agent_id: str
    providers: list[MemoryProviderStatus]
    total: int


class SystemMemoryProfileSummary(BaseModel):
    agent_id: str
    total_entries: int
    memory_entries: int
    user_entries: int


class SystemMemorySummaryResponse(BaseModel):
    profiles: list[SystemMemoryProfileSummary]
    total_profiles: int
    total_entries: int


class WorkspaceTreeEntry(BaseModel):
    name: str
    path: str
    type: Literal['file', 'directory']
    size_bytes: int | None = None


class AgentWorkspaceTreeResponse(BaseModel):
    agent_id: str
    root_path: str
    entries: list[WorkspaceTreeEntry]
    total: int


class WorkspaceFileResponse(BaseModel):
    agent_id: str
    path: str
    content: str
    size_bytes: int


class WorkspaceArtifact(BaseModel):
    name: str
    path: str
    kind: Literal['file', 'directory']
    size_bytes: int | None = None


class AgentWorkspaceArtifactsResponse(BaseModel):
    agent_id: str
    artifacts: list[WorkspaceArtifact]
    total: int


class CheckpointInfo(BaseModel):
    id: str
    path: str
    status: str


class AgentCheckpointsResponse(BaseModel):
    agent_id: str
    checkpoints: list[CheckpointInfo]
    total: int


class CheckpointRestoreResponse(BaseModel):
    agent_id: str
    checkpoint_id: str
    restored: bool
    message: str


class ApprovalRequest(BaseModel):
    id: str
    agent_id: str
    run_id: str | None = None
    session_id: str | None = None
    command_or_action: str
    severity: str
    reason: str | None = None
    created_at: str | None = None
    expires_at: str | None = None
    state: str = 'pending'


class ApprovalQueueResponse(BaseModel):
    agent_id: str
    approvals: list[ApprovalRequest]
    total: int


class AgentSecurityResponse(BaseModel):
    agent_id: str
    approval_policy: str
    allow_yolo: bool = False
    dangerous_commands: list[str]
    allowlists: dict[str, Any] = Field(default_factory=dict)
    write_restrictions: list[str] = Field(default_factory=list)


class AgentSecurityPatchRequest(BaseModel):
    approval_policy: str | None = None
    allow_yolo: bool | None = None
    dangerous_commands: list[str] | None = None
    allowlists: dict[str, Any] | None = None


class SystemSecurityResponse(BaseModel):
    profiles: list[str]
    approval_policies: list[str]
    yolo_enabled_profiles: list[str] = Field(default_factory=list)
    write_restrictions: list[str] = Field(default_factory=list)


class SystemAllowlistsResponse(BaseModel):
    commands: list[str] = Field(default_factory=list)
    paths: list[str] = Field(default_factory=list)
    hosts: list[str] = Field(default_factory=list)
    profiles: list[str] = Field(default_factory=list)


class AgentCronJob(BaseModel):
    id: str
    agent_id: str
    name: str
    prompt_preview: str | None = None
    skills: list[str] = Field(default_factory=list)
    schedule: str
    next_run_at: str | None = None
    last_run_at: str | None = None
    status: str
    last_status: str | None = None
    deliver_target: str | None = None


class AgentCronJobsResponse(BaseModel):
    agent_id: str
    jobs: list[AgentCronJob]
    total: int


class AgentCronJobCreateRequest(BaseModel):
    name: str
    prompt: str | None = None
    skills: list[str] = Field(default_factory=list)
    schedule: str
    deliver_target: str | None = None


class AgentCronJobPatchRequest(BaseModel):
    name: str | None = None
    prompt: str | None = None
    skills: list[str] | None = None
    schedule: str | None = None
    deliver_target: str | None = None
    enabled: bool | None = None


class AgentCronJobDeleteResponse(BaseModel):
    ok: bool
    id: str


class GatewayPlatformInfo(BaseModel):
    name: str
    enabled: bool = True
    status: str = 'configured'
    channel_count: int = 0
    config: dict[str, Any] = Field(default_factory=dict)


class SystemGatewayResponse(BaseModel):
    enabled: bool
    status: str
    default_platform: str | None = None
    platform_count: int = 0
    channel_count: int = 0
    platforms: list[GatewayPlatformInfo] = Field(default_factory=list)
    write_restrictions: list[str] = Field(default_factory=list)


class SystemGatewayPlatformsResponse(BaseModel):
    platforms: list[GatewayPlatformInfo] = Field(default_factory=list)
    total: int = 0


class SystemGatewayPatchRequest(BaseModel):
    enabled: bool | None = None
    default_platform: str | None = None
    platforms: dict[str, dict[str, Any]] | None = None


class GatewayLifecycleResponse(BaseModel):
    status: str
    started: bool = False
    stopped: bool = False
    message: str


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
