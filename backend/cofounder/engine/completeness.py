from __future__ import annotations

from typing import List, Tuple

from backend.cofounder.models import Project


FIELD_CHECKS = [
    ("idea", lambda p: bool(p.idea.strip())),
    ("problem", lambda p: bool(p.problem.strip())),
    ("target_audience", lambda p: bool(p.target_audience.strip())),
    ("positioning", lambda p: bool(p.positioning.strip())),
    ("venture_name", lambda p: bool(p.venture_name.strip())),
    ("domain", lambda p: bool(p.domain.strip())),
    ("industry_vertical", lambda p: bool(p.industry_vertical.strip())),
    ("business_model", lambda p: bool(p.business_model.strip())),
    ("founder_thesis", lambda p: bool(p.founder_thesis.strip())),
    ("unique_insight", lambda p: bool(p.unique_insight.strip())),
    ("market_data", lambda p: bool(p.market_data.summary.strip()) or len(p.market_data.findings) > 0),
    ("competitors", lambda p: bool(p.competitors.summary.strip()) or len(p.competitors.findings) > 0),
    ("roadmap", lambda p: len(p.roadmap) > 0),
    ("tasks", lambda p: len(p.tasks) > 0),
    ("risks", lambda p: len(p.risks) > 0),
    ("assumptions", lambda p: len(p.assumptions) > 0),
]


def analyze_project_completeness(project: Project) -> Tuple[int, List[str], List[str]]:
    filled: List[str] = []
    missing: List[str] = []
    for field_name, check in FIELD_CHECKS:
        if check(project):
            filled.append(field_name)
        else:
            missing.append(field_name)

    weak: List[str] = []
    if project.idea.strip() and len(project.idea.strip()) < 60:
        weak.append("idea")
    if project.problem.strip() and len(project.problem.strip()) < 60:
        weak.append("problem")
    if project.target_audience.strip() and len(project.target_audience.strip()) < 35:
        weak.append("target_audience")
    if project.positioning.strip() and len(project.positioning.strip()) < 35:
        weak.append("positioning")

    score = round((len(filled) / max(1, len(FIELD_CHECKS))) * 100)
    return score, missing, weak
