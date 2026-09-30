import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class HackathonStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    REGISTRATION_OPEN = "REGISTRATION_OPEN"
    SUBMISSION_OPEN = "SUBMISSION_OPEN"
    JUDGING = "JUDGING"
    VOTING = "VOTING"
    COMPLETED = "COMPLETED"

class RegistrationStatus(str, enum.Enum):
    REGISTERED = "REGISTERED"
    CHECKED_IN = "CHECKED_IN"
    WITHDRAWN = "WITHDRAWN"

class Hackathon(Base):
    __tablename__ = "hackathons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, index=True, nullable=False)
    tagline = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    banner_url = Column(String(500), nullable=True)
    status = Column(Enum(HackathonStatus), default=HackathonStatus.DRAFT, nullable=False)
    
    # Event rules and contacts
    rules = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    website_url = Column(String(500), nullable=True)
    
    # Lifecycle dates
    event_start = Column(DateTime, nullable=True)
    event_end = Column(DateTime, nullable=True)
    registration_start = Column(DateTime, nullable=False)
    registration_deadline = Column(DateTime, nullable=False)
    submission_deadline = Column(DateTime, nullable=False)
    judging_deadline = Column(DateTime, nullable=False)
    result_publication_date = Column(DateTime, nullable=True)
    
    # Submission configuration
    required_fields = Column(String(500), default="", nullable=True)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_community_voting_enabled = Column(Boolean, default=True, nullable=False)
    min_team_size = Column(Integer, default=1, nullable=False)
    max_team_size = Column(Integer, default=4, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    creator = relationship("User", back_populates="created_hackathons", foreign_keys=[created_by_id])
    tracks = relationship("HackathonTrack", back_populates="hackathon", cascade="all, delete-orphan")
    prizes = relationship("HackathonPrize", back_populates="hackathon", cascade="all, delete-orphan")
    registrations = relationship("HackathonRegistration", back_populates="hackathon", cascade="all, delete-orphan")
    teams = relationship("Team", back_populates="hackathon", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="hackathon", cascade="all, delete-orphan")
    rubrics = relationship("Rubric", back_populates="hackathon", cascade="all, delete-orphan")
    assignments = relationship("JudgeAssignment", back_populates="hackathon", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="hackathon", cascade="all, delete-orphan")
    votes = relationship("CommunityVote", back_populates="hackathon", cascade="all, delete-orphan")

class HackathonTrack(Base):
    __tablename__ = "hackathon_tracks"

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    hackathon = relationship("Hackathon", back_populates="tracks")
    projects = relationship("Project", back_populates="track")

class HackathonPrize(Base):
    __tablename__ = "hackathon_prizes"

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    amount = Column(String(100), nullable=True)  # e.g. "₹100,000", "$5,000"
    reward_amount = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    place = Column(Integer, nullable=True)
    track_id = Column(Integer, nullable=True)

    hackathon = relationship("Hackathon", back_populates="prizes")

class HackathonRegistration(Base):
    __tablename__ = "hackathon_registrations"
    __table_args__ = (UniqueConstraint("hackathon_id", "user_id", name="uq_hackathon_user_reg"),)

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(RegistrationStatus), default=RegistrationStatus.REGISTERED, nullable=False)
    registered_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    hackathon = relationship("Hackathon", back_populates="registrations")
    user = relationship("User", back_populates="registrations")
