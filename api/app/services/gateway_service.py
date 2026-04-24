from __future__ import annotations

import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
from typing import Any

import yaml

from app.core.settings import settings
from app.models import (
    GatewayLifecycleResponse,
    GatewayPlatformInfo,
    SystemGatewayPatchRequest,
    SystemGatewayPlatformsResponse,
    SystemGatewayResponse,
)
from app.utils import load_json_file, load_yaml_file, redact_secrets

_WRITE_LOCK = RLock()
_WRITE_RESTRICTIONS = [
    'Gateway secrets remain redacted in dashboard responses.',
    'Gateway v1 updates only the top-level gateway block and lifecycle state file.',
]


class GatewayService:
    def get_gateway(self) -> SystemGatewayResponse:
        config = self._gateway_config()
        status = self._gateway_status()
        platforms = self._platform_models(config, status)
        return SystemGatewayResponse(
            enabled=bool(config.get('enabled', False)),
            status=status,
            default_platform=config.get('default_platform'),
            platform_count=len(platforms),
            channel_count=sum(item.channel_count for item in platforms),
            platforms=platforms,
            write_restrictions=_WRITE_RESTRICTIONS,
        )

    def list_platforms(self) -> SystemGatewayPlatformsResponse:
        platforms = self._platform_models(self._gateway_config(), self._gateway_status())
        return SystemGatewayPlatformsResponse(platforms=platforms, total=len(platforms))

    def patch_gateway(self, payload: SystemGatewayPatchRequest) -> SystemGatewayResponse:
        with _WRITE_LOCK:
            path = self._config_path()
            config = self._load_writable_config(path)
            gateway = config.get('gateway') if isinstance(config.get('gateway'), dict) else {}
            config['gateway'] = dict(gateway)
            if payload.enabled is not None:
                config['gateway']['enabled'] = payload.enabled
            if payload.default_platform is not None:
                config['gateway']['default_platform'] = payload.default_platform
            if payload.platforms is not None:
                config['gateway']['platforms'] = payload.platforms
            self._atomic_write_yaml(path, config)
        return self.get_gateway()

    def start_gateway(self) -> GatewayLifecycleResponse:
        self._write_state({'status': 'running'})
        return GatewayLifecycleResponse(status='running', started=True, message='Gateway start requested.')

    def stop_gateway(self) -> GatewayLifecycleResponse:
        self._write_state({'status': 'stopped'})
        return GatewayLifecycleResponse(status='stopped', stopped=True, message='Gateway stop requested.')

    def _config_path(self) -> Path:
        return settings.hermes_home / 'config.yaml'

    def _state_path(self) -> Path:
        return settings.hermes_home / 'gateway_state.json'

    def _gateway_status(self) -> str:
        payload = load_json_file(self._state_path())
        if isinstance(payload, dict):
            return str(payload.get('status') or payload.get('gateway_state') or 'configured')
        return 'configured'

    def _gateway_config(self) -> dict[str, Any]:
        config = load_yaml_file(self._config_path())
        gateway = config.get('gateway') if isinstance(config.get('gateway'), dict) else {}
        platforms = gateway.get('platforms') if isinstance(gateway.get('platforms'), dict) else {}
        return {
            'enabled': bool(gateway.get('enabled', False)),
            'default_platform': gateway.get('default_platform'),
            'platforms': platforms,
        }

    def _platform_models(self, config: dict[str, Any], status: str) -> list[GatewayPlatformInfo]:
        platforms = config.get('platforms') if isinstance(config.get('platforms'), dict) else {}
        items: list[GatewayPlatformInfo] = []
        for name, raw in sorted(platforms.items()):
            platform = raw if isinstance(raw, dict) else {}
            channels = platform.get('channels') if isinstance(platform.get('channels'), list) else []
            items.append(
                GatewayPlatformInfo(
                    name=name,
                    enabled=bool(platform.get('enabled', False)),
                    status=status if bool(platform.get('enabled', False)) else 'disabled',
                    channel_count=len([item for item in channels if item]),
                    config=redact_secrets(platform),
                )
            )
        return items

    def _load_writable_config(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            return {}
        try:
            raw = yaml.safe_load(path.read_text(encoding='utf-8'))
        except (OSError, yaml.YAMLError) as exc:
            raise ValueError('Cannot update gateway because config.yaml is unreadable or malformed.') from exc
        if raw is None:
            return {}
        if not isinstance(raw, dict):
            raise ValueError('Cannot update gateway because config.yaml is unreadable or malformed.')
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

    def _write_state(self, payload: dict[str, Any]) -> None:
        path = self._state_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path: Path | None = None
        try:
            with NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False) as handle:
                __import__('json').dump(payload, handle, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
                temp_path = Path(handle.name)
            temp_path.replace(path)
        finally:
            if temp_path is not None and temp_path.exists():
                temp_path.unlink(missing_ok=True)


gateway_service = GatewayService()
