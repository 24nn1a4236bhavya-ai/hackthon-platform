from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.auth import UserPublicResponse
from app.services.rbac import get_current_user, require_admin

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserPublicResponse])
def list_users(
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User).filter(User.is_active == True)
    if role:
        query = query.filter(User.role == role)
    if search:
        s = f"%{search.lower()}%"
        query = query.filter((User.full_name.ilike(s)) | (User.username.ilike(s)) | (User.email.ilike(s)))
    return query.limit(limit).all()

@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
@router.put("/me", response_model=UserResponse)
def update_my_profile(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.full_name is not None:
        current_user.full_name = req.full_name.strip()
    if req.bio is not None:
        current_user.bio = req.bio
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url
    if req.institution is not None:
        current_user.institution = req.institution.strip()
    if req.organization is not None:
        current_user.organization = req.organization.strip()
    if req.skills is not None:
        current_user.skills = req.skills.strip()
    if req.phone is not None:
        current_user.phone = req.phone.strip()
    
    # Only ADMIN can promote roles
    if req.role is not None and current_user.role == UserRole.ADMIN:
        current_user.role = req.role

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/{user_id}", response_model=UserPublicResponse)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    new_role: UserRole,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = new_role
    db.commit()
    db.refresh(user)
    return user
