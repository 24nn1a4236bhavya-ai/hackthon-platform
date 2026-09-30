from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.models.hackathon import Hackathon, HackathonStatus
from app.models.team import Team, TeamMember, TeamRole
from app.models.project import Project, ProjectStatus
from app.services.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token", auto_error=False)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return user

def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user if user and user.is_active else None
    except Exception:
        return None

def require_role(allowed_roles: List[UserRole]):
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of the following roles: {[r.value for r in allowed_roles]}. Current role: {user.role.value}",
            )
        return user
    return role_checker

require_admin = require_role([UserRole.ADMIN])
require_organizer = require_role([UserRole.ORGANIZER, UserRole.ADMIN])
require_judge = require_role([UserRole.JUDGE, UserRole.ORGANIZER, UserRole.ADMIN])
require_authenticated = get_current_user

# Resource Ownership and Workflow Validators
def verify_hackathon_management_access(hackathon: Hackathon, user: User):
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.ORGANIZER and hackathon.created_by_id == user.id:
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to manage this hackathon",
    )

def verify_team_leader_access(team: Team, user: User):
    if user.role == UserRole.ADMIN:
        return True
    if team.leader_id == user.id:
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the team leader can perform this operation",
    )

def verify_team_membership(team: Team, user: User, db: Session):
    if user.role == UserRole.ADMIN:
        return True
    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team.id,
        TeamMember.user_id == user.id
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a registered member of this team",
        )
    return True
