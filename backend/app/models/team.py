import enum
import secrets
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class TeamRole(str, enum.Enum):
    LEADER = "LEADER"
    MEMBER = "MEMBER"

def generate_invite_code():
    return secrets.token_hex(4).upper()

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    invite_code = Column(String(32), unique=True, index=True, default=generate_invite_code, nullable=False)
    leader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    hackathon = relationship("Hackathon", back_populates="teams")
    leader = relationship("User", foreign_keys=[leader_id])
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    project = relationship("Project", back_populates="team", uselist=False, cascade="all, delete-orphan")

class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_user"),)

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(TeamRole), default=TeamRole.MEMBER, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")
