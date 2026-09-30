from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Rubric(Base):
    __tablename__ = "rubrics"

    id = Column(Integer, primary_key=True, index=True)
    hackathon_id = Column(Integer, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    hackathon = relationship("Hackathon", back_populates="rubrics")
    criteria = relationship("RubricCriterion", back_populates="rubric", cascade="all, delete-orphan")

class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id = Column(Integer, primary_key=True, index=True)
    rubric_id = Column(Integer, ForeignKey("rubrics.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    max_points = Column(Float, default=10.0, nullable=False)
    weight = Column(Float, default=0.25, nullable=False)  # Normalized weight e.g. 0.25 for 25%

    rubric = relationship("Rubric", back_populates="criteria")
    scores = relationship("CriterionScore", back_populates="criterion", cascade="all, delete-orphan")
