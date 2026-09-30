from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.hackathon import Hackathon, HackathonRegistration, HackathonStatus
from app.models.team import Team, TeamMember, TeamRole, generate_invite_code
from app.models.project import Project
from app.schemas.team import TeamCreate, TeamJoinRequest, TeamResponse, TeamDetailResponse
from app.services.rbac import get_current_user, verify_team_leader_access

router = APIRouter(prefix="/teams", tags=["Teams"])

@router.post("", response_model=TeamDetailResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    req: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == req.hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")

    # Verify registration
    reg = db.query(HackathonRegistration).filter(
        HackathonRegistration.hackathon_id == hackathon.id,
        HackathonRegistration.user_id == current_user.id
    ).first()
    if not reg:
        # Auto-register if registration is open
        if hackathon.status in [HackathonStatus.REGISTRATION_OPEN, HackathonStatus.SUBMISSION_OPEN]:
            reg = HackathonRegistration(hackathon_id=hackathon.id, user_id=current_user.id)
            db.add(reg)
            db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must be registered for this hackathon to create a team"
            )

    # Check if already in a team for this hackathon
    existing_membership = db.query(TeamMember).join(Team).filter(
        Team.hackathon_id == hackathon.id,
        TeamMember.user_id == current_user.id
    ).first()
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of a team in this hackathon"
        )

    team = Team(
        hackathon_id=hackathon.id,
        name=req.name,
        description=req.description,
        leader_id=current_user.id,
        invite_code=generate_invite_code()
    )
    db.add(team)
    db.flush()

    # Add creator as LEADER
    leader_member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role=TeamRole.LEADER
    )
    db.add(leader_member)
    db.commit()
    db.refresh(team)

    return TeamDetailResponse(
        id=team.id,
        hackathon_id=team.hackathon_id,
        name=team.name,
        invite_code=team.invite_code,
        leader_id=team.leader_id,
        created_at=team.created_at,
        leader=team.leader,
        members=team.members,
        has_project=False,
        project_id=None
    )

@router.get("/{team_id}", response_model=TeamDetailResponse)
def get_team_detail(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    has_project = team.project is not None
    project_id = team.project.id if has_project else None

    return TeamDetailResponse(
        id=team.id,
        hackathon_id=team.hackathon_id,
        name=team.name,
        invite_code=team.invite_code,
        leader_id=team.leader_id,
        created_at=team.created_at,
        leader=team.leader,
        members=team.members,
        has_project=has_project,
        project_id=project_id
    )

@router.post("/join", response_model=TeamDetailResponse)
def join_team(
    req: TeamJoinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.invite_code == req.invite_code.strip().upper()).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid team invite code")

    hackathon = team.hackathon

    # Check already in team for this hackathon
    existing_membership = db.query(TeamMember).join(Team).filter(
        Team.hackathon_id == hackathon.id,
        TeamMember.user_id == current_user.id
    ).first()
    if existing_membership:
        if existing_membership.team_id == team.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already a member of this team")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already in another team for this hackathon. Leave your current team first."
        )

    # Check team capacity
    current_member_count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
    if current_member_count >= hackathon.max_team_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This team has already reached the maximum team size limit ({hackathon.max_team_size})"
        )

    # Check registration
    reg = db.query(HackathonRegistration).filter(
        HackathonRegistration.hackathon_id == hackathon.id,
        HackathonRegistration.user_id == current_user.id
    ).first()
    if not reg:
        reg = HackathonRegistration(hackathon_id=hackathon.id, user_id=current_user.id)
        db.add(reg)
        db.flush()

    new_member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role=TeamRole.MEMBER
    )
    db.add(new_member)
    db.commit()
    db.refresh(team)

    has_project = team.project is not None
    project_id = team.project.id if has_project else None

    return TeamDetailResponse(
        id=team.id,
        hackathon_id=team.hackathon_id,
        name=team.name,
        invite_code=team.invite_code,
        leader_id=team.leader_id,
        created_at=team.created_at,
        leader=team.leader,
        members=team.members,
        has_project=has_project,
        project_id=project_id
    )

@router.post("/{team_id}/leave", status_code=status.HTTP_200_OK)
def leave_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team.id,
        TeamMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are not a member of this team")

    all_members = db.query(TeamMember).filter(TeamMember.team_id == team.id).all()
    if len(all_members) <= 1:
        # Disband team and its project
        db.delete(team)
        db.commit()
        return {"detail": "Team disbanded"}

    # If leader left, promote next member
    if team.leader_id == current_user.id:
        other_member = [m for m in all_members if m.user_id != current_user.id][0]
        team.leader_id = other_member.user_id
        other_member.role = TeamRole.LEADER

    db.delete(membership)
    db.commit()
    return {"detail": "Successfully left the team"}

@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_member(
    team_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    verify_team_leader_access(team, current_user)

    if user_id == team.leader_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team leader cannot be removed. Transfer leadership or disband.")

    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team.id,
        TeamMember.user_id == user_id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found on this team")

    db.delete(membership)
    db.commit()
    return {"detail": "Member removed from team"}

@router.get("/my-team/{hackathon_id}", response_model=Optional[TeamDetailResponse])
def get_my_team(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    membership = db.query(TeamMember).join(Team).filter(
        Team.hackathon_id == hackathon_id,
        TeamMember.user_id == current_user.id
    ).first()

    if not membership:
        return None

    team = membership.team
    has_project = team.project is not None
    project_id = team.project.id if has_project else None

    return TeamDetailResponse(
        id=team.id,
        hackathon_id=team.hackathon_id,
        name=team.name,
        invite_code=team.invite_code,
        leader_id=team.leader_id,
        created_at=team.created_at,
        leader=team.leader,
        members=team.members,
        has_project=has_project,
        project_id=project_id
    )
