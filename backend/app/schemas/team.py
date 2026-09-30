from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.models.team import TeamRole
from app.schemas.auth import UserPublicResponse

class TeamMemberResponse(BaseModel):
    id: int
    user_id: int
    role: TeamRole
    joined_at: datetime
    user: UserPublicResponse

    model_config = {"from_attributes": True}

class TeamCreate(BaseModel):
    hackathon_id: int
    name: str
    description: Optional[str] = None

class TeamJoinRequest(BaseModel):
    invite_code: str

class TeamResponse(BaseModel):
    id: int
    hackathon_id: int
    name: str
    description: Optional[str] = None
    invite_code: str
    leader_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class TeamDetailResponse(TeamResponse):
    leader: UserPublicResponse
    members: List[TeamMemberResponse] = []
    has_project: bool = False
    project_id: Optional[int] = None

    model_config = {"from_attributes": True}
