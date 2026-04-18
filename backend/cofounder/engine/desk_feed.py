from __future__ import annotations

from backend.cofounder.models import DeskFeed, Project, utc_now_iso


def generate_desk_feed(project: Project) -> DeskFeed:
    what_i_learned = []
    what_changed = []
    plan = project.current_plan
    next_actions = list(plan.daily_actions[:5]) if plan and plan.daily_actions else [task.title for task in project.tasks[:5]]
    risks = [f"{risk.severity.upper()}: {risk.title} — {risk.mitigation}" for risk in project.risks[:4]]
    questions = project.critical_questions[:3]

    if project.market_data.summary:
        what_i_learned.append(project.market_data.summary)
    if project.competitors.summary:
        what_i_learned.append(project.competitors.summary)

    if project.missing_fields:
        what_changed.append(
            f"System still sees missing fields: {', '.join(project.missing_fields[:6])}."
        )
    if project.weak_fields:
        what_changed.append(
            f"System tightened weak fields and marked them for refinement: {', '.join(project.weak_fields[:4])}."
        )
    if plan and plan.delta_summary:
        what_changed.extend(plan.delta_summary[:2])
    elif project.roadmap:
        what_changed.append(f"Execution plan active phase: {project.roadmap[0].phase}.")

    return DeskFeed(
        what_i_learned=what_i_learned[:4],
        what_changed=what_changed[:4],
        next_actions=next_actions,
        risks=risks,
        questions_for_user=questions,
        generated_at=utc_now_iso(),
    )
