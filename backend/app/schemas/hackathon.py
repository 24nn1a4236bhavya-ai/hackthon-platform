from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.hackathon import HackathonStatus, RegistrationStatus
from app.schemas.auth import UserPublicResponse

class HackathonTrackBase(BaseModel):
    name: str
    description: str
    is_active: bool = True

class HackathonTrackCreate(BaseModel):
    name: str
    description: str
    is_active: bool = True

class HackathonTrackUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class HackathonTrackResponse(HackathonTrackBase):
    id: int
    hackathon_id: int

    model_config = {"from_attributes": True}

class HackathonPrizeBase(BaseModel):
    title: str
    amount: Optional[str] = None
    reward_amount: Optional[str] = None
    description: Optional[str] = None
    place: Optional[int] = None
    track_id: Optional[int] = None

class HackathonPrizeCreate(HackathonPrizeBase):
    pass

class HackathonPrizeUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[str] = None
    reward_amount: Optional[str] = None
    description: Optional[str] = None
    place: Optional[int] = None
    track_id: Optional[int] = None

class HackathonPrizeResponse(HackathonPrizeBase):
    id: int
    hackathon_id: int

    model_config = {"from_attributes": True}

class HackathonBase(BaseModel):
    title: str
    tagline: str
    description: str
    banner_url: Optional[str] = None
    rules: Optional[str] = None
    contact_email: Optional[str] = None
    website_url: Optional[str] = None
    
    event_start: Optional[datetime] = None
    event_end: Optional[datetime] = None
    registration_start: datetime
    registration_deadline: datetime
    submission_deadline: datetime
    judging_deadline: datetime
    result_publication_date: Optional[datetime] = None
    
    required_fields: Optional[str] = ""
    is_community_voting_enabled: bool = True
    min_team_size: int = Field(default=1, ge=1)
    max_team_size: int = Field(default=4, ge=1)

class HackathonCreate(HackathonBase):
    slug: Optional[str] = None
    tracks: Optional[List[HackathonTrackCreate]] = []
    prizes: Optional[List[HackathonPrizeCreate]] = []

class HackathonUpdate(BaseModel):
    title: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    banner_url: Optional[str] = None
    rules: Optional[str] = None
    contact_email: Optional[str] = None
    website_url: Optional[str] = None
    status: Optional[HackathonStatus] = None
    
    event_start: Optional[datetime] = None
    event_end: Optional[datetime] = None
    registration_start: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    submission_deadline: Optional[datetime] = None
    judging_deadline: Optional[datetime] = None
    result_publication_date: Optional[datetime] = None
    
    required_fields: Optional[str] = None
    is_community_voting_enabled: Optional[bool] = None
    min_team_size: Optional[int] = None
    max_team_size: Optional[int] = None

class HackathonResponse(HackathonBase):
    id: int
    slug: str
    status: HackathonStatus
    created_by_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class HackathonDetailResponse(HackathonResponse):
    creator: UserPublicResponse
    tracks: List[HackathonTrackResponse] = []
    prizes: List[HackathonPrizeResponse] = []
    registrations_count: int = 0
    teams_count: int = 0
    projects_count: int = 0
    is_user_registered: Optional[bool] = False
    user_team_id: Optional[int] = None

    model_config = {"from_attributes": True}

class HackathonRegistrationCreate(BaseModel):
    status: Optional[RegistrationStatus] = RegistrationStatus.REGISTERED

class HackathonRegistrationResponse(BaseModel):
    id: int
    hackathon_id: int
    user_id: int
    status: RegistrationStatus
    registered_at: datetime
    user: Optional[UserPublicResponse] = None

    model_config = {"from_attributes": True}

class HackathonStatsResponse(BaseModel):
    hackathon_id: int
    total_participants: int
    total_registrations: int = 0
    total_teams: int
    total_projects: int
    submitted_projects: int
    draft_projects: int
    total_judges: int
    total_assignments: int
    completed_assignments: int
    completed_evaluations: int = 0
    pending_assignments: int
    total_votes: int
    evaluation_completion_rate: float = 0.0

class JudgeInviteRequest(BaseModel):
    email: str
    name: Optional[str] = None

class CsvImportResponse(BaseModel):
    total_rows: int
    success_count: int
    imported_count: int = 0
    registered_count: int = 0
    error_count: int
    errors: List[str] = []
