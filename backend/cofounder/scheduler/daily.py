from __future__ import annotations

from typing import List

from backend.cofounder.engine.loop import CofounderLoopEngine, LoopResult
from backend.cofounder.storage.repository import InMemoryProjectRepository


class DailyLoopScheduler:
    """
    Scheduler-friendly wrapper.
    In production, call this from cron / APScheduler / Celery beat.
    """

    def __init__(
        self,
        repository: InMemoryProjectRepository,
        engine: CofounderLoopEngine,
    ) -> None:
        self.repository = repository
        self.engine = engine

    def run_daily_loop(self) -> List[LoopResult]:
        results: List[LoopResult] = []
        for project in self.repository.all():
            result = self.engine.run_cofounder_loop(project, trigger="daily_cron")
            self.repository.save(result.project)
            results.append(result)
        return results
