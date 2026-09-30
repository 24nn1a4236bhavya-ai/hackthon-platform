from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.models.project import ProjectStatus
from app.schemas.auth import UserPublicResponse
from app.schemas.hackathon import HackathonTrackResponse

class ProjectBase(BaseModel):
    title: str
    tagline: str
    description: str
    demo_url: Optional[str] = None
    repo_url: Optional[str] = None
    video_url: Optional[str] = None
    presentation_url: Optional[str] = None
    tech_stack: Optional[str] = None
    cover_image_url: Optional[str] = None
    track_id: Optional[int] = None
    additional_info: Optional[str] = None

class ProjectCreate(ProjectBase):
    hackathon_id: int
    team_id: int
    status: Optional[ProjectStatus] = ProjectStatus.DRAFT

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    demo_url: Optional[str] = None
    repo_url: Optional[str] = None
    video_url: Optional[str] = None
    presentation_url: Optional[str] = None
    tech_stack: Optional[str] = None
    cover_image_url: Optional[str] = None
    track_id: Optional[int] = None
    status: Optional[ProjectStatus] = None
    additional_info: Optional[str] = None

class ProjectTeamSummary(BaseModel):
    id: int
    name: str
    leader: UserPublicResponse
    members_count: int = 1

    model_config = {"from_attributes": True}

class ProjectResponse(ProjectBase):
    id: int
    hackathon_id: int
    team_id: int
    status: ProjectStatus
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class ProjectDetailResponse(ProjectResponse):
    track: Optional[HackathonTrackResponse] = None
    team: Optional[ProjectTeamSummary] = None
    vote_count: int = 0
    has_user_voted: bool = False
    average_score: Optional[float] = None

    model_config = {"from_attributes": True}
