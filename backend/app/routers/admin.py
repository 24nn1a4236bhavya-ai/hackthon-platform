from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.hackathon import Hackathon
from app.models.team import Team
from app.models.project import Project
from app.models.judging import Evaluation
from app.schemas.user import UserResponse
from app.services.rbac import require_admin

router = APIRouter(prefix="/admin", tags=["System Administration"])

@router.get("/stats", response_model=Dict[str, Any])
def get_system_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return {
        "total_users": db.query(User).count(),
        "total_hackathons": db.query(Hackathon).count(),
        "total_teams": db.query(Team).count(),
        "total_projects": db.query(Project).count(),
        "total_evaluations": db.query(Evaluation).count(),
        "roles_distribution": {
            "admin": db.query(User).filter(User.role == UserRole.ADMIN).count(),
            "organizer": db.query(User).filter(User.role == UserRole.ORGANIZER).count(),
            "judge": db.query(User).filter(User.role == UserRole.JUDGE).count(),
            "participant": db.query(User).filter(User.role == UserRole.PARTICIPANT).count(),
        }
    }

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(User).order_by(User.id.asc()).all()

@router.patch("/users/{user_id}/role", response_model=UserResponse)
def change_role(
    user_id: int,
    role: UserRole,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = role
    db.commit()
    db.refresh(user)
    return user
