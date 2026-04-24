from __future__ import annotations

from pathlib import Path

from app.models import AgentEnvResponse, EnvCategoryRecord, EnvVariableRecord, SystemEnvCatalogResponse
from app.services.hermes_adapter import ensure_profile_exists

ENV_CATALOG = [
    {
        'key': 'providers',
        'label': 'Providers',
        'variables': [
            {
                'key': 'OPENAI_API_KEY',
                'description': 'API key for OpenAI-compatible provider access.',
                'sensitive': True,
                'impact': 'restart',
                'docs_url': 'https://docs.hermes-agent.dev/reference/environment-variables',
            },
            {
                'key': 'ANTHROPIC_API_KEY',
                'description': 'API key for Anthropic provider access.',
                'sensitive': True,
                'impact': 'restart',
                'docs_url': 'https://docs.hermes-agent.dev/reference/environment-variables',
            },
        ],
    },
    {
        'key': 'tool_apis',
        'label': 'Tool APIs',
        'variables': [
            {
                'key': 'TAVILY_API_KEY',
                'description': 'Optional API key for web search integration.',
                'sensitive': True,
                'impact': 'restart',
                'docs_url': 'https://docs.hermes-agent.dev/reference/environment-variables',
            },
        ],
    },
    {
        'key': 'gateway_messaging',
        'label': 'Gateway & Messaging',
        'variables': [
            {
                'key': 'DISCORD_TOKEN',
                'description': 'Discord bot token for gateway connectivity.',
                'sensitive': True,
                'impact': 'restart',
                'docs_url': 'https://docs.hermes-agent.dev/reference/environment-variables',
            },
        ],
    },
    {
        'key': 'runtime',
        'label': 'Runtime',
        'variables': [
            {
                'key': 'HERMES_TERMINAL_BACKEND',
                'description': 'Override terminal backend selection for Hermes runtime.',
                'sensitive': False,
                'impact': 'restart',
                'docs_url': 'https://docs.hermes-agent.dev/reference/environment-variables',
            },
        ],
    },
]


class EnvService:
    def get_catalog(self) -> SystemEnvCatalogResponse:
        categories = [
            EnvCategoryRecord(
                key=category['key'],
                label=category['label'],
                variables=[self._record(definition, None, category['key']) for definition in category['variables']],
            )
            for category in ENV_CATALOG
        ]
        return SystemEnvCatalogResponse(
            categories=categories,
            total_count=sum(len(category.variables) for category in categories),
        )

    def get_agent_env(self, agent_id: str) -> AgentEnvResponse:
        context = ensure_profile_exists(agent_id)
        env_path = context.home / '.env'
        env_values = self._load_env_file(env_path)

        variables = [
            self._record(definition, env_values.get(definition['key']), category['key'])
            for category in ENV_CATALOG
            for definition in category['variables']
        ]
        return AgentEnvResponse(agent_id=agent_id, path=str(env_path), variables=variables)

    def _record(self, definition: dict, value: str | None, category_key: str) -> EnvVariableRecord:
        return EnvVariableRecord(
            key=definition['key'],
            category=category_key,
            description=definition['description'],
            sensitive=bool(definition['sensitive']),
            docs_url=definition.get('docs_url'),
            impact=definition['impact'],
            is_set=value is not None,
            redacted_preview=self._redact(value, bool(definition['sensitive'])) if value is not None else None,
        )

    def _load_env_file(self, path: Path) -> dict[str, str]:
        if not path.exists():
            return {}
        values: dict[str, str] = {}
        for line in path.read_text(encoding='utf-8').splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith('#') or '=' not in stripped:
                continue
            key, value = stripped.split('=', 1)
            values[key.strip()] = value.strip()
        return values

    def _redact(self, value: str, sensitive: bool) -> str:
        if not sensitive:
            return value
        suffix = value[-4:] if len(value) >= 4 else value
        return f'***{suffix}'


env_service = EnvService()
