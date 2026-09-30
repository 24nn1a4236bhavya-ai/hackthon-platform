from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.hackathon import Hackathon, HackathonStatus
from app.models.project import Project, ProjectStatus
from app.models.vote import CommunityVote
from app.schemas.vote import CommunityVoteCreate, CommunityVoteResponse, VoteStatusResponse
from app.schemas.auth import UserPublicResponse
from app.services.rbac import get_current_user, get_optional_current_user

router = APIRouter(prefix="/votes", tags=["Community Voting"])

@router.post("", response_model=CommunityVoteResponse, status_code=status.HTTP_201_CREATED)
def cast_vote(
    req: CommunityVoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    hackathon = project.hackathon
    if not hackathon.is_community_voting_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Community voting is disabled for this hackathon")

    # Projects must be submitted
    if project.status != ProjectStatus.SUBMITTED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot vote on an unsubmitted project draft")

    # Anti-self-voting: cannot vote for own team project
    if project.team and (current_user.id == project.team.leader_id or any(m.user_id == current_user.id for m in project.team.members)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot vote for your own team's project")

    # Check if already voted
    existing_vote = db.query(CommunityVote).filter(
        CommunityVote.project_id == project.id,
        CommunityVote.user_id == current_user.id
    ).first()

    if existing_vote:
        return CommunityVoteResponse(
            id=existing_vote.id,
            hackathon_id=existing_vote.hackathon_id,
            project_id=existing_vote.project_id,
            user_id=existing_vote.user_id,
            created_at=existing_vote.created_at,
            user=UserPublicResponse.model_validate(current_user)
        )

    vote = CommunityVote(
        hackathon_id=hackathon.id,
        project_id=project.id,
        user_id=current_user.id
    )
    db.add(vote)
    db.commit()
    db.refresh(vote)

    return CommunityVoteResponse(
        id=vote.id,
        hackathon_id=vote.hackathon_id,
        project_id=vote.project_id,
        user_id=vote.user_id,
        created_at=vote.created_at,
        user=UserPublicResponse.model_validate(current_user)
    )

@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
def retract_vote(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vote = db.query(CommunityVote).filter(
        CommunityVote.project_id == project_id,
        CommunityVote.user_id == current_user.id
    ).first()

    if not vote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vote not found")

    db.delete(vote)
    db.commit()
    return {"detail": "Vote retracted successfully"}

@router.get("/{project_id}/status", response_model=VoteStatusResponse)
def get_vote_status(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user)
):
    total = db.query(CommunityVote).filter(CommunityVote.project_id == project_id).count()
    has_voted = False
    if current_user:
        v = db.query(CommunityVote).filter(
            CommunityVote.project_id == project_id,
            CommunityVote.user_id == current_user.id
        ).first()
        has_voted = v is not None

    return VoteStatusResponse(has_voted=has_voted, total_votes=total)
