from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.user import UserRole

class UserBase(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    username: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=1, max_length=100)
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    institution: Optional[str] = None
    organization: Optional[str] = None
    skills: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[UserRole] = UserRole.PARTICIPANT

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[UserRole] = None
    institution: Optional[str] = None
    organization: Optional[str] = None
    skills: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
