from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
from typing import Any

import yaml

from app.models import (
    ModelCatalogItem,
    ModelCatalogResponse,
    ProviderCatalogItem,
    ProviderCatalogResponse,
    ProviderRoutingResponse,
)
from app.services.hermes_adapter import ensure_profile_exists
from app.utils import load_yaml_file, redact_secrets

WRITE_RESTRICTIONS = ['Provider credentials remain redacted in provider routing views.']
_WRITE_LOCK = RLock()


class ProviderService:
    def _config_path(self) -> Path:
        context = ensure_profile_exists('default')
        return context.home / 'config.yaml'

    def _config(self) -> dict[str, Any]:
        return load_yaml_file(self._config_path())

    def list_providers(self) -> ProviderCatalogResponse:
        config = self._config()
        providers = config.get('providers') if isinstance(config.get('providers'), dict) else {}
        items = [
            ProviderCatalogItem(
                name=name,
                config=redact_secrets(provider_cfg if isinstance(provider_cfg, dict) else {}),
                has_credentials=self._has_credentials(provider_cfg),
            )
            for name, provider_cfg in sorted(providers.items())
        ]
        return ProviderCatalogResponse(providers=items, total=len(items))

    def list_models(self) -> ModelCatalogResponse:
        config = self._config()
        model_cfg = config.get('model') if isinstance(config.get('model'), dict) else {}
        model_map = config.get('models') if isinstance(config.get('models'), dict) else {}
        items: list[ModelCatalogItem] = []
        seen: set[tuple[str, str]] = set()
        for provider_name, models in sorted(model_map.items()):
            if isinstance(models, list):
                for model in models:
                    entry = (provider_name, str(model))
                    if entry in seen:
                        continue
                    seen.add(entry)
                    items.append(ModelCatalogItem(id=str(model), provider=provider_name))
        default_model = model_cfg.get('default')
        default_provider = model_cfg.get('provider')
        if default_model and default_provider:
            default_entry = (str(default_provider), str(default_model))
            if default_entry not in seen:
                items.append(ModelCatalogItem(id=str(default_model), provider=str(default_provider)))
        items.sort(key=lambda item: (item.provider, item.id))
        return ModelCatalogResponse(
            models=items,
            total=len(items),
            default_model=default_model,
            default_provider=default_provider,
        )

    def get_routing(self) -> ProviderRoutingResponse:
        config = self._config()
        model_cfg = config.get('model') if isinstance(config.get('model'), dict) else {}
        fallback_providers = config.get('fallback_providers') if isinstance(config.get('fallback_providers'), list) else []
        default_provider = model_cfg.get('provider')
        unique_providers = {provider for provider in [default_provider, *fallback_providers] if provider}
        return ProviderRoutingResponse(
            default_provider=default_provider,
            default_model=model_cfg.get('default'),
            fallback_providers=[str(provider) for provider in fallback_providers],
            effective_provider_count=len(unique_providers),
            write_restrictions=WRITE_RESTRICTIONS,
        )

    def patch_routing(self, payload: dict[str, Any]) -> ProviderRoutingResponse:
        config_path = self._config_path()
        with _WRITE_LOCK:
            config = load_yaml_file(config_path)
            model_cfg = config.get('model') if isinstance(config.get('model'), dict) else {}
            config['model'] = dict(model_cfg)
            if payload.get('default_provider') is not None:
                config['model']['provider'] = payload['default_provider']
            if payload.get('default_model') is not None:
                config['model']['default'] = payload['default_model']
            if payload.get('fallback_providers') is not None:
                config['fallback_providers'] = [str(provider) for provider in payload['fallback_providers']]
            self._atomic_write_yaml(config_path, config)
        return self.get_routing()

    def _atomic_write_yaml(self, path: Path, payload: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False) as handle:
            yaml.safe_dump(payload, handle, sort_keys=False)
            temp_path = Path(handle.name)
        temp_path.replace(path)

    def _has_credentials(self, provider_cfg: Any) -> bool:
        return isinstance(provider_cfg, dict) and any(key.lower() in {'api_key', 'token', 'password', 'secret', 'authorization'} for key in provider_cfg.keys())


provider_service = ProviderService()
