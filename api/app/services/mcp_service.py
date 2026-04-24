from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
from typing import Any

from fastapi import HTTPException

from app.models import AgentMcpServersResponse, McpReloadResponse, McpServerInfo, SystemMcpServersResponse, ToolCatalogResponse, ToolInfo
from app.services.hermes_adapter import ensure_profile_exists, profile_contexts
from app.utils import load_json_file, load_yaml_file

_WRITE_LOCK = RLock()


class McpService:
    def list_agent_servers(self, agent_id: str) -> AgentMcpServersResponse:
        servers = self._resolve_servers(agent_id)
        return AgentMcpServersResponse(agent_id=agent_id, servers=servers, total=len(servers))

    def list_agent_tools(self, agent_id: str) -> ToolCatalogResponse:
        servers = self._resolve_servers(agent_id)
        tools = [
            ToolInfo(
                name=f'mcp__{server.id}',
                toolset=f'mcp:{server.id}',
                source_type='mcp',
                source_id=server.id,
                available=server.connection_state != 'disconnected',
                availability_reason='MCP server configured',
                schema_summary={'type': 'mcp', 'transport': server.transport, 'sampling_enabled': server.sampling_enabled},
            )
            for server in servers
        ]
        return ToolCatalogResponse(agent_id=agent_id, tools=tools, total=len(tools))

    def reload_agent_servers(self, agent_id: str) -> McpReloadResponse:
        servers = self._resolve_servers(agent_id)
        registry = self._load_registry(agent_id)
        now = self._iso_now()
        for server in servers:
            state = registry.setdefault(server.id, {})
            state['last_reload_at'] = now
            state.setdefault('connection_state', 'configured')
        self._write_registry(agent_id, registry)
        return McpReloadResponse(
            agent_id=agent_id,
            reloaded=True,
            server_count=len(servers),
            message=f'Reloaded {len(servers)} MCP server definitions for {agent_id}.',
        )

    def connect_server(self, agent_id: str, server_id: str) -> McpServerInfo:
        return self._update_connection_state(agent_id, server_id, 'connected')

    def disconnect_server(self, agent_id: str, server_id: str) -> McpServerInfo:
        return self._update_connection_state(agent_id, server_id, 'disconnected')

    def list_system_servers(self) -> SystemMcpServersResponse:
        aggregated: dict[str, McpServerInfo] = {}
        for context in profile_contexts():
            for server in self._resolve_servers(context.profile):
                existing = aggregated.get(server.id)
                if existing is None:
                    aggregated[server.id] = server.model_copy(update={'profiles': [context.profile]})
                    continue
                profiles = sorted(set([*existing.profiles, context.profile]))
                connection_state = existing.connection_state
                if server.connection_state == 'connected' or existing.connection_state == 'connected':
                    connection_state = 'connected'
                elif server.connection_state == 'configured' and existing.connection_state == 'disconnected':
                    connection_state = 'configured'
                aggregated[server.id] = existing.model_copy(
                    update={
                        'profiles': profiles,
                        'connection_state': connection_state,
                        'discovered_tools_count': max(existing.discovered_tools_count, server.discovered_tools_count),
                        'last_reload_at': max(filter(None, [existing.last_reload_at, server.last_reload_at]), default=None),
                    }
                )
        servers = [aggregated[key] for key in sorted(aggregated)]
        return SystemMcpServersResponse(servers=servers, total=len(servers))

    def _update_connection_state(self, agent_id: str, server_id: str, state: str) -> McpServerInfo:
        servers = {server.id: server for server in self._resolve_servers(agent_id)}
        if server_id not in servers:
            raise HTTPException(status_code=404, detail=f'MCP server {server_id} not found')
        registry = self._load_registry(agent_id)
        entry = registry.setdefault(server_id, {})
        entry['connection_state'] = state
        entry['last_reload_at'] = self._iso_now()
        self._write_registry(agent_id, registry)
        return self._resolve_server(agent_id, server_id)

    def _resolve_servers(self, agent_id: str) -> list[McpServerInfo]:
        context = ensure_profile_exists(agent_id)
        config = load_yaml_file(context.home / 'config.yaml')
        servers = config.get('mcp_servers') if isinstance(config.get('mcp_servers'), dict) else {}
        registry = self._load_registry(agent_id)
        return [self._server_info(server_id, payload, registry.get(server_id, {})) for server_id, payload in sorted(servers.items()) if isinstance(payload, dict)]

    def _resolve_server(self, agent_id: str, server_id: str) -> McpServerInfo:
        for server in self._resolve_servers(agent_id):
            if server.id == server_id:
                return server
        raise HTTPException(status_code=404, detail=f'MCP server {server_id} not found')

    def _server_info(self, server_id: str, payload: dict[str, Any], state: dict[str, Any]) -> McpServerInfo:
        transport = 'http' if payload.get('url') else 'stdio'
        auth_state = 'configured' if self._has_auth(payload) else 'none'
        sampling = payload.get('sampling') if isinstance(payload.get('sampling'), dict) else {}
        sampling_enabled = sampling.get('enabled', True)
        return McpServerInfo(
            id=server_id,
            name=server_id,
            transport=transport,
            enabled=bool(payload.get('enabled', True)),
            connection_state=str(state.get('connection_state') or 'configured'),
            auth_state=auth_state,
            discovered_tools_count=1,
            last_reload_at=state.get('last_reload_at'),
            sampling_enabled=bool(sampling_enabled),
        )

    def _has_auth(self, payload: dict[str, Any]) -> bool:
        env = payload.get('env')
        headers = payload.get('headers')
        if isinstance(env, dict) and bool(env):
            return True
        if isinstance(headers, dict) and bool(headers):
            return True
        return False

    def _registry_file(self, agent_id: str) -> Path:
        context = ensure_profile_exists(agent_id)
        return context.home / '.mcp_registry.json'

    def _load_registry(self, agent_id: str) -> dict[str, Any]:
        payload = load_json_file(self._registry_file(agent_id))
        return payload if isinstance(payload, dict) else {}

    def _write_registry(self, agent_id: str, payload: dict[str, Any]) -> None:
        path = self._registry_file(agent_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path: Path | None = None
        try:
            with NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False) as handle:
                json.dump(payload, handle, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
                temp_path = Path(handle.name)
            temp_path.replace(path)
        finally:
            if temp_path is not None and temp_path.exists():
                temp_path.unlink(missing_ok=True)

    def _iso_now(self) -> str:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


mcp_service = McpService()
