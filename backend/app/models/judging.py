import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class AssignmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"

class JudgeAssignment(Base):
    __tablename__ = "judge_assignments"
    __table_args__ = (UniqueConstraint("judge_id", "project_id", name="uq_judge_project_assignment"),)

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False)
    judge_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.PENDING, nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    hackathon = relationship("Hackathon", back_populates="assignments")
    judge = relationship("User", back_populates="judge_assignments")
    project = relationship("Project", back_populates="assignments")

class Evaluation(Base):
    __tablename__ = "evaluations"
    __table_args__ = (UniqueConstraint("project_id", "judge_id", name="uq_project_judge_eval"),)

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    judge_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    private_notes = Column(Text, nullable=True)
    public_feedback = Column(Text, nullable=True)
    total_raw_score = Column(Float, default=0.0, nullable=False)  # Scaled 0 to 100 based on weighted rubric
    
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    hackathon = relationship("Hackathon", back_populates="evaluations")
    project = relationship("Project", back_populates="evaluations")
    judge = relationship("User", back_populates="evaluations")
    criterion_scores = relationship("CriterionScore", back_populates="evaluation", cascade="all, delete-orphan")

class CriterionScore(Base):
    __tablename__ = "criterion_scores"
    __table_args__ = (UniqueConstraint("evaluation_id", "criterion_id", name="uq_eval_criterion"),)

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False)
    criterion_id = Column(Integer, ForeignKey("rubric_criteria.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)

    evaluation = relationship("Evaluation", back_populates="criterion_scores")
    criterion = relationship("RubricCriterion", back_populates="scores")
