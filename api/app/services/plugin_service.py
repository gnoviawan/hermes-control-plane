from __future__ import annotations

from pathlib import Path
from typing import Any

from app.core.settings import settings
from app.models import DashboardPlugin, PluginExtension, PluginSlotDescriptor, SystemPluginsResponse
from app.utils import load_json_file

_SUPPORTED_SLOTS = [
    PluginSlotDescriptor(
        kind='page_route',
        title='Dashboard page routes',
        description='Register dedicated dashboard pages surfaced through plugin-aware navigation and route shells.',
    ),
    PluginSlotDescriptor(
        kind='dashboard_widget',
        title='Dashboard cards & widgets',
        description='Inject plugin-owned summary cards or widgets into explicit overview/dashboard surfaces.',
    ),
    PluginSlotDescriptor(
        kind='tool_result_renderer',
        title='Tool result renderers',
        description='Attach plugin-provided result renderers for specific tool outputs without patching core pages.',
    ),
]


class PluginService:
    def list_plugins(self) -> SystemPluginsResponse:
        manifest = load_json_file(self._manifest_path())
        raw_plugins = manifest.get('plugins') if isinstance(manifest, dict) else []
        plugins = [self._plugin_model(item) for item in raw_plugins if isinstance(item, dict)]
        return SystemPluginsResponse(
            supported_slots=list(_SUPPORTED_SLOTS),
            plugins=plugins,
            total_plugins=len(plugins),
        )

    def _manifest_path(self) -> Path:
        return settings.hermes_home / 'dashboard_plugins.json'

    def _plugin_model(self, payload: dict[str, Any]) -> DashboardPlugin:
        extensions = payload.get('extensions') if isinstance(payload.get('extensions'), list) else []
        return DashboardPlugin(
            id=str(payload.get('id') or 'unknown-plugin'),
            name=str(payload.get('name') or payload.get('id') or 'Unknown Plugin'),
            version=str(payload.get('version') or '0.0.0'),
            enabled=bool(payload.get('enabled', True)),
            source=str(payload.get('source') or 'local'),
            description=str(payload.get('description') or 'No description provided.'),
            extensions=[self._extension_model(item) for item in extensions if isinstance(item, dict)],
        )

    def _extension_model(self, payload: dict[str, Any]) -> PluginExtension:
        kind = str(payload.get('kind') or 'dashboard_widget')
        if kind not in {'page_route', 'dashboard_widget', 'tool_result_renderer'}:
            kind = 'dashboard_widget'
        path = payload.get('path')
        return PluginExtension(
            key=str(payload.get('key') or payload.get('title') or kind),
            kind=kind,
            title=str(payload.get('title') or payload.get('key') or kind),
            description=str(payload.get('description') or 'No description provided.'),
            target=str(payload.get('target') or 'overview.sidebar'),
            path=str(path) if path else None,
        )


plugin_service = PluginService()
