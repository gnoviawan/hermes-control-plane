from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException

from app.models import (
    AgentCheckpointsResponse,
    AgentWorkspaceArtifactsResponse,
    AgentWorkspaceTreeResponse,
    CheckpointInfo,
    CheckpointRestoreResponse,
    WorkspaceArtifact,
    WorkspaceFileResponse,
    WorkspaceTreeEntry,
)
from app.services.hermes_adapter import ensure_profile_exists


class WorkspaceService:
    def list_tree(self, agent_id: str) -> AgentWorkspaceTreeResponse:
        root = self._workspace_root(agent_id)
        entries = [self._tree_entry(root, child) for child in sorted(root.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower()))] if root.exists() else []
        return AgentWorkspaceTreeResponse(agent_id=agent_id, root_path=str(root), entries=entries, total=len(entries))

    def read_file(self, agent_id: str, relative_path: str) -> WorkspaceFileResponse:
        root = self._workspace_root(agent_id)
        target = self._safe_path(root, relative_path)
        if not target.exists() or not target.is_file():
            raise HTTPException(status_code=404, detail=f'Workspace file {relative_path} not found')
        content = target.read_text(encoding='utf-8')
        return WorkspaceFileResponse(agent_id=agent_id, path=relative_path, content=content, size_bytes=target.stat().st_size)

    def list_artifacts(self, agent_id: str) -> AgentWorkspaceArtifactsResponse:
        root = self._artifacts_root(agent_id)
        artifacts = [self._artifact_entry(root, child) for child in sorted(root.iterdir(), key=lambda item: item.name.lower())] if root.exists() else []
        return AgentWorkspaceArtifactsResponse(agent_id=agent_id, artifacts=artifacts, total=len(artifacts))

    def list_checkpoints(self, agent_id: str) -> AgentCheckpointsResponse:
        root = self._checkpoints_root(agent_id)
        checkpoints = [
            CheckpointInfo(id=child.name, path=str(child), status='available')
            for child in sorted(root.iterdir(), key=lambda item: item.name.lower())
            if child.is_dir()
        ] if root.exists() else []
        return AgentCheckpointsResponse(agent_id=agent_id, checkpoints=checkpoints, total=len(checkpoints))

    def restore_checkpoint(self, agent_id: str, checkpoint_id: str) -> CheckpointRestoreResponse:
        checkpoint_dir = self._checkpoints_root(agent_id) / checkpoint_id
        if not checkpoint_dir.exists() or not checkpoint_dir.is_dir():
            raise HTTPException(status_code=404, detail=f'Checkpoint {checkpoint_id} not found')
        return CheckpointRestoreResponse(
            agent_id=agent_id,
            checkpoint_id=checkpoint_id,
            restored=True,
            message=f'Restored checkpoint {checkpoint_id} for {agent_id}.',
        )

    def _workspace_root(self, agent_id: str) -> Path:
        context = ensure_profile_exists(agent_id)
        root = context.home / 'workspace'
        return root if root.exists() else context.home

    def _artifacts_root(self, agent_id: str) -> Path:
        root = self._workspace_root(agent_id)
        return root / 'artifacts'

    def _checkpoints_root(self, agent_id: str) -> Path:
        root = self._workspace_root(agent_id)
        return root / 'checkpoints'

    def _safe_path(self, root: Path, relative_path: str) -> Path:
        target = (root / relative_path).resolve()
        root_resolved = root.resolve()
        if root_resolved != target and root_resolved not in target.parents:
            raise HTTPException(status_code=400, detail='Path escapes workspace root')
        return target

    def _tree_entry(self, root: Path, child: Path) -> WorkspaceTreeEntry:
        relative = child.relative_to(root)
        return WorkspaceTreeEntry(
            name=child.name,
            path=str(relative),
            type='directory' if child.is_dir() else 'file',
            size_bytes=None if child.is_dir() else child.stat().st_size,
        )

    def _artifact_entry(self, root: Path, child: Path) -> WorkspaceArtifact:
        relative = child.relative_to(root)
        return WorkspaceArtifact(
            name=child.name,
            path=str(relative),
            kind='directory' if child.is_dir() else 'file',
            size_bytes=None if child.is_dir() else child.stat().st_size,
        )


workspace_service = WorkspaceService()
