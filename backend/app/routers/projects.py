from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.hackathon import Hackathon, HackathonStatus
from app.models.team import Team, TeamMember
from app.models.project import Project, ProjectStatus
from app.models.vote import CommunityVote
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse, ProjectTeamSummary
)
from app.schemas.auth import UserPublicResponse
from app.services.rbac import (
    get_current_user, get_optional_current_user,
    verify_team_membership
)

router = APIRouter(prefix="/projects", tags=["Projects"])

def _validate_submission_requirements(hackathon: Hackathon, project_data):
    req_fields = [f.strip().lower() for f in (hackathon.required_fields or "").split(",") if f.strip()]
    for f in req_fields:
        val = getattr(project_data, f, None)
        if not val:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required submission field for this hackathon: '{f}'"
            )

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    hackathon_id: Optional[int] = None,
    track_id: Optional[int] = None,
    status: Optional[ProjectStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Project)
    if hackathon_id:
        query = query.filter(Project.hackathon_id == hackathon_id)
    if track_id:
        query = query.filter(Project.track_id == track_id)
    if status:
        query = query.filter(Project.status == status)
    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            (Project.title.ilike(s)) | 
            (Project.tagline.ilike(s)) | 
            (Project.tech_stack.ilike(s)) |
            (Project.description.ilike(s))
        )
    return query.order_by(Project.created_at.desc()).all()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    req: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == req.hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")

    # Check hackathon submission state
    if hackathon.status not in [HackathonStatus.REGISTRATION_OPEN, HackathonStatus.SUBMISSION_OPEN]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project submissions are not open (Current Hackathon Status: {hackathon.status.value})"
        )

    # Check deadline
    if datetime.utcnow() > hackathon.submission_deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission deadline for this hackathon has passed"
        )

    team = db.query(Team).filter(Team.id == req.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    if team.hackathon_id != hackathon.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team does not belong to this hackathon")

    # Verify user is in this team
    verify_team_membership(team, current_user, db)

    # Check if team already has a project
    existing = db.query(Project).filter(Project.team_id == team.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your team has already created a project submission")

    if req.status == ProjectStatus.SUBMITTED:
        _validate_submission_requirements(hackathon, req)

    project = Project(
        hackathon_id=req.hackathon_id,
        team_id=req.team_id,
        track_id=req.track_id,
        title=req.title,
        tagline=req.tagline,
        description=req.description,
        demo_url=req.demo_url,
        repo_url=req.repo_url,
        video_url=req.video_url,
        presentation_url=req.presentation_url,
        tech_stack=req.tech_stack,
        cover_image_url=req.cover_image_url,
        additional_info=req.additional_info,
        status=req.status or ProjectStatus.DRAFT,
        submitted_at=datetime.utcnow() if req.status == ProjectStatus.SUBMITTED else None
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project_detail(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    vote_count = db.query(CommunityVote).filter(CommunityVote.project_id == project.id).count()
    has_user_voted = False
    if current_user:
        user_vote = db.query(CommunityVote).filter(
            CommunityVote.project_id == project.id,
            CommunityVote.user_id == current_user.id
        ).first()
        has_user_voted = user_vote is not None

    team_summary = None
    if project.team:
        team_summary = ProjectTeamSummary(
            id=project.team.id,
            name=project.team.name,
            leader=UserPublicResponse.model_validate(project.team.leader),
            members_count=len(project.team.members)
        )

    return ProjectDetailResponse(
        id=project.id,
        hackathon_id=project.hackathon_id,
        team_id=project.team_id,
        track_id=project.track_id,
        title=project.title,
        tagline=project.tagline,
        description=project.description,
        demo_url=project.demo_url,
        repo_url=project.repo_url,
        video_url=project.video_url,
        presentation_url=project.presentation_url,
        tech_stack=project.tech_stack,
        cover_image_url=project.cover_image_url,
        additional_info=project.additional_info,
        status=project.status,
        submitted_at=project.submitted_at,
        created_at=project.created_at,
        updated_at=project.updated_at,
        track=project.track,
        team=team_summary,
        vote_count=vote_count,
        has_user_voted=has_user_voted
    )

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    req: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    hackathon = project.hackathon
    if current_user.role != UserRole.ADMIN:
        verify_team_membership(project.team, current_user, db)

        if hackathon.status not in [HackathonStatus.REGISTRATION_OPEN, HackathonStatus.SUBMISSION_OPEN]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project modifications are locked because hackathon is in judging or completed phase"
            )
        if datetime.utcnow() > hackathon.submission_deadline:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Submission deadline has passed. Projects can no longer be edited."
            )

    update_dict = req.model_dump(exclude_unset=True)
    if update_dict.get("status") == ProjectStatus.SUBMITTED:
        _validate_submission_requirements(hackathon, req)
        project.submitted_at = datetime.utcnow()

    for field, val in update_dict.items():
        setattr(project, field, val)

    db.commit()
    db.refresh(project)
    return project

@router.post("/{project_id}/submit", response_model=ProjectResponse)
def finalize_submission(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    hackathon = project.hackathon
    verify_team_membership(project.team, current_user, db)

    if datetime.utcnow() > hackathon.submission_deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission deadline has passed"
        )

    _validate_submission_requirements(hackathon, project)

    project.status = ProjectStatus.SUBMITTED
    project.submitted_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return project
