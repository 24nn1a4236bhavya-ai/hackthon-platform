import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class ProjectStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"

class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("hackathon_id", "team_id", name="uq_hackathon_team_project"),)

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    track_id = Column(Integer, ForeignKey("hackathon_tracks.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(200), nullable=False)
    tagline = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    demo_url = Column(String(500), nullable=True)
    repo_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    presentation_url = Column(String(500), nullable=True)
    tech_stack = Column(Text, nullable=True)  # Comma-separated or JSON list
    cover_image_url = Column(String(500), nullable=True)
    additional_info = Column(Text, nullable=True)
    
    status = Column(Enum(ProjectStatus), default=ProjectStatus.DRAFT, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    hackathon = relationship("Hackathon", back_populates="projects")
    team = relationship("Team", back_populates="project")
    track = relationship("HackathonTrack", back_populates="projects")
    assignments = relationship("JudgeAssignment", back_populates="project", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="project", cascade="all, delete-orphan")
    votes = relationship("CommunityVote", back_populates="project", cascade="all, delete-orphan")
