from __future__ import annotations

from typing import List

from backend.cofounder.models import (
    AgentRunRecord,
    LivingPlan,
    PlanVersionRecord,
    Project,
    RoadmapItem,
    TaskItem,
)


class DexoExecutionAgent:
    """
    Turns strategy + partial knowledge into a living execution plan.
    Makes decisions under uncertainty while labeling uncertainty explicitly.
    """

    def plan(self, project: Project, trigger: str) -> Project:
        writes: List[str] = []
        previous_plan = project.current_plan

        if not project.roadmap:
            roadmap = [
                RoadmapItem(
                    id="phase-clarify-problem",
                    phase="Clarify problem and wedge",
                    goal="Lock a narrow customer problem worth solving first.",
                    deliverables=[
                        "Validated problem statement",
                        "Defined ICP wedge",
                        "Top 3 assumptions to test",
                    ],
                    dependencies=[],
                    status="active",
                ),
                RoadmapItem(
                    id="phase-test-demand",
                    phase="Test demand and willingness",
                    goal="Confirm demand before scaling product scope.",
                    deliverables=[
                        "Interview notes",
                        "Offer / pricing signal",
                        "Early commitment evidence",
                    ],
                    dependencies=["phase-clarify-problem"],
                ),
            ]
            project.roadmap = roadmap
            writes.append("roadmap")

        project.tasks = self._build_tasks(project)
        writes.append("tasks")

        if project.idea and project.target_audience and not project.positioning:
            project.positioning = f"Focused solution for {project.target_audience} around {project.idea[:100]}"
            writes.append("positioning")

        next_version = max(1, previous_plan.version + 1 if previous_plan else 1)
        daily_actions = [task.title for task in project.tasks[:5]]
        weekly_priorities = [item.phase for item in project.roadmap[:3]]
        delta_summary = self._build_delta_summary(previous_plan, project, trigger)
        project.current_plan = LivingPlan(
            version=next_version,
            roadmap=list(project.roadmap),
            tasks=list(project.tasks),
            blockers=list(project.risks),
            daily_actions=daily_actions,
            weekly_priorities=weekly_priorities,
            open_questions=list(project.critical_questions),
            delta_summary=delta_summary,
        )
        project.plan_history.append(
            PlanVersionRecord(
                project_id=project.id,
                version=next_version,
                trigger=trigger,
                plan=project.current_plan,
            )
        )
        writes.extend(["current_plan", "plan_history"])

        project.run_history.append(
            AgentRunRecord(
                agent="dexo_execution",
                trigger=trigger,
                outcome="execution_plan_updated",
                writes=writes,
            )
        )
        return project

    def _build_delta_summary(self, previous_plan: LivingPlan, project: Project, trigger: str) -> List[str]:
        if not previous_plan or previous_plan.version <= 1:
            return [
                "Initialized the first living plan from current project state.",
                f"Trigger: {trigger}.",
            ]

        deltas: List[str] = []
        previous_tasks = {task.title for task in previous_plan.tasks}
        current_tasks = {task.title for task in project.tasks}
        new_tasks = sorted(current_tasks - previous_tasks)
        if new_tasks:
            deltas.append(f"Added or reprioritized {len(new_tasks)} execution tasks.")

        previous_phase = previous_plan.roadmap[0].phase if previous_plan.roadmap else ""
        current_phase = project.roadmap[0].phase if project.roadmap else ""
        if previous_phase and current_phase and previous_phase != current_phase:
            deltas.append(f"Active phase changed from '{previous_phase}' to '{current_phase}'.")

        if not deltas:
            deltas.append("Refreshed the living plan with the latest venture state.")
        deltas.append(f"Trigger: {trigger}.")
        return deltas[:4]

    def _build_tasks(self, project: Project) -> List[TaskItem]:
        today_actions = [
            (
                "task-define-icp",
                "Define the first ICP segment narrowly enough to exclude weak-fit customers",
                "personal_architect",
                "critical",
                "todo",
                "Broad audiences create fake momentum and weak execution decisions.",
            ),
            (
                "task-run-discovery",
                "Schedule 5 founder-led discovery conversations with likely ICP candidates",
                "research_agent",
                "high",
                "todo",
                "This is the fastest way to replace assumptions with evidence.",
            ),
            (
                "task-document-risks",
                "Rank top venture risks by severity and unknowns",
                "dexo_execution",
                "high",
                "todo",
                "Execution should be driven by the most dangerous unknown, not by generic build activity.",
            ),
        ]

        if project.stage in {"mvp", "revenue", "scaling"}:
            today_actions[1] = (
                "task-analyze-traction",
                "Review traction evidence and isolate the strongest repeatable growth signal",
                "research_agent",
                "high",
                "todo",
                "At this stage, growth learning matters more than generic discovery advice.",
            )

        return [
            TaskItem(
                id=task_id,
                title=title,
                owner=owner,
                priority=priority,
                status=status,
                rationale=rationale,
                due_hint="today",
            )
            for task_id, title, owner, priority, status, rationale in today_actions
        ]
