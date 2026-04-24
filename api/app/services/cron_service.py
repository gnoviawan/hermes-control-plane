from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
from typing import Any

from fastapi import HTTPException

from app.core.settings import settings
from app.models import (
    AgentCronJob,
    AgentCronJobCreateRequest,
    AgentCronJobDeleteResponse,
    AgentCronJobPatchRequest,
    AgentCronJobsResponse,
)
from app.services.hermes_adapter import ensure_profile_exists
from app.utils import load_json_file

_WRITE_LOCK = RLock()


class CronService:
    def list_jobs(self, agent_id: str) -> AgentCronJobsResponse:
        ensure_profile_exists(agent_id)
        jobs = [self._to_contract(agent_id, job) for job in self._jobs(agent_id)]
        return AgentCronJobsResponse(agent_id=agent_id, jobs=jobs, total=len(jobs))

    def get_job(self, agent_id: str, job_id: str) -> AgentCronJob:
        ensure_profile_exists(agent_id)
        job = self._find_job(agent_id, job_id)
        return self._to_contract(agent_id, job)

    def create_job(self, agent_id: str, payload: AgentCronJobCreateRequest) -> AgentCronJob:
        ensure_profile_exists(agent_id)
        with _WRITE_LOCK:
            jobs_file = self._jobs_file(agent_id)
            data = self._load_writable_jobs(jobs_file)
            jobs = data.setdefault('jobs', [])
            job_id = f'cron-{uuid.uuid4().hex[:8]}'
            jobs.append(
                {
                    'id': job_id,
                    'name': payload.name,
                    'prompt': payload.prompt,
                    'skills': payload.skills,
                    'schedule_display': payload.schedule,
                    'enabled': True,
                    'state': 'scheduled',
                    'deliver': payload.deliver_target,
                }
            )
            self._atomic_write_json(jobs_file, data)
        return self.get_job(agent_id, job_id)

    def patch_job(self, agent_id: str, job_id: str, payload: AgentCronJobPatchRequest) -> AgentCronJob:
        ensure_profile_exists(agent_id)
        with _WRITE_LOCK:
            jobs_file = self._jobs_file(agent_id)
            data = self._load_writable_jobs(jobs_file)
            job = self._find_job_in_payload(data, job_id)
            if payload.name is not None:
                job['name'] = payload.name
            if payload.prompt is not None:
                job['prompt'] = payload.prompt
            if payload.skills is not None:
                job['skills'] = payload.skills
            if payload.schedule is not None:
                job['schedule_display'] = payload.schedule
            if payload.deliver_target is not None:
                job['deliver'] = payload.deliver_target
            if payload.enabled is not None:
                job['enabled'] = payload.enabled
                job['state'] = 'scheduled' if payload.enabled else 'paused'
            self._atomic_write_json(jobs_file, data)
        return self.get_job(agent_id, job_id)

    def delete_job(self, agent_id: str, job_id: str) -> AgentCronJobDeleteResponse:
        ensure_profile_exists(agent_id)
        with _WRITE_LOCK:
            jobs_file = self._jobs_file(agent_id)
            data = self._load_writable_jobs(jobs_file)
            jobs = data.setdefault('jobs', [])
            before = len(jobs)
            data['jobs'] = [job for job in jobs if str(job.get('id')) != job_id]
            if len(data['jobs']) == before:
                raise HTTPException(status_code=404, detail=f'Cron job {job_id} not found')
            self._atomic_write_json(jobs_file, data)
        return AgentCronJobDeleteResponse(ok=True, id=job_id)

    def pause_job(self, agent_id: str, job_id: str) -> AgentCronJob:
        return self.patch_job(agent_id, job_id, AgentCronJobPatchRequest(enabled=False))

    def resume_job(self, agent_id: str, job_id: str) -> AgentCronJob:
        return self.patch_job(agent_id, job_id, AgentCronJobPatchRequest(enabled=True))

    def trigger_job(self, agent_id: str, job_id: str) -> AgentCronJob:
        ensure_profile_exists(agent_id)
        with _WRITE_LOCK:
            jobs_file = self._jobs_file(agent_id)
            data = self._load_writable_jobs(jobs_file)
            job = self._find_job_in_payload(data, job_id)
            job['last_status'] = 'triggered'
            job['state'] = 'running'
            self._atomic_write_json(jobs_file, data)
        return self.get_job(agent_id, job_id)

    def _jobs(self, agent_id: str) -> list[dict[str, Any]]:
        jobs_file = self._jobs_file(agent_id)
        payload = load_json_file(jobs_file) or {}
        jobs = payload.get('jobs', []) if isinstance(payload, dict) else []
        return [job for job in jobs if isinstance(job, dict)]

    def _find_job(self, agent_id: str, job_id: str) -> dict[str, Any]:
        for job in self._jobs(agent_id):
            if str(job.get('id')) == job_id:
                return job
        raise HTTPException(status_code=404, detail=f'Cron job {job_id} not found')

    def _find_job_in_payload(self, payload: dict[str, Any], job_id: str) -> dict[str, Any]:
        jobs = payload.get('jobs', []) if isinstance(payload.get('jobs'), list) else []
        for job in jobs:
            if isinstance(job, dict) and str(job.get('id')) == job_id:
                return job
        raise HTTPException(status_code=404, detail=f'Cron job {job_id} not found')

    def _jobs_file(self, agent_id: str) -> Path:
        context = ensure_profile_exists(agent_id)
        return context.home / settings.cron_dir_name / 'jobs.json'

    def _load_writable_jobs(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            return {'jobs': []}
        try:
            raw = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=409, detail='Cannot update cron jobs because jobs.json is unreadable or malformed.') from exc
        if raw is None:
            return {'jobs': []}
        if not isinstance(raw, dict):
            raise HTTPException(status_code=409, detail='Cannot update cron jobs because jobs.json is unreadable or malformed.')
        if not isinstance(raw.get('jobs', []), list):
            raise HTTPException(status_code=409, detail='Cannot update cron jobs because jobs.json is unreadable or malformed.')
        raw.setdefault('jobs', [])
        return raw

    def _atomic_write_json(self, path: Path, payload: dict[str, Any]) -> None:
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

    def _to_contract(self, agent_id: str, job: dict[str, Any]) -> AgentCronJob:
        schedule = job.get('schedule_display')
        if not schedule and isinstance(job.get('schedule'), dict):
            schedule = job['schedule'].get('display') or job['schedule'].get('expr')
        status = 'paused' if not bool(job.get('enabled', False)) else str(job.get('state') or job.get('last_status') or 'scheduled')
        prompt = job.get('prompt')
        prompt_preview = None
        if prompt:
            prompt_preview = str(prompt)[:140]
        return AgentCronJob(
            id=str(job.get('id', 'unknown')),
            agent_id=agent_id,
            name=str(job.get('name') or job.get('id') or 'unnamed-job'),
            prompt_preview=prompt_preview,
            skills=[str(item) for item in job.get('skills', []) if item],
            schedule=str(schedule or '—'),
            next_run_at=job.get('next_run_at'),
            last_run_at=job.get('last_run_at'),
            status=status,
            last_status=job.get('last_status'),
            deliver_target=job.get('deliver'),
        )


cron_service = CronService()
