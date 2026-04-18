from __future__ import annotations

from typing import List

from backend.cofounder.models import AgentRunRecord, AssumptionItem, Project, ResearchEntry, RiskItem


class ResearchAgent:
    """
    Production placeholder for background research.
    In a real deployment, replace heuristics with queued web research jobs.
    """

    def enrich_project(self, project: Project, trigger: str) -> Project:
        writes: List[str] = []

        if not project.market_data.summary:
            project.market_data = ResearchEntry(
                summary="Market sizing is not yet confirmed. Initial view: validate a narrow wedge before broad TAM claims.",
                findings=[
                    {
                        "label": "market_scope",
                        "value": "Narrow beachhead recommended before broad market expansion",
                        "confidence": "ASSUMED",
                    },
                    {
                        "label": "research_gap",
                        "value": "Need user interviews, pricing signal, and geography constraints",
                        "confidence": "UNKNOWN",
                    },
                ],
                confidence="ASSUMED",
                sources=["internal_gap_analysis"],
            )
            writes.append("market_data")

        if not project.competitors.summary:
            project.competitors = ResearchEntry(
                summary="Competitive field not confirmed. Treat incumbents and adjacent substitutes as unknown until researched.",
                findings=[
                    {
                        "label": "direct_competitors",
                        "value": "UNKNOWN",
                        "confidence": "UNKNOWN",
                    },
                    {
                        "label": "indirect_competitors",
                        "value": "Assume founder is competing against existing workflows first",
                        "confidence": "ASSUMED",
                    },
                ],
                confidence="UNKNOWN",
                sources=["internal_gap_analysis"],
            )
            writes.append("competitors")

        if not any(r.title == "Unvalidated market demand" for r in project.risks):
            project.risks.append(
                RiskItem(
                    id="risk-market-demand",
                    title="Unvalidated market demand",
                    severity="high",
                    confidence="UNKNOWN",
                    mitigation="Run founder-led discovery calls and capture repeated pains before scaling build scope.",
                    owner="research_agent",
                )
            )
            writes.append("risks")

        if not any(a.id == "assumption-competition" for a in project.assumptions):
            project.assumptions.append(
                AssumptionItem(
                    id="assumption-competition",
                    statement="The current problem is painful enough that existing alternatives are inadequate.",
                    confidence="UNKNOWN",
                    validation_plan="Document top 3 alternatives and why users would switch.",
                )
            )
            writes.append("assumptions")

        project.run_history.append(
            AgentRunRecord(
                agent="research_agent",
                trigger=trigger,
                outcome="gap_enrichment",
                writes=writes or ["none"],
            )
        )
        return project
