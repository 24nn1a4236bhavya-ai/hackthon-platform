import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    PARTICIPANT = "PARTICIPANT"
    JUDGE = "JUDGE"
    ORGANIZER = "ORGANIZER"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PARTICIPANT, nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Extended real-world profile fields
    institution = Column(String(200), nullable=True)
    organization = Column(String(200), nullable=True)
    skills = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    created_hackathons = relationship("Hackathon", back_populates="creator", foreign_keys="Hackathon.created_by_id")
    registrations = relationship("HackathonRegistration", back_populates="user", cascade="all, delete-orphan")
    team_memberships = relationship("TeamMember", back_populates="user", cascade="all, delete-orphan")
    judge_assignments = relationship("JudgeAssignment", back_populates="judge", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="judge", cascade="all, delete-orphan")
    votes = relationship("CommunityVote", back_populates="user", cascade="all, delete-orphan")
