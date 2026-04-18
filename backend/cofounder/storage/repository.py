from __future__ import annotations

from copy import deepcopy
from typing import Dict, Iterable, Optional

from backend.cofounder.models import Project


class InMemoryProjectRepository:
    """
    Flask-compatible starter repository.
    Replace with a real DB adapter later without changing the loop engine.
    """

    def __init__(self) -> None:
        self._projects: Dict[str, Project] = {}

    def save(self, project: Project) -> Project:
        project.touch()
        self._projects[project.id] = deepcopy(project)
        return deepcopy(project)

    def get(self, project_id: str) -> Optional[Project]:
        project = self._projects.get(project_id)
        return deepcopy(project) if project else None

    def all(self) -> Iterable[Project]:
        return [deepcopy(project) for project in self._projects.values()]
