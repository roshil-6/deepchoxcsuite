from __future__ import annotations

import json
import os
from dataclasses import asdict
from datetime import datetime
from typing import Iterable, Optional

from sqlalchemy import DateTime, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from backend.cofounder.models import Project


def _database_url() -> str:
    return os.getenv("DATABASE_URL") or "sqlite:///backend/cofounder.db"


def _normalize_db_url(raw: str) -> str:
    if raw.startswith("postgres://"):
        return "postgresql+psycopg://" + raw[len("postgres://"):]
    if raw.startswith("postgresql://"):
        return "postgresql+psycopg://" + raw[len("postgresql://"):]
    return raw


class Base(DeclarativeBase):
    pass


class ProjectRow(Base):
    __tablename__ = "cofounder_projects"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    venture_name: Mapped[str] = mapped_column(String(255), default="")
    stage: Mapped[str] = mapped_column(String(32), default="idea")
    completeness_score: Mapped[int] = mapped_column(Integer, default=0)
    project_json: Mapped[str] = mapped_column(Text)


class PlanVersionRow(Base):
    __tablename__ = "cofounder_plan_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(128), index=True)
    version: Mapped[int] = mapped_column(Integer)
    trigger: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    plan_json: Mapped[str] = mapped_column(Text)


class AgentRunRow(Base):
    __tablename__ = "cofounder_agent_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(128), index=True)
    agent: Mapped[str] = mapped_column(String(64))
    trigger: Mapped[str] = mapped_column(String(255))
    outcome: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    writes_json: Mapped[str] = mapped_column(Text)


class SqlAlchemyProjectRepository:
    def __init__(self, database_url: Optional[str] = None) -> None:
        self.database_url = _normalize_db_url(database_url or _database_url())
        self.engine = create_engine(self.database_url, future=True)
        self.session_factory = sessionmaker(self.engine, expire_on_commit=False, future=True)

    def create_all(self) -> None:
        Base.metadata.create_all(self.engine)

    def save(self, project: Project) -> Project:
        project.touch()
        with self.session_factory() as session:
            row = session.get(ProjectRow, project.id)
            created_at = datetime.fromisoformat(project.created_at)
            updated_at = datetime.fromisoformat(project.updated_at)
            payload = json.dumps(asdict(project))

            if row is None:
                row = ProjectRow(
                    id=project.id,
                    created_at=created_at,
                    updated_at=updated_at,
                    venture_name=project.venture_name,
                    stage=project.stage,
                    completeness_score=project.completeness_score,
                    project_json=payload,
                )
                session.add(row)
            else:
                row.updated_at = updated_at
                row.venture_name = project.venture_name
                row.stage = project.stage
                row.completeness_score = project.completeness_score
                row.project_json = payload

            session.query(PlanVersionRow).filter(PlanVersionRow.project_id == project.id).delete()
            for version in project.plan_history:
                session.add(
                    PlanVersionRow(
                        project_id=project.id,
                        version=version.version,
                        trigger=version.trigger,
                        created_at=datetime.fromisoformat(version.created_at),
                        plan_json=json.dumps(asdict(version.plan)),
                    )
                )

            session.query(AgentRunRow).filter(AgentRunRow.project_id == project.id).delete()
            for run in project.run_history:
                session.add(
                    AgentRunRow(
                        project_id=project.id,
                        agent=run.agent,
                        trigger=run.trigger,
                        outcome=run.outcome,
                        created_at=datetime.fromisoformat(run.created_at),
                        writes_json=json.dumps(run.writes),
                    )
                )

            session.commit()
        return project

    def get(self, project_id: str) -> Optional[Project]:
        with self.session_factory() as session:
            row = session.get(ProjectRow, project_id)
            if row is None:
                return None
            payload = json.loads(row.project_json)
            return Project(**payload)

    def all(self) -> Iterable[Project]:
        with self.session_factory() as session:
            rows = session.execute(select(ProjectRow)).scalars().all()
            return [Project(**json.loads(row.project_json)) for row in rows]
