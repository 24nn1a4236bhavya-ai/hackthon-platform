from typing import Optional
from pydantic import BaseModel, Field
from app.models.user import UserRole

class UserPublicResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: str
    role: UserRole
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    institution: Optional[str] = None
    organization: Optional[str] = None
    skills: Optional[str] = None
    phone: Optional[str] = None

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublicResponse

class TokenPayload(BaseModel):
    sub: str
    email: str
    role: str
    exp: Optional[int] = None

class LoginRequest(BaseModel):
    username_or_email: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

    def get_identifier(self) -> str:
        ident = self.username_or_email or self.email or self.username or ""
        return ident.strip()

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: Optional[UserRole] = UserRole.PARTICIPANT
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    institution: Optional[str] = None
    organization: Optional[str] = None
    skills: Optional[str] = None
    phone: Optional[str] = None
