from datetime import datetime
from pydantic import BaseModel
from app.schemas.auth import UserPublicResponse

class CommunityVoteCreate(BaseModel):
    hackathon_id: int
    project_id: int

class CommunityVoteResponse(BaseModel):
    id: int
    hackathon_id: int
    project_id: int
    user_id: int
    created_at: datetime
    user: UserPublicResponse

    class Config:
        from_attributes = True

class VoteStatusResponse(BaseModel):
    has_voted: bool
    total_votes: int
