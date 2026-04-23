from __future__ import annotations

from pathlib import Path
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
        for provider_name, models in sorted(model_map.items()):
            if isinstance(models, list):
                for model in models:
                    items.append(ModelCatalogItem(id=str(model), provider=provider_name))
        if not items and model_cfg.get('default') and model_cfg.get('provider'):
            items.append(ModelCatalogItem(id=str(model_cfg['default']), provider=str(model_cfg['provider'])))
        items.sort(key=lambda item: (item.provider, item.id))
        return ModelCatalogResponse(
            models=items,
            total=len(items),
            default_model=model_cfg.get('default'),
            default_provider=model_cfg.get('provider'),
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
        config = self._config()
        config.setdefault('model', {})
        if payload.get('default_provider') is not None:
            config['model']['provider'] = payload['default_provider']
        if payload.get('default_model') is not None:
            config['model']['default'] = payload['default_model']
        if payload.get('fallback_providers') is not None:
            config['fallback_providers'] = [str(provider) for provider in payload['fallback_providers']]
        config_path.write_text(yaml.safe_dump(config, sort_keys=False), encoding='utf-8')
        return self.get_routing()

    def _has_credentials(self, provider_cfg: Any) -> bool:
        return isinstance(provider_cfg, dict) and any(key.lower() in {'api_key', 'token', 'password', 'secret', 'authorization'} for key in provider_cfg.keys())


provider_service = ProviderService()
