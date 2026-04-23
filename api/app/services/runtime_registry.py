from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from fastapi import HTTPException

from app.models import AgentRuntimeSummary, ProfileSummary, SessionSummary
from app.services.hermes_adapter import HermesContext, active_profile_name, ensure_profile_exists, list_sessions, profile_contexts, profile_summary
from app.utils import load_yaml_file


@dataclass
class RuntimeRegistry:
    contexts_provider: Callable[[], list[HermesContext]] = profile_contexts
    active_profile_provider: Callable[[], str] = active_profile_name
    profile_summary_provider: Callable[[HermesContext, str], ProfileSummary] = profile_summary
    session_reader: Callable[[str], list[SessionSummary]] = list_sessions
    active_run_counter: Callable[[str], int] | None = None
    mcp_status_provider: Callable[[str], str | None] | None = None

    def list_runtimes(self) -> list[AgentRuntimeSummary]:
        return [self.get_runtime(context.profile) for context in self.contexts_provider()]

    def list_runtime_capsules(self) -> dict:
        runtimes = self.list_runtimes()
        return {'runtimes': [runtime.model_dump() for runtime in runtimes], 'total': len(runtimes)}

    def get_runtime(self, agent_id: str) -> AgentRuntimeSummary:
        active_profile = self.active_profile_provider()
        context = next((item for item in self.contexts_provider() if item.profile == agent_id), None)
        if context is None:
            context = ensure_profile_exists(agent_id)
        summary = self.profile_summary_provider(context, active_profile)
        sessions = self.session_reader(agent_id)
        active_run_count = self._active_run_count(agent_id)
        last_activity = self._last_activity_at(sessions)
        latest_session_id = self._latest_session_id(sessions, last_activity)
        return AgentRuntimeSummary(
            agent_id=agent_id,
            status=self._status_for(summary=summary, session_count=len(sessions), active_run_count=active_run_count),
            active_run_count=active_run_count,
            active_session_count=len(sessions),
            active_session_id=latest_session_id,
            effective_provider=summary.provider,
            effective_model=summary.model,
            mcp_status=self._mcp_status(agent_id, context),
            gateway_status=summary.gateway_state,
            last_activity_at=last_activity,
        )

    def get_runtime_capsule(self, agent_id: str) -> dict:
        return self.get_runtime(agent_id).model_dump()

    def _active_run_count(self, agent_id: str) -> int:
        if self.active_run_counter is None:
            return 0
        return max(self.active_run_counter(agent_id), 0)

    def _mcp_status(self, agent_id: str, context: HermesContext) -> str | None:
        if self.mcp_status_provider is not None:
            return self.mcp_status_provider(agent_id)
        config = load_yaml_file(context.home / 'config.yaml')
        servers = config.get('mcp_servers') or config.get('mcpServers')
        if isinstance(servers, dict) and servers:
            return 'configured'
        return 'idle'

    @staticmethod
    def _last_activity_at(sessions: list[SessionSummary]) -> str | None:
        timestamps = [session.last_active for session in sessions if session.last_active]
        return max(timestamps) if timestamps else None

    @staticmethod
    def _latest_session_id(sessions: list[SessionSummary], last_activity: str | None) -> str | None:
        if not last_activity:
            return None
        for session in sessions:
            if session.last_active == last_activity:
                return session.id
        return None

    @staticmethod
    def _status_for(*, summary: ProfileSummary, session_count: int, active_run_count: int) -> str:
        if not summary.exists:
            return 'missing'
        if active_run_count > 0 or session_count > 0 or summary.is_active:
            return 'active'
        if summary.gateway_state == 'online':
            return 'active'
        if summary.gateway_state in {'offline', 'error'}:
            return 'idle'
        return 'degraded'


registry = RuntimeRegistry()
runtime_registry = registry


def list_runtime_capsules() -> dict:
    return registry.list_runtime_capsules()


def get_runtime_capsule(agent_id: str) -> dict:
    return registry.get_runtime_capsule(agent_id)
