from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
from typing import Any

from fastapi import HTTPException

from app.models import AgentSkill, AgentSkillPatchRequest, AgentSkillRunResponse, AgentSkillsResponse, SystemSkillLibraryItem, SystemSkillsLibraryResponse
from app.services.hermes_adapter import ensure_profile_exists, profile_contexts
from app.utils import load_json_file

_WRITE_LOCK = RLock()


class SkillService:
    def list_agent_skills(self, agent_id: str) -> AgentSkillsResponse:
        skills = [self._scan_skill(agent_id, skill_file) for skill_file in self._skill_files(agent_id)]
        return AgentSkillsResponse(agent_id=agent_id, skills=skills, total=len(skills))

    def get_agent_skill(self, agent_id: str, skill_name: str) -> AgentSkill:
        skill = self._find_skill(agent_id, skill_name)
        if skill is None:
            raise HTTPException(status_code=404, detail=f'Skill {skill_name} not found')
        return skill

    def patch_agent_skill(self, agent_id: str, skill_name: str, payload: AgentSkillPatchRequest) -> AgentSkill:
        skill = self._find_skill(agent_id, skill_name)
        if skill is None:
            raise HTTPException(status_code=404, detail=f'Skill {skill_name} not found')
        if payload.enabled is not None:
            with _WRITE_LOCK:
                registry = self._load_registry(agent_id)
                registry[skill_name] = {'enabled': payload.enabled}
                self._write_registry(agent_id, registry)
        return self.get_agent_skill(agent_id, skill_name)

    def run_agent_skill(self, agent_id: str, skill_name: str) -> AgentSkillRunResponse:
        skill = self._find_skill(agent_id, skill_name)
        if skill is None:
            raise HTTPException(status_code=404, detail=f'Skill {skill_name} not found')
        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
        return AgentSkillRunResponse(
            agent_id=agent_id,
            skill_name=skill_name,
            status='queued',
            requested_at=now,
            message=f'Skill {skill_name} queued for execution on {agent_id}.',
        )

    def list_system_library(self) -> SystemSkillsLibraryResponse:
        aggregated: dict[str, dict[str, Any]] = {}
        for context in profile_contexts():
            for skill_file in self._skill_files(context.profile):
                skill = self._scan_skill(context.profile, skill_file)
                existing = aggregated.setdefault(
                    skill.name,
                    {
                        'name': skill.name,
                        'category': skill.category,
                        'description': skill.description,
                        'source': skill.source,
                        'installed_profiles': [],
                        'updated_at': skill.updated_at,
                    },
                )
                existing['installed_profiles'].append(context.profile)
                if skill.updated_at and (existing['updated_at'] is None or skill.updated_at > existing['updated_at']):
                    existing['updated_at'] = skill.updated_at
                if not existing.get('description') and skill.description:
                    existing['description'] = skill.description
                if not existing.get('category') and skill.category:
                    existing['category'] = skill.category
        items = [
            SystemSkillLibraryItem(
                name=entry['name'],
                category=entry.get('category'),
                description=entry.get('description'),
                source=entry.get('source'),
                installed_profiles=sorted(set(entry['installed_profiles'])),
                profile_count=len(set(entry['installed_profiles'])),
                updated_at=entry.get('updated_at'),
            )
            for entry in aggregated.values()
        ]
        items.sort(key=lambda item: item.name)
        return SystemSkillsLibraryResponse(skills=items, total=len(items))

    def _find_skill(self, agent_id: str, skill_name: str) -> AgentSkill | None:
        for skill_file in self._skill_files(agent_id):
            if skill_file.parent.name == skill_name:
                return self._scan_skill(agent_id, skill_file)
        return None

    def _skill_files(self, agent_id: str) -> list[Path]:
        context = ensure_profile_exists(agent_id)
        skills_root = context.home / 'skills'
        if not skills_root.exists():
            return []
        return sorted(skills_root.glob('**/SKILL.md'), key=lambda path: path.parent.name)

    def _registry_file(self, agent_id: str) -> Path:
        context = ensure_profile_exists(agent_id)
        return context.home / '.skills_registry.json'

    def _load_registry(self, agent_id: str) -> dict[str, Any]:
        payload = load_json_file(self._registry_file(agent_id))
        return payload if isinstance(payload, dict) else {}

    def _write_registry(self, agent_id: str, payload: dict[str, Any]) -> None:
        path = self._registry_file(agent_id)
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

    def _scan_skill(self, agent_id: str, skill_file: Path) -> AgentSkill:
        registry = self._load_registry(agent_id)
        rel = skill_file.relative_to(skill_file.parents[2])
        parts = rel.parts
        category = parts[0] if len(parts) >= 3 else None
        description = self._extract_description(skill_file)
        updated_at = datetime.fromtimestamp(skill_file.stat().st_mtime, tz=timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
        enabled = bool(registry.get(skill_file.parent.name, {}).get('enabled', True))
        return AgentSkill(
            name=skill_file.parent.name,
            category=category,
            description=description,
            source='filesystem',
            installed=True,
            enabled=enabled,
            updated_at=updated_at,
        )

    def _extract_description(self, skill_file: Path) -> str | None:
        try:
            lines = skill_file.read_text(encoding='utf-8').splitlines()
        except OSError:
            return None
        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith('#') or stripped == '---':
                continue
            return stripped
        return None


skill_service = SkillService()
