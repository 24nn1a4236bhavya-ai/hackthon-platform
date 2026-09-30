from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.judging import AssignmentStatus
from app.schemas.auth import UserPublicResponse
from app.schemas.project import ProjectResponse
from app.schemas.rubric import RubricCriterionResponse

class CriterionScoreBase(BaseModel):
    criterion_id: int
    score: float = Field(ge=0)

class CriterionScoreCreate(CriterionScoreBase):
    pass

class CriterionScoreResponse(CriterionScoreBase):
    id: int
    criterion: Optional[RubricCriterionResponse] = None

    class Config:
        from_attributes = True

class JudgeAssignmentCreate(BaseModel):
    hackathon_id: int
    judge_id: int
    project_id: int

class JudgeAssignmentBulkCreate(BaseModel):
    hackathon_id: int
    assignments: List[Dict[str, int]]  # list of {"judge_id": ..., "project_id": ...}

class AutoAssignRequest(BaseModel):
    hackathon_id: int
    judges_per_project: int = Field(default=3, ge=1)
    prevent_conflict_of_interest: bool = True

class AutoAssignResponse(BaseModel):
    total_assignments_created: int
    judges_count: int
    projects_count: int

class JudgeAssignmentResponse(BaseModel):
    id: int
    hackathon_id: int
    judge_id: int
    project_id: int
    status: AssignmentStatus
    assigned_at: datetime
    project: Optional[ProjectResponse] = None
    judge: Optional[UserPublicResponse] = None

    class Config:
        from_attributes = True

class EvaluationBase(BaseModel):
    private_notes: Optional[str] = None
    public_feedback: Optional[str] = None

class EvaluationCreate(EvaluationBase):
    hackathon_id: int
    project_id: int
    scores: List[CriterionScoreCreate]

class EvaluationUpdate(EvaluationBase):
    scores: Optional[List[CriterionScoreCreate]] = None

class EvaluationResponse(EvaluationBase):
    id: int
    hackathon_id: int
    project_id: int
    judge_id: int
    total_raw_score: float
    submitted_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EvaluationDetailResponse(EvaluationResponse):
    judge: UserPublicResponse
    criterion_scores: List[CriterionScoreResponse] = []

    class Config:
        from_attributes = True

# Leaderboard & Normalized Rankings
class ProjectLeaderboardItem(BaseModel):
    rank: int
    project_id: int
    project_title: str
    team_name: str
    track_name: Optional[str] = None
    evaluations_count: int
    raw_average_score: float
    normalized_score: float
    trimmed_score: float
    community_votes: int

class LeaderboardResponse(BaseModel):
    hackathon_id: int
    hackathon_title: str
    status: str
    is_published: bool
    total_projects: int
    total_evaluations: int
    rankings: List[ProjectLeaderboardItem]
