from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException

from app.models import AgentSessionsResponse, SessionDetail, SessionListItem, SessionMessage, SessionSearchResponse, SessionSummary
from app.services.hermes_adapter import ensure_profile_exists, list_sessions
from app.utils import load_json_file


class SessionService:
    def __init__(self, summary_reader=list_sessions):
        self.summary_reader = summary_reader

    def list_agent_sessions(self, agent_id: str) -> AgentSessionsResponse:
        context = ensure_profile_exists(agent_id)
        sessions = sorted((self._session_list_item(agent_id, summary) for summary in self.summary_reader(agent_id)), key=self._sort_key, reverse=True)
        return AgentSessionsResponse(agent_id=agent_id, sessions=sessions, total=len(sessions))

    def get_session(self, agent_id: str, session_id: str) -> SessionDetail:
        context = ensure_profile_exists(agent_id)
        payload = self._load_session_payload(context.home, session_id)
        if payload is None:
            raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
        messages = self._extract_messages(payload)
        title = payload.get('title') or payload.get('session_title') or session_id
        source = payload.get('platform') or payload.get('model') or 'Filesystem session'
        started_at = payload.get('session_start') or payload.get('started_at')
        updated_at = payload.get('last_updated') or payload.get('updated_at') or started_at
        searchable_excerpt = payload.get('platform') or payload.get('model') or source
        message_count = payload.get('message_count') if isinstance(payload.get('message_count'), int) else len(messages)
        return SessionDetail(
            id=session_id,
            agent_id=agent_id,
            title=title,
            started_at=started_at,
            updated_at=updated_at,
            source=source,
            searchable_excerpt=searchable_excerpt,
            message_count=message_count,
            messages=messages,
        )

    def search_sessions(self, agent_id: str, query: str) -> SessionSearchResponse:
        normalized_query = query.strip().lower()
        sessions_response = self.list_agent_sessions(agent_id)
        if not normalized_query:
            return SessionSearchResponse(agent_id=agent_id, query=query, sessions=sessions_response.sessions, total=sessions_response.total)

        matches: list[SessionListItem] = []
        for session in sessions_response.sessions:
            detail = self.get_session(agent_id, session.id)
            haystack = ' '.join([
                session.id,
                session.title,
                session.source,
                session.searchable_excerpt or '',
                ' '.join(message.content for message in detail.messages),
            ]).lower()
            if normalized_query in haystack:
                matches.append(session)
        return SessionSearchResponse(agent_id=agent_id, query=query, sessions=matches, total=len(matches))

    def _session_list_item(self, agent_id: str, summary: SessionSummary) -> SessionListItem:
        detail = self._try_get_session(agent_id, summary.id)
        if detail is not None:
            return SessionListItem(
                id=detail.id,
                title=detail.title,
                status='complete',
                started_at=detail.started_at,
                updated_at=detail.updated_at,
                source=detail.source,
                searchable_excerpt=detail.searchable_excerpt,
                message_count=detail.message_count,
            )
        return SessionListItem(
            id=summary.id,
            title=summary.title or summary.id,
            status='complete',
            started_at=summary.last_active,
            updated_at=summary.last_active,
            source=summary.preview or 'Hermes session',
            searchable_excerpt=summary.preview,
            message_count=0,
        )

    def _try_get_session(self, agent_id: str, session_id: str) -> SessionDetail | None:
        try:
            return self.get_session(agent_id, session_id)
        except HTTPException as exc:
            if exc.status_code == 404:
                return None
            raise

    def _sort_key(self, session: SessionListItem) -> str:
        return session.updated_at or session.started_at or ''

    def _load_session_payload(self, home: Path, session_id: str) -> dict | None:
        session_dir = home / 'sessions'
        if not session_dir.exists():
            return None

        direct_candidates = [session_dir / f'{session_id}.json']
        direct_candidates.extend(sorted(session_dir.glob(f'*{session_id}*.json')))
        for path in direct_candidates:
            payload = load_json_file(path)
            if isinstance(payload, dict):
                return payload

        for path in sorted(session_dir.glob('*.json')):
            payload = load_json_file(path)
            if isinstance(payload, dict) and payload.get('session_id') == session_id:
                return payload
        return None

    def _extract_messages(self, payload: dict) -> list[SessionMessage]:
        raw_messages = payload.get('messages')
        if not isinstance(raw_messages, list):
            return []
        messages: list[SessionMessage] = []
        for item in raw_messages:
            if not isinstance(item, dict):
                continue
            messages.append(SessionMessage(role=str(item.get('role') or 'assistant'), content=str(item.get('content') or '')))
        return messages


session_service = SessionService()
