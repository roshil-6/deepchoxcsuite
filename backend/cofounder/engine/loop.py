from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from backend.cofounder.agents.dexo_execution import DexoExecutionAgent
from backend.cofounder.agents.personal_architect import PersonalArchitectAgent
from backend.cofounder.agents.research_agent import ResearchAgent
from backend.cofounder.engine.completeness import analyze_project_completeness
from backend.cofounder.engine.desk_feed import generate_desk_feed
from backend.cofounder.models import Project


@dataclass
class LoopResult:
    project: Project
    triggered_agents: List[str] = field(default_factory=list)
    critical_questions: List[str] = field(default_factory=list)
    completeness_score: int = 0
    missing_fields: List[str] = field(default_factory=list)
    weak_fields: List[str] = field(default_factory=list)


class CofounderLoopEngine:
    def __init__(
        self,
        personal_architect: Optional[PersonalArchitectAgent] = None,
        research_agent: Optional[ResearchAgent] = None,
        dexo_execution: Optional[DexoExecutionAgent] = None,
    ) -> None:
        self.personal_architect = personal_architect or PersonalArchitectAgent()
        self.research_agent = research_agent or ResearchAgent()
        self.dexo_execution = dexo_execution or DexoExecutionAgent()

    def run_cofounder_loop(
        self,
        project: Project,
        trigger: str,
        founder_input: str = "",
    ) -> LoopResult:
        triggered_agents: List[str] = []

        if founder_input.strip():
            project = self.personal_architect.apply_founder_input(
                project, founder_input, trigger=f"{trigger}:founder_input"
            )
            triggered_agents.append("personal_architect")

        completeness_score, missing_fields, weak_fields = analyze_project_completeness(project)
        project.completeness_score = completeness_score
        project.missing_fields = missing_fields
        project.weak_fields = weak_fields

        if missing_fields or weak_fields:
            project = self.research_agent.enrich_project(project, trigger=f"{trigger}:gap_fill")
            triggered_agents.append("research_agent")

        if founder_input.strip() or project.roadmap == [] or "positioning" in missing_fields:
            project = self.dexo_execution.plan(project, trigger=f"{trigger}:execution_plan")
            triggered_agents.append("dexo_execution")

        completeness_score, missing_fields, weak_fields = analyze_project_completeness(project)
        project.completeness_score = completeness_score
        project.missing_fields = missing_fields
        project.weak_fields = weak_fields
        project.critical_questions = self.personal_architect.generate_high_leverage_questions(project)

        if project.current_plan:
            project.current_plan.open_questions = list(project.critical_questions)
            project.current_plan.daily_actions = [task.title for task in project.tasks[:5]]
            project.current_plan.weekly_priorities = [item.phase for item in project.roadmap[:3]]

        project.desk_feed = generate_desk_feed(project)
        project.touch()

        return LoopResult(
            project=project,
            triggered_agents=triggered_agents,
            critical_questions=project.critical_questions,
            completeness_score=completeness_score,
            missing_fields=missing_fields,
            weak_fields=weak_fields,
        )
