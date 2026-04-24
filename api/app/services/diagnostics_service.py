from __future__ import annotations

from app.core.settings import settings
from app.models import (
    AgentDiagnosticsResponse,
    DiagnosticsCheck,
    DiagnosticsRuntimeSummary,
    SetupCheckItem,
    SetupCheckResponse,
    SystemDoctorResponse,
    SystemHealthResponse,
    SystemVersionResponse,
)
from app.services.hermes_adapter import ensure_profile_exists, log_payload, status_payload


class DiagnosticsService:
    def get_system_health(self) -> SystemHealthResponse:
        status = status_payload()
        return SystemHealthResponse(
            status='ok',
            service=settings.app_name,
            api_version=settings.dashboard_api_version,
            app_version=settings.app_version,
            adapter=self.adapter_descriptor(),
            runtime=self._runtime_summary(status),
        )

    def get_system_doctor(self) -> SystemDoctorResponse:
        status = status_payload()
        adapter = self.adapter_descriptor()
        checks = [
            DiagnosticsCheck(
                name='hermes-binary',
                ok=bool(adapter.get('hermes_bin_exists')),
                detail=str(adapter.get('hermes_bin')),
                severity='info' if bool(adapter.get('hermes_bin_exists')) else 'error',
            ),
            DiagnosticsCheck(
                name='runtime-status',
                ok=bool(status.get('ok', False)),
                detail='; '.join(status.get('status_excerpt', []) or ['No runtime status available.']),
                severity='info' if bool(status.get('ok', False)) else 'warning',
            ),
            DiagnosticsCheck(
                name='gateway-state',
                ok=bool(status.get('gateway_state') in {'running', 'configured', None}),
                detail=str(status.get('gateway_state') or 'unknown'),
                severity='info' if status.get('gateway_state') == 'running' else 'warning',
            ),
        ]
        overall = 'ok' if all(check.ok for check in checks[:2]) else 'warning'
        return SystemDoctorResponse(status=overall, checks=checks)

    def get_system_version(self) -> SystemVersionResponse:
        return SystemVersionResponse(
            service=settings.app_name,
            api_version=settings.dashboard_api_version,
            app_version=settings.app_version,
        )

    def get_setup_check(self) -> SetupCheckResponse:
        items = [
            SetupCheckItem(key='hermes_home', configured=settings.hermes_home.exists(), value=str(settings.hermes_home)),
            SetupCheckItem(key='hermes_bin', configured=settings.hermes_bin.exists(), value=str(settings.hermes_bin)),
            SetupCheckItem(key='hermes_root', configured=settings.hermes_root.exists(), value=str(settings.hermes_root)),
        ]
        overall = 'ok' if all(item.configured for item in items) else 'warning'
        return SetupCheckResponse(status=overall, items=items)

    def get_agent_diagnostics(self, agent_id: str) -> AgentDiagnosticsResponse:
        context = ensure_profile_exists(agent_id)
        log_info = log_payload(profile=agent_id, log_name='agent', lines=20)
        checks = [
            DiagnosticsCheck(
                name='profile-home',
                ok=context.home.exists(),
                detail=str(context.home),
                severity='info' if context.home.exists() else 'error',
            ),
            DiagnosticsCheck(
                name='agent-log',
                ok=bool(log_info.get('path')),
                detail=str(log_info.get('path')),
                severity='info',
            ),
            DiagnosticsCheck(
                name='runtime-status',
                ok=bool(status_payload().get('ok', False)),
                detail='Active runtime reachable.',
                severity='info',
            ),
        ]
        overall = 'ok' if all(check.ok for check in checks) else 'warning'
        return AgentDiagnosticsResponse(agent_id=agent_id, status=overall, checks=checks)

    def get_agent_logs(self, agent_id: str, log_name: str = 'agent', lines: int = 100) -> dict:
        ensure_profile_exists(agent_id)
        return log_payload(profile=agent_id, log_name=log_name, lines=lines)

    def adapter_descriptor(self) -> dict[str, str | bool]:
        return {
            'kind': 'hermes-dashboard-api',
            'hermes_home': str(settings.hermes_home),
            'hermes_bin': str(settings.hermes_bin),
            'hermes_bin_exists': settings.hermes_bin.exists(),
        }

    def _runtime_summary(self, status: dict) -> DiagnosticsRuntimeSummary:
        return DiagnosticsRuntimeSummary(
            active_profile=status.get('active_profile'),
            profile_count=int(status.get('profile_count', 0) or 0),
            session_count=int(status.get('session_count', 0) or 0),
            cron_job_count=int(status.get('cron_job_count', 0) or 0),
            gateway_state=status.get('gateway_state'),
            status_excerpt=list(status.get('status_excerpt') or []),
        )


diagnostics_service = DiagnosticsService()
