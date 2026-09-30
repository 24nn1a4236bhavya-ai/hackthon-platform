from typing import Optional, List
from pydantic import BaseModel, Field

class RubricCriterionBase(BaseModel):
    title: str
    description: str
    max_points: float = Field(default=10.0, gt=0)
    weight: float = Field(default=0.25, gt=0)

class RubricCriterionCreate(RubricCriterionBase):
    pass

class RubricCriterionResponse(RubricCriterionBase):
    id: int
    rubric_id: int

    model_config = {"from_attributes": True}

class RubricBase(BaseModel):
    name: str
    description: Optional[str] = None

class RubricCreate(RubricBase):
    hackathon_id: int
    criteria: List[RubricCriterionCreate]

class RubricUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    criteria: Optional[List[RubricCriterionCreate]] = None

class RubricResponse(RubricBase):
    id: int
    hackathon_id: int

    model_config = {"from_attributes": True}

class RubricDetailResponse(RubricResponse):
    criteria: List[RubricCriterionResponse] = []

    model_config = {"from_attributes": True}
