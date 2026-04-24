from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from app.models import (
    AgentMemoryProvidersResponse,
    AgentMemoryResponse,
    MemoryDeleteResponse,
    MemoryEntry,
    MemoryEntryCreateRequest,
    MemoryEntryDeleteRequest,
    MemoryEntryPatchRequest,
    MemoryProviderStatus,
    SystemMemoryProfileSummary,
    SystemMemorySummaryResponse,
)
from app.services.hermes_adapter import ensure_profile_exists, profile_contexts
from app.utils import load_json_file

_WRITE_LOCK = RLock()
_SECRET_LIKE_CONTENT_RE = re.compile(
    r'((api\s*key|token|secret|password|authorization)\s*[:=]\s*\S+)|(bearer\s+\S+)',
    re.IGNORECASE,
)


class MemoryService:
    def list_entries(self, agent_id: str) -> AgentMemoryResponse:
        entries = [self._entry_model(item) for item in self._payload(agent_id).get('entries', []) if isinstance(item, dict)]
        return AgentMemoryResponse(agent_id=agent_id, entries=entries, total=len(entries))

    def create_entry(self, agent_id: str, payload: MemoryEntryCreateRequest) -> MemoryEntry:
        state = self._payload(agent_id)
        now = self._iso_now()
        entry = {
            'id': f"{payload.scope}-{uuid4().hex[:8]}",
            'scope': payload.scope,
            'content': payload.content.strip(),
            'updated_at': now,
        }
        state.setdefault('entries', []).append(entry)
        self._write_payload(agent_id, state)
        return self._entry_model(entry)

    def patch_entry(self, agent_id: str, payload: MemoryEntryPatchRequest) -> MemoryEntry:
        state = self._payload(agent_id)
        entries = state.setdefault('entries', [])
        for entry in entries:
            if isinstance(entry, dict) and entry.get('id') == payload.id:
                entry['content'] = payload.content.strip()
                entry['updated_at'] = self._iso_now()
                self._write_payload(agent_id, state)
                return self._entry_model(entry)
        raise HTTPException(status_code=404, detail=f'Memory entry {payload.id} not found')

    def delete_entry(self, agent_id: str, payload: MemoryEntryDeleteRequest) -> MemoryDeleteResponse:
        state = self._payload(agent_id)
        entries = state.setdefault('entries', [])
        next_entries = [entry for entry in entries if not (isinstance(entry, dict) and entry.get('id') == payload.id)]
        if len(next_entries) == len(entries):
            raise HTTPException(status_code=404, detail=f'Memory entry {payload.id} not found')
        state['entries'] = next_entries
        self._write_payload(agent_id, state)
        self._refresh_provider_counts(state)
        return MemoryDeleteResponse(agent_id=agent_id, id=payload.id, deleted=True)

    def list_providers(self, agent_id: str) -> AgentMemoryProvidersResponse:
        payload = self._payload(agent_id)
        providers = [MemoryProviderStatus(**item) for item in payload.get('providers', []) if isinstance(item, dict)]
        return AgentMemoryProvidersResponse(agent_id=agent_id, providers=providers, total=len(providers))

    def system_summary(self) -> SystemMemorySummaryResponse:
        profiles: list[SystemMemoryProfileSummary] = []
        total_entries = 0
        for context in profile_contexts():
            payload = self._payload(context.profile)
            entries = [item for item in payload.get('entries', []) if isinstance(item, dict)]
            memory_entries = sum(1 for item in entries if item.get('scope') == 'memory')
            user_entries = sum(1 for item in entries if item.get('scope') == 'user')
            total = len(entries)
            total_entries += total
            profiles.append(
                SystemMemoryProfileSummary(
                    agent_id=context.profile,
                    total_entries=total,
                    memory_entries=memory_entries,
                    user_entries=user_entries,
                )
            )
        profiles.sort(key=lambda item: item.agent_id)
        return SystemMemorySummaryResponse(profiles=profiles, total_profiles=len(profiles), total_entries=total_entries)

    def _entry_model(self, item: dict[str, Any]) -> MemoryEntry:
        content = str(item.get('content') or '').strip()
        if self._looks_secret(content):
            content = '***redacted***'
        return MemoryEntry(
            id=str(item.get('id') or f"memory-{uuid4().hex[:8]}"),
            scope='user' if item.get('scope') == 'user' else 'memory',
            content=content,
            updated_at=str(item.get('updated_at') or self._iso_now()),
        )

    def _looks_secret(self, content: str) -> bool:
        return bool(_SECRET_LIKE_CONTENT_RE.search(content))

    def _payload(self, agent_id: str) -> dict[str, Any]:
        payload = load_json_file(self._memory_file(agent_id))
        if not isinstance(payload, dict):
            payload = {'entries': [], 'providers': []}
        payload.setdefault('entries', [])
        payload.setdefault('providers', [])
        self._refresh_provider_counts(payload)
        return payload

    def _refresh_provider_counts(self, payload: dict[str, Any]) -> None:
        entry_count = len([item for item in payload.get('entries', []) if isinstance(item, dict)])
        providers = [item for item in payload.get('providers', []) if isinstance(item, dict)]
        for provider in providers:
            provider.setdefault('entry_count', entry_count)
        if not providers:
            payload['providers'] = [
                {
                    'name': 'memory-tool',
                    'status': 'healthy' if entry_count >= 0 else 'unknown',
                    'source': 'local-file',
                    'entry_count': entry_count,
                }
            ]
        else:
            payload['providers'] = providers

    def _memory_file(self, agent_id: str) -> Path:
        context = ensure_profile_exists(agent_id)
        return context.home / 'memory.json'

    def _write_payload(self, agent_id: str, payload: dict[str, Any]) -> None:
        path = self._memory_file(agent_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        self._refresh_provider_counts(payload)
        temp_path: Path | None = None
        try:
            with _WRITE_LOCK:
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


memory_service = MemoryService()
