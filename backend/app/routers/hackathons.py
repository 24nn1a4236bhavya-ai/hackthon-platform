import re
import csv
import io
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.hackathon import Hackathon, HackathonTrack, HackathonPrize, HackathonRegistration, HackathonStatus, RegistrationStatus
from app.models.team import Team, TeamMember
from app.models.project import Project, ProjectStatus
from app.models.judging import JudgeAssignment, AssignmentStatus, Evaluation
from app.models.vote import CommunityVote
from app.schemas.hackathon import (
    HackathonCreate, HackathonUpdate, HackathonResponse, HackathonDetailResponse,
    HackathonRegistrationCreate, HackathonRegistrationResponse,
    HackathonTrackCreate, HackathonTrackUpdate, HackathonTrackResponse,
    HackathonPrizeCreate, HackathonPrizeUpdate, HackathonPrizeResponse,
    HackathonStatsResponse, JudgeInviteRequest, CsvImportResponse
)
from app.schemas.auth import UserPublicResponse
from app.services.rbac import (
    get_current_user, get_optional_current_user,
    require_organizer, verify_hackathon_management_access
)
from app.services.auth import get_password_hash

router = APIRouter(prefix="/hackathons", tags=["Hackathons"])

def slugify(title: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", title.lower())
    return re.sub(r"[-\s]+", "-", cleaned).strip("-")

@router.get("", response_model=List[HackathonResponse])
def list_hackathons(
    status: Optional[HackathonStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Hackathon)
    if status:
        query = query.filter(Hackathon.status == status)
    if search:
        s = f"%{search.lower()}%"
        query = query.filter((Hackathon.title.ilike(s)) | (Hackathon.tagline.ilike(s)))
    return query.order_by(Hackathon.created_at.desc()).all()

@router.post("", response_model=HackathonResponse, status_code=status.HTTP_201_CREATED)
def create_hackathon(
    req: HackathonCreate,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    slug_val = req.slug or slugify(req.title)
    existing = db.query(Hackathon).filter(Hackathon.slug == slug_val).first()
    if existing:
        slug_val = f"{slug_val}-{int(datetime.utcnow().timestamp())}"

    hackathon = Hackathon(
        title=req.title,
        slug=slug_val,
        tagline=req.tagline,
        description=req.description,
        banner_url=req.banner_url,
        rules=req.rules,
        contact_email=req.contact_email,
        website_url=req.website_url,
        status=HackathonStatus.DRAFT,
        event_start=req.event_start,
        event_end=req.event_end,
        registration_start=req.registration_start,
        registration_deadline=req.registration_deadline,
        submission_deadline=req.submission_deadline,
        judging_deadline=req.judging_deadline,
        result_publication_date=req.result_publication_date,
        required_fields=req.required_fields,
        created_by_id=current_user.id,
        is_community_voting_enabled=req.is_community_voting_enabled,
        min_team_size=req.min_team_size,
        max_team_size=req.max_team_size
    )
    db.add(hackathon)
    db.flush()

    # Initial Tracks
    if req.tracks:
        for t in req.tracks:
            track = HackathonTrack(
                hackathon_id=hackathon.id,
                name=t.name,
                description=t.description,
                is_active=t.is_active
            )
            db.add(track)

    # Initial Prizes
    if req.prizes:
        for p in req.prizes:
            prize = HackathonPrize(
                hackathon_id=hackathon.id,
                title=p.title,
                amount=p.amount,
                description=p.description
            )
            db.add(prize)

    db.commit()
    db.refresh(hackathon)
    return hackathon

@router.get("/{id_or_slug}", response_model=HackathonDetailResponse)
def get_hackathon_detail(
    id_or_slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if id_or_slug.isdigit():
        hackathon = db.query(Hackathon).filter(Hackathon.id == int(id_or_slug)).first()
    else:
        hackathon = db.query(Hackathon).filter(Hackathon.slug == id_or_slug).first()

    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")

    # Dynamic counts from DB
    reg_count = db.query(HackathonRegistration).filter(HackathonRegistration.hackathon_id == hackathon.id).count()
    team_count = db.query(Team).filter(Team.hackathon_id == hackathon.id).count()
    proj_count = db.query(Project).filter(
        Project.hackathon_id == hackathon.id,
        Project.status == ProjectStatus.SUBMITTED
    ).count()

    is_registered = False
    user_team_id = None
    if current_user:
        reg = db.query(HackathonRegistration).filter(
            HackathonRegistration.hackathon_id == hackathon.id,
            HackathonRegistration.user_id == current_user.id
        ).first()
        is_registered = reg is not None

        user_team = db.query(TeamMember).join(Team).filter(
            Team.hackathon_id == hackathon.id,
            TeamMember.user_id == current_user.id
        ).first()
        if user_team:
            user_team_id = user_team.team_id

    detail = HackathonDetailResponse(
        id=hackathon.id,
        title=hackathon.title,
        slug=hackathon.slug,
        tagline=hackathon.tagline,
        description=hackathon.description,
        banner_url=hackathon.banner_url,
        rules=hackathon.rules,
        contact_email=hackathon.contact_email,
        website_url=hackathon.website_url,
        status=hackathon.status,
        event_start=hackathon.event_start,
        event_end=hackathon.event_end,
        registration_start=hackathon.registration_start,
        registration_deadline=hackathon.registration_deadline,
        submission_deadline=hackathon.submission_deadline,
        judging_deadline=hackathon.judging_deadline,
        result_publication_date=hackathon.result_publication_date,
        required_fields=hackathon.required_fields,
        is_community_voting_enabled=hackathon.is_community_voting_enabled,
        min_team_size=hackathon.min_team_size,
        max_team_size=hackathon.max_team_size,
        created_by_id=hackathon.created_by_id,
        created_at=hackathon.created_at,
        updated_at=hackathon.updated_at,
        creator=UserPublicResponse.model_validate(hackathon.creator),
        tracks=[HackathonTrackResponse.model_validate(t) for t in hackathon.tracks if t.is_active],
        prizes=[HackathonPrizeResponse.model_validate(p) for p in hackathon.prizes],
        registrations_count=reg_count,
        teams_count=team_count,
        projects_count=proj_count,
        is_user_registered=is_registered,
        user_team_id=user_team_id
    )
    return detail

@router.put("/{hackathon_id}", response_model=HackathonResponse)
@router.patch("/{hackathon_id}", response_model=HackathonResponse)
def update_hackathon(
    hackathon_id: int,
    req: HackathonUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")

    verify_hackathon_management_access(hackathon, current_user)

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(hackathon, field, val)

    db.commit()
    db.refresh(hackathon)
    return hackathon

@router.delete("/{hackathon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hackathon(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    db.delete(hackathon)
    db.commit()
    return None

# ================= Registration =================

@router.post("/{hackathon_id}/register", response_model=HackathonRegistrationResponse)
def register_for_hackathon(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")

    if hackathon.status not in [HackathonStatus.REGISTRATION_OPEN, HackathonStatus.SUBMISSION_OPEN]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registrations are currently closed for this hackathon (Status: {hackathon.status.value})"
        )

    existing = db.query(HackathonRegistration).filter(
        HackathonRegistration.hackathon_id == hackathon.id,
        HackathonRegistration.user_id == current_user.id
    ).first()
    if existing:
        return existing

    reg = HackathonRegistration(
        hackathon_id=hackathon.id,
        user_id=current_user.id,
        status=RegistrationStatus.REGISTERED
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg

@router.delete("/{hackathon_id}/register", status_code=status.HTTP_204_NO_CONTENT)
def unregister_from_hackathon(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reg = db.query(HackathonRegistration).filter(
        HackathonRegistration.hackathon_id == hackathon_id,
        HackathonRegistration.user_id == current_user.id
    ).first()
    if not reg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found")

    db.delete(reg)
    db.commit()
    return None

# ================= Tracks =================

@router.get("/{hackathon_id}/tracks", response_model=List[HackathonTrackResponse])
def list_tracks(hackathon_id: int, include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(HackathonTrack).filter(HackathonTrack.hackathon_id == hackathon_id)
    if not include_inactive:
        query = query.filter(HackathonTrack.is_active == True)
    return query.all()

@router.post("/{hackathon_id}/tracks", response_model=HackathonTrackResponse, status_code=status.HTTP_201_CREATED)
def add_track(
    hackathon_id: int,
    req: HackathonTrackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    track = HackathonTrack(
        hackathon_id=hackathon.id,
        name=req.name,
        description=req.description,
        is_active=req.is_active
    )
    db.add(track)
    db.commit()
    db.refresh(track)
    return track

@router.put("/{hackathon_id}/tracks/{track_id}", response_model=HackathonTrackResponse)
def update_track(
    hackathon_id: int,
    track_id: int,
    req: HackathonTrackUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    track = db.query(HackathonTrack).filter(
        HackathonTrack.id == track_id,
        HackathonTrack.hackathon_id == hackathon_id
    ).first()
    if not track:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")

    if req.name is not None:
        track.name = req.name
    if req.description is not None:
        track.description = req.description
    if req.is_active is not None:
        track.is_active = req.is_active

    db.commit()
    db.refresh(track)
    return track

@router.delete("/{hackathon_id}/tracks/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_track(
    hackathon_id: int,
    track_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    track = db.query(HackathonTrack).filter(
        HackathonTrack.id == track_id,
        HackathonTrack.hackathon_id == hackathon_id
    ).first()
    if not track:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")

    db.delete(track)
    db.commit()
    return None

# ================= Prizes =================

@router.get("/{hackathon_id}/prizes", response_model=List[HackathonPrizeResponse])
def list_prizes(hackathon_id: int, db: Session = Depends(get_db)):
    return db.query(HackathonPrize).filter(HackathonPrize.hackathon_id == hackathon_id).all()

@router.post("/{hackathon_id}/prizes", response_model=HackathonPrizeResponse, status_code=status.HTTP_201_CREATED)
def create_prize(
    hackathon_id: int,
    req: HackathonPrizeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    amount_val = req.reward_amount or req.amount
    prize = HackathonPrize(
        hackathon_id=hackathon.id,
        title=req.title,
        amount=amount_val,
        reward_amount=amount_val,
        description=req.description,
        place=req.place,
        track_id=req.track_id
    )
    db.add(prize)
    db.commit()
    db.refresh(prize)
    return prize

@router.put("/{hackathon_id}/prizes/{prize_id}", response_model=HackathonPrizeResponse)
def update_prize(
    hackathon_id: int,
    prize_id: int,
    req: HackathonPrizeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    prize = db.query(HackathonPrize).filter(
        HackathonPrize.id == prize_id,
        HackathonPrize.hackathon_id == hackathon_id
    ).first()
    if not prize:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prize not found")

    if req.title is not None:
        prize.title = req.title
    if req.amount is not None or req.reward_amount is not None:
        amount_val = req.reward_amount or req.amount
        prize.amount = amount_val
        prize.reward_amount = amount_val
    if req.description is not None:
        prize.description = req.description
    if req.place is not None:
        prize.place = req.place
    if req.track_id is not None:
        prize.track_id = req.track_id

    db.commit()
    db.refresh(prize)
    return prize

@router.delete("/{hackathon_id}/prizes/{prize_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prize(
    hackathon_id: int,
    prize_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    prize = db.query(HackathonPrize).filter(
        HackathonPrize.id == prize_id,
        HackathonPrize.hackathon_id == hackathon_id
    ).first()
    if not prize:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prize not found")

    db.delete(prize)
    db.commit()
    return None

# ================= Real Dynamic Statistics =================

@router.get("/{hackathon_id}/stats", response_model=HackathonStatsResponse)
def get_hackathon_stats(
    hackathon_id: int,
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")

    total_participants = db.query(HackathonRegistration).filter(
        HackathonRegistration.hackathon_id == hackathon_id
    ).count()

    total_teams = db.query(Team).filter(Team.hackathon_id == hackathon_id).count()

    total_projects = db.query(Project).filter(Project.hackathon_id == hackathon_id).count()
    submitted_projects = db.query(Project).filter(
        Project.hackathon_id == hackathon_id,
        Project.status == ProjectStatus.SUBMITTED
    ).count()
    draft_projects = total_projects - submitted_projects

    # Distinct judges
    distinct_judge_ids = db.query(JudgeAssignment.judge_id).filter(
        JudgeAssignment.hackathon_id == hackathon_id
    ).distinct().all()
    total_judges = len(distinct_judge_ids)

    total_assignments = db.query(JudgeAssignment).filter(
        JudgeAssignment.hackathon_id == hackathon_id
    ).count()

    completed_assignments = db.query(JudgeAssignment).filter(
        JudgeAssignment.hackathon_id == hackathon_id,
        JudgeAssignment.status == AssignmentStatus.COMPLETED
    ).count()

    pending_assignments = total_assignments - completed_assignments

    total_votes = db.query(CommunityVote).filter(
        CommunityVote.hackathon_id == hackathon_id
    ).count()

    completion_rate = (
        round((completed_assignments / total_assignments) * 100.0, 1)
        if total_assignments > 0 else 0.0
    )

    return HackathonStatsResponse(
        hackathon_id=hackathon_id,
        total_participants=total_participants,
        total_registrations=total_participants,
        total_teams=total_teams,
        total_projects=total_projects,
        submitted_projects=submitted_projects,
        draft_projects=draft_projects,
        total_judges=total_judges,
        total_assignments=total_assignments,
        completed_assignments=completed_assignments,
        completed_evaluations=completed_assignments,
        pending_assignments=pending_assignments,
        total_votes=total_votes,
        evaluation_completion_rate=completion_rate
    )

# ================= Judges Management =================

@router.get("/{hackathon_id}/judges", response_model=List[UserPublicResponse])
def list_hackathon_judges(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")

    # Get all judges who have assignments in this hackathon, plus any system judges
    assigned_judge_ids = [r[0] for r in db.query(JudgeAssignment.judge_id).filter(JudgeAssignment.hackathon_id == hackathon_id).distinct().all()]
    all_judges = db.query(User).filter(
        (User.id.in_(assigned_judge_ids)) | (User.role == UserRole.JUDGE)
    ).all()
    return [UserPublicResponse.model_validate(j) for j in all_judges]

@router.post("/{hackathon_id}/judges", response_model=UserPublicResponse, status_code=status.HTTP_201_CREATED)
def invite_or_add_judge(
    hackathon_id: int,
    req: JudgeInviteRequest,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    clean_email = req.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    if user:
        if user.role not in [UserRole.JUDGE, UserRole.ORGANIZER, UserRole.ADMIN]:
            user.role = UserRole.JUDGE
            db.commit()
            db.refresh(user)
        return UserPublicResponse.model_validate(user)

    # Create new judge account with default password
    username_base = clean_email.split("@")[0]
    username = re.sub(r"[^\w]", "", username_base) or "judge"
    # Ensure unique username
    existing_u = db.query(User).filter(func.lower(User.username) == username.lower()).first()
    if existing_u:
        username = f"{username}_{int(datetime.utcnow().timestamp())}"

    new_judge = User(
        email=clean_email,
        username=username,
        full_name=req.name or username_base.capitalize(),
        role=UserRole.JUDGE,
        hashed_password=get_password_hash("DemoPassword123!"),
        is_active=True
    )
    db.add(new_judge)
    db.commit()
    db.refresh(new_judge)
    return UserPublicResponse.model_validate(new_judge)

# ================= CSV Import =================

@router.post("/{hackathon_id}/import/participants", response_model=CsvImportResponse)
async def import_participants_csv(
    hackathon_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    content = await file.read()
    text = content.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))

    total = 0
    success = 0
    errors = []

    for row_idx, row in enumerate(reader, start=2):
        total += 1
        email = (row.get("email") or row.get("Email") or "").strip().lower()
        name = (row.get("name") or row.get("full_name") or row.get("Full Name") or "").strip()
        username = (row.get("username") or row.get("Username") or "").strip().lower()

        if not email:
            errors.append(f"Row {row_idx}: Missing email address")
            continue

        try:
            user = db.query(User).filter(func.lower(User.email) == email).first()
            if not user:
                uname = username or (email.split("@")[0] + str(row_idx))
                user = User(
                    email=email,
                    username=uname,
                    full_name=name or email.split("@")[0],
                    role=UserRole.PARTICIPANT,
                    hashed_password=get_password_hash("DemoPassword123!"),
                    is_active=True
                )
                db.add(user)
                db.flush()

            # Register to hackathon if not registered
            reg = db.query(HackathonRegistration).filter(
                HackathonRegistration.hackathon_id == hackathon_id,
                HackathonRegistration.user_id == user.id
            ).first()
            if not reg:
                db.add(HackathonRegistration(
                    hackathon_id=hackathon_id,
                    user_id=user.id,
                    status=RegistrationStatus.REGISTERED
                ))
            success += 1
        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")

    db.commit()
    return CsvImportResponse(
        total_rows=total,
        success_count=success,
        imported_count=success,
        registered_count=success,
        error_count=len(errors),
        errors=errors
    )
