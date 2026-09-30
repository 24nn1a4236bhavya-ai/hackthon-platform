from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class CommunityVote(Base):
    __tablename__ = "community_votes"
    __table_args__ = (UniqueConstraint("hackathon_id", "project_id", "user_id", name="uq_user_hackathon_project_vote"),)

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    hackathon = relationship("Hackathon", back_populates="votes")
    project = relationship("Project", back_populates="votes")
    user = relationship("User", back_populates="votes")
