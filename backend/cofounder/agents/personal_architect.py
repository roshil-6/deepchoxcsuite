from __future__ import annotations

import re
from typing import Dict, List, Optional

from backend.cofounder.models import AgentRunRecord, AssumptionItem, Project, utc_now_iso


class PersonalArchitectAgent:
    """
    Intake + semantic updater.
    Converts messy founder language into structured project state.
    """

    STAGE_KEYWORDS = {
        "idea": "idea",
        "prototype": "prototype",
        "mvp": "mvp",
        "revenue": "revenue",
        "scaling": "scaling",
        "scale": "scaling",
    }

    def apply_founder_input(self, project: Project, user_input: str, trigger: str) -> Project:
        text = user_input.strip()
        if not text:
            return project

        lowered = text.lower()
        sentences = [s.strip(" .") for s in re.split(r"[.!?]\s+", text) if s.strip()]
        writes: List[str] = []

        if not project.idea:
            project.idea = text
            writes.append("idea")

        problem = self._infer_problem(sentences)
        if problem and problem != project.problem:
            project.problem = problem
            writes.append("problem")

        audience = self._infer_target_audience(sentences)
        if audience and audience != project.target_audience:
            project.target_audience = audience
            writes.append("target_audience")

        if not project.founder_thesis:
            thesis = self._infer_thesis(text)
            if thesis:
                project.founder_thesis = thesis
                writes.append("founder_thesis")

        if not project.unique_insight:
            unique = self._extract_after_patterns(
                lowered,
                text,
                ["unique insight is", "our insight is", "our edge is", "why now is"],
            )
            if unique:
                project.unique_insight = unique
                writes.append("unique_insight")

        stage = self._infer_stage(lowered)
        if stage and stage != project.stage:
            project.stage = stage
            writes.append("stage")

        business_model = self._infer_business_model(lowered)
        if business_model and business_model != project.business_model:
            project.business_model = business_model
            writes.append("business_model")

        domain = self._infer_domain(text)
        if domain and not project.domain:
            project.domain = domain
            writes.append("domain")

        if not project.positioning:
            positioning = self._infer_positioning(project)
            if positioning:
                project.positioning = positioning
                writes.append("positioning")

        if not project.assumptions:
            project.assumptions.append(
                AssumptionItem(
                    id="assumption-initial-icp",
                    statement="The currently described target audience is specific enough to prioritize execution.",
                    confidence="UNKNOWN",
                    validation_plan="Validate with 5-10 discovery conversations before scaling scope.",
                )
            )
            writes.append("assumptions")

        project.knowledge_log.append(
            f"{utc_now_iso()} :: founder_input_processed :: {text[:180]}"
        )
        project.run_history.append(
            AgentRunRecord(
                agent="personal_architect",
                trigger=trigger,
                outcome="structured_founder_input",
                writes=writes or ["knowledge_log"],
            )
        )
        return project

    def generate_high_leverage_questions(self, project: Project) -> List[str]:
        questions: List[str] = []
        if not project.problem:
            questions.append("What exact problem is painful enough that someone would urgently switch to your solution?")
        if not project.target_audience:
            questions.append("Who is the first customer you want to win, specifically enough that we can reject everyone else for now?")
        if not project.business_model:
            questions.append("How does this venture make money first: software subscription, services, hardware, marketplace, or another model?")
        if not project.unique_insight:
            questions.append("What do you believe is true about this market that most competitors still underestimate?")
        return questions[:2]

    def _extract_after_patterns(self, lowered: str, original: str, patterns: List[str]) -> Optional[str]:
        for pattern in patterns:
            idx = lowered.find(pattern)
            if idx >= 0:
                return original[idx + len(pattern):].strip(" .:-\n\t")
        return None

    def _infer_stage(self, lowered: str) -> Optional[str]:
        for key, stage in self.STAGE_KEYWORDS.items():
            if re.search(rf"\b{re.escape(key)}\b", lowered):
                return stage
        return None

    def _infer_business_model(self, lowered: str) -> Optional[str]:
        candidates: Dict[str, List[str]] = {
            "saas": ["saas", "subscription", "software platform"],
            "marketplace": ["marketplace", "take rate", "buyers and sellers"],
            "services": ["agency", "services", "consulting"],
            "hardware": ["hardware", "device", "sensor"],
            "consumer_app": ["consumer app", "mobile app", "creator tool"],
        }
        for label, keys in candidates.items():
            if any(k in lowered for k in keys):
                return label
        return None

    def _infer_thesis(self, text: str) -> Optional[str]:
        sentences = [s.strip() for s in re.split(r"[.!?]\s+", text) if s.strip()]
        return sentences[0] if sentences else None

    def _infer_problem(self, sentences: List[str]) -> Optional[str]:
        for sentence in sentences:
            lower = sentence.lower()
            if "problem is" in lower:
                return sentence.split("problem is", 1)[1].strip(" .:-")
            if "pain point is" in lower:
                return sentence.split("pain point is", 1)[1].strip(" .:-")
            if "still " in lower and ("fragmented" in lower or "manual" in lower or "broken" in lower):
                return sentence
        return None

    def _infer_target_audience(self, sentences: List[str]) -> Optional[str]:
        for sentence in sentences:
            lower = sentence.lower()
            if "target audience is" in lower:
                return sentence.split("target audience is", 1)[1].strip(" .:-")
            if "icp is" in lower:
                return sentence.split("icp is", 1)[1].strip(" .:-")
            if "for " in lower and lower.startswith(("we are building", "we built", "we're building")):
                tail = sentence.split("for ", 1)[1].strip(" .:-")
                if len(tail) < 120:
                    return tail
        return None

    def _infer_domain(self, text: str) -> Optional[str]:
        words = [w for w in re.split(r"[^A-Za-z0-9]+", text) if len(w) > 3]
        if not words:
            return None
        return " ".join(words[:3])

    def _infer_positioning(self, project: Project) -> Optional[str]:
        if project.idea and project.target_audience:
            return f"{project.idea[:120]} for {project.target_audience[:80]}"
        return None
