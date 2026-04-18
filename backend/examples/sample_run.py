from __future__ import annotations

import json

from backend.cofounder.engine.loop import CofounderLoopEngine
from backend.cofounder.models import Project


def main() -> None:
    engine = CofounderLoopEngine()
    project = Project.create(venture_name="NorthROSC")

    founder_input = (
        "We are building AI workflow software for hospital operations teams. "
        "The problem is hospital administrators still coordinate staffing, incidents, and compliance through fragmented tools. "
        "Our target audience is multi-site hospital operations leaders in India and the GCC. "
        "We are at MVP stage and our edge is that we unify execution, risk visibility, and compliance actioning in one operating layer."
    )

    result = engine.run_cofounder_loop(project, trigger="project_creation", founder_input=founder_input)

    print("Triggered agents:", ", ".join(result.triggered_agents))
    print("Critical questions:", result.critical_questions)
    print(json.dumps(result.project.to_dict(), indent=2))


if __name__ == "__main__":
    main()
