from __future__ import annotations

from flask import Flask, jsonify, request

from backend.cofounder.engine.loop import CofounderLoopEngine
from backend.cofounder.models import Project
from backend.cofounder.scheduler.daily import DailyLoopScheduler
from backend.cofounder.storage.sqlalchemy_repository import SqlAlchemyProjectRepository


repository = SqlAlchemyProjectRepository()
repository.create_all()
engine = CofounderLoopEngine()
scheduler = DailyLoopScheduler(repository=repository, engine=engine)

app = Flask(__name__)


@app.post("/projects")
def create_project():
    body = request.get_json(silent=True) or {}
    venture_name = str(body.get("venture_name", "")).strip()
    founder_input = str(body.get("founder_input", "")).strip()

    project = Project.create(venture_name=venture_name)
    result = engine.run_cofounder_loop(project, trigger="project_creation", founder_input=founder_input)
    saved = repository.save(result.project)
    return jsonify(
        {
            "project": saved.to_dict(),
            "triggered_agents": result.triggered_agents,
            "critical_questions": result.critical_questions,
        }
    )


@app.post("/projects/<project_id>/input")
def update_project_from_input(project_id: str):
    project = repository.get(project_id)
    if not project:
        return jsonify({"error": "project_not_found"}), 404

    body = request.get_json(silent=True) or {}
    founder_input = str(body.get("founder_input", "")).strip()
    result = engine.run_cofounder_loop(project, trigger="major_update", founder_input=founder_input)
    saved = repository.save(result.project)
    return jsonify(
        {
            "project": saved.to_dict(),
            "triggered_agents": result.triggered_agents,
            "critical_questions": result.critical_questions,
        }
    )


@app.post("/scheduler/daily")
def run_daily_scheduler():
    results = scheduler.run_daily_loop()
    return jsonify(
        {
            "processed_projects": len(results),
            "projects": [result.project.to_dict() for result in results],
        }
    )


@app.get("/projects/<project_id>")
def get_project(project_id: str):
    project = repository.get(project_id)
    if not project:
        return jsonify({"error": "project_not_found"}), 404
    return jsonify(project.to_dict())


if __name__ == "__main__":
    app.run(debug=True, port=5051)
