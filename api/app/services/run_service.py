from __future__ import annotations

import json
from collections import defaultdict
from datetime import UTC, datetime
from itertools import count
from typing import DefaultDict

from fastapi import HTTPException

from app.models import RunCreateRequest, RunSummary


def _iso_now() -> str:
    return datetime.now(UTC).isoformat().replace('+00:00', 'Z')


class RunService:
    def __init__(self) -> None:
        self._runs_by_agent: DefaultDict[str, list[RunSummary]] = defaultdict(list)
        self._id_counter = count(1)

    def create_run(self, agent_id: str, payload: RunCreateRequest) -> RunSummary:
        run_id = f'run-{next(self._id_counter):04d}'
        started_at = _iso_now()
        run = RunSummary(
            id=run_id,
            agent_id=agent_id,
            session_id=payload.session_id,
            status='queued',
            started_at=started_at,
            ended_at=None,
            current_model=None,
            current_provider=None,
            summary=payload.input,
            stream_url=f'/api/agents/{agent_id}/runs/{run_id}/stream',
            events_url=f'/api/agents/{agent_id}/runs/{run_id}/events',
        )
        self._runs_by_agent[agent_id].insert(0, run)
        return run

    def list_runs(self, agent_id: str) -> list[RunSummary]:
        return list(self._runs_by_agent[agent_id])

    def get_run(self, agent_id: str, run_id: str) -> RunSummary:
        for run in self._runs_by_agent[agent_id]:
            if run.id == run_id:
                return run
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")

    def stop_run(self, agent_id: str, run_id: str) -> RunSummary:
        run = self.get_run(agent_id, run_id)
        if run.status in {'completed', 'failed', 'stopped'}:
            return run
        updated = run.model_copy(update={'status': 'stopped', 'ended_at': _iso_now()})
        self._replace_run(agent_id, updated)
        return updated

    def event_stream_payload(self, agent_id: str, run_id: str) -> str:
        run = self.get_run(agent_id, run_id)
        data = json.dumps(run.model_dump(), indent=2)
        return f'id: {run.id}:1\nevent: run.snapshot\ndata: {data}\n\n'

    def _replace_run(self, agent_id: str, updated: RunSummary) -> None:
        self._runs_by_agent[agent_id] = [updated if run.id == updated.id else run for run in self._runs_by_agent[agent_id]]


run_service = RunService()
