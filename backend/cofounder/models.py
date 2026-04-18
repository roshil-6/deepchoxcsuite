from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


Confidence = Literal["CONFIRMED", "ASSUMED", "UNKNOWN"]
ProjectStage = Literal["idea", "prototype", "mvp", "revenue", "scaling"]


@dataclass
class EvidenceItem:
    value: str
    confidence: Confidence = "UNKNOWN"
    source: str = ""
    updated_at: str = field(default_factory=utc_now_iso)


@dataclass
class ResearchEntry:
    summary: str = ""
    findings: List[Dict[str, Any]] = field(default_factory=list)
    confidence: Confidence = "UNKNOWN"
    sources: List[str] = field(default_factory=list)
    updated_at: str = field(default_factory=utc_now_iso)


@dataclass
class TaskItem:
    id: str
    title: str
    owner: str
    priority: Literal["critical", "high", "medium", "low"]
    status: Literal["todo", "in_progress", "blocked", "done"]
    rationale: str
    due_hint: str = ""
    created_at: str = field(default_factory=utc_now_iso)


@dataclass
class RiskItem:
    id: str
    title: str
    severity: Literal["critical", "high", "medium", "low"]
    confidence: Confidence
    mitigation: str
    owner: str = "dexo"
    updated_at: str = field(default_factory=utc_now_iso)


@dataclass
class AssumptionItem:
    id: str
    statement: str
    confidence: Confidence
    validation_plan: str
    updated_at: str = field(default_factory=utc_now_iso)


@dataclass
class RoadmapItem:
    id: str
    phase: str
    goal: str
    deliverables: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    status: Literal["planned", "active", "done", "blocked"] = "planned"
    updated_at: str = field(default_factory=utc_now_iso)


@dataclass
class DeskFeed:
    what_i_learned: List[str] = field(default_factory=list)
    what_changed: List[str] = field(default_factory=list)
    next_actions: List[str] = field(default_factory=list)
    risks: List[str] = field(default_factory=list)
    questions_for_user: List[str] = field(default_factory=list)
    generated_at: str = field(default_factory=utc_now_iso)


@dataclass
class LivingPlan:
    version: int = 1
    last_updated: str = field(default_factory=utc_now_iso)
    roadmap: List[RoadmapItem] = field(default_factory=list)
    tasks: List[TaskItem] = field(default_factory=list)
    blockers: List[RiskItem] = field(default_factory=list)
    daily_actions: List[str] = field(default_factory=list)
    weekly_priorities: List[str] = field(default_factory=list)
    open_questions: List[str] = field(default_factory=list)
    delta_summary: List[str] = field(default_factory=list)


@dataclass
class PlanVersionRecord:
    project_id: str
    version: int
    trigger: str
    created_at: str = field(default_factory=utc_now_iso)
    plan: LivingPlan = field(default_factory=LivingPlan)


@dataclass
class AgentRunRecord:
    agent: str
    trigger: str
    outcome: str
    writes: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=utc_now_iso)


@dataclass
class Project:
    id: str
    created_at: str = field(default_factory=utc_now_iso)
    updated_at: str = field(default_factory=utc_now_iso)

    idea: str = ""
    problem: str = ""
    target_audience: str = ""
    market_data: ResearchEntry = field(default_factory=ResearchEntry)
    competitors: ResearchEntry = field(default_factory=ResearchEntry)
    positioning: str = ""
    roadmap: List[RoadmapItem] = field(default_factory=list)
    tasks: List[TaskItem] = field(default_factory=list)
    risks: List[RiskItem] = field(default_factory=list)
    assumptions: List[AssumptionItem] = field(default_factory=list)
    knowledge_log: List[str] = field(default_factory=list)

    venture_name: str = ""
    domain: str = ""
    industry_vertical: str = ""
    business_model: str = ""
    stage: ProjectStage = "idea"
    founder_goals: List[str] = field(default_factory=list)
    founder_thesis: str = ""
    unique_insight: str = ""

    current_plan: LivingPlan = field(default_factory=LivingPlan)
    plan_history: List[PlanVersionRecord] = field(default_factory=list)
    desk_feed: DeskFeed = field(default_factory=DeskFeed)
    critical_questions: List[str] = field(default_factory=list)
    missing_fields: List[str] = field(default_factory=list)
    weak_fields: List[str] = field(default_factory=list)
    completeness_score: int = 0
    run_history: List[AgentRunRecord] = field(default_factory=list)

    def touch(self) -> None:
        self.updated_at = utc_now_iso()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def create(cls, venture_name: str = "") -> "Project":
        return cls(id=str(uuid4()), venture_name=venture_name)
