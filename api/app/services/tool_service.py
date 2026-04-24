from __future__ import annotations

import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
from typing import Any

import yaml
from fastapi import HTTPException

from app.models import ToolCatalogResponse, ToolInfo, ToolsetInfo, ToolsetPatchRequest, ToolsetResponse
from app.services.hermes_adapter import ensure_profile_exists, profile_contexts
from app.utils import load_yaml_file

_BUILTIN_TOOLSETS: dict[str, list[str]] = {
    'browser': ['browser_navigate', 'browser_snapshot'],
    'file': ['read_file', 'write_file', 'patch'],
    'hermes-cli': ['terminal', 'read_file', 'write_file', 'patch', 'browser_navigate'],
}

_WRITE_LOCK = RLock()


class ToolService:
    def list_agent_toolsets(self, agent_id: str) -> ToolsetResponse:
        context = ensure_profile_exists(agent_id)
        toolsets = self._resolve_toolsets(context.home)
        return ToolsetResponse(agent_id=agent_id, toolsets=toolsets, total=len(toolsets))

    def patch_agent_toolsets(self, agent_id: str, payload: ToolsetPatchRequest) -> ToolsetResponse:
        context = ensure_profile_exists(agent_id)
        config_path = context.home / 'config.yaml'
        with _WRITE_LOCK:
            config = self._load_writable_config(config_path)
            config['toolsets'] = payload.toolsets
            self._atomic_write_yaml(config_path, config)
        return self.list_agent_toolsets(agent_id)

    def list_agent_tools(self, agent_id: str) -> ToolCatalogResponse:
        context = ensure_profile_exists(agent_id)
        tools = self._resolve_tools(context.home)
        return ToolCatalogResponse(agent_id=agent_id, tools=tools, total=len(tools))

    def list_system_toolsets(self) -> ToolsetResponse:
        seen: dict[str, ToolsetInfo] = {}
        for context in profile_contexts():
            for toolset in self._resolve_toolsets(context.home):
                seen.setdefault(toolset.name, toolset)
        toolsets = [seen[name] for name in sorted(seen)]
        return ToolsetResponse(agent_id='system', toolsets=toolsets, total=len(toolsets))

    def list_system_tools(self) -> ToolCatalogResponse:
        seen: dict[str, ToolInfo] = {}
        for context in profile_contexts():
            for tool in self._resolve_tools(context.home):
                seen.setdefault(tool.name, tool)
        tools = [seen[name] for name in sorted(seen)]
        return ToolCatalogResponse(agent_id='system', tools=tools, total=len(tools))

    def _resolve_toolsets(self, home: Path) -> list[ToolsetInfo]:
        config = load_yaml_file(home / 'config.yaml')
        configured = config.get('toolsets') if isinstance(config.get('toolsets'), list) else []
        mcp_servers = config.get('mcp_servers') if isinstance(config.get('mcp_servers'), dict) else {}
        items = [
            ToolsetInfo(name=name, source='builtin', enabled=True, tool_count=len(self._builtin_tools(name)))
            for name in sorted({str(name) for name in configured})
        ]
        items.extend(
            ToolsetInfo(name=f'mcp:{server_name}', source='mcp', enabled=True, tool_count=1)
            for server_name in sorted(mcp_servers)
        )
        return items

    def _resolve_tools(self, home: Path) -> list[ToolInfo]:
        config = load_yaml_file(home / 'config.yaml')
        configured = config.get('toolsets') if isinstance(config.get('toolsets'), list) else []
        mcp_servers = config.get('mcp_servers') if isinstance(config.get('mcp_servers'), dict) else {}
        tools: dict[str, ToolInfo] = {}
        for toolset in configured:
            for tool_name in self._builtin_tools(str(toolset)):
                tools.setdefault(
                    tool_name,
                    ToolInfo(
                        name=tool_name,
                        toolset=str(toolset),
                        source_type='builtin',
                        source_id=str(toolset),
                        available=True,
                        availability_reason='Enabled by configured toolset',
                        schema_summary={'type': 'builtin'},
                    ),
                )
        for server_name in sorted(mcp_servers):
            tool_name = f'mcp__{server_name}'
            tools[tool_name] = ToolInfo(
                name=tool_name,
                toolset=f'mcp:{server_name}',
                source_type='mcp',
                source_id=server_name,
                available=True,
                availability_reason='MCP server configured',
                schema_summary={'type': 'mcp'},
            )
        return [tools[name] for name in sorted(tools)]

    def _builtin_tools(self, toolset: str) -> list[str]:
        return _BUILTIN_TOOLSETS.get(toolset, [])

    def _load_writable_config(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            return {}
        try:
            raw = yaml.safe_load(path.read_text(encoding='utf-8'))
        except (OSError, yaml.YAMLError) as exc:
            raise HTTPException(status_code=409, detail='Cannot update toolsets because config.yaml is unreadable or malformed.') from exc
        if raw is None:
            return {}
        if not isinstance(raw, dict):
            raise HTTPException(status_code=409, detail='Cannot update toolsets because config.yaml is unreadable or malformed.')
        return raw

    def _atomic_write_yaml(self, path: Path, payload: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path: Path | None = None
        try:
            with NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False) as handle:
                yaml.safe_dump(payload, handle, sort_keys=False)
                handle.flush()
                os.fsync(handle.fileno())
                temp_path = Path(handle.name)
            temp_path.replace(path)
        finally:
            if temp_path is not None and temp_path.exists():
                temp_path.unlink(missing_ok=True)


tool_service = ToolService()
