from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.hackathon import Hackathon, HackathonStatus
from app.services.rbac import get_current_user, get_optional_current_user, require_organizer, verify_hackathon_management_access
from app.services.export_service import (
    export_leaderboard_csv, export_leaderboard_json,
    export_projects_csv, export_participants_csv, export_evaluations_csv
)

router = APIRouter(prefix="/exports", tags=["Exports & Reporting"])

@router.get("/{hackathon_id}/leaderboard.csv", response_class=PlainTextResponse)
@router.get("/hackathons/{hackathon_id}/leaderboard.csv", response_class=PlainTextResponse)
def get_leaderboard_csv(
    hackathon_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    
    is_published = hackathon.status in [HackathonStatus.COMPLETED, HackathonStatus.VOTING]
    if not is_published:
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        verify_hackathon_management_access(hackathon, current_user)

    csv_data = export_leaderboard_csv(hackathon, db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=leaderboard_{hackathon.slug}.csv"}
    )

@router.get("/{hackathon_id}/leaderboard.json")
@router.get("/hackathons/{hackathon_id}/leaderboard.json")
def get_leaderboard_json(
    hackathon_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    
    is_published = hackathon.status in [HackathonStatus.COMPLETED, HackathonStatus.VOTING]
    if not is_published:
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        verify_hackathon_management_access(hackathon, current_user)

    return export_leaderboard_json(hackathon, db)

@router.get("/{hackathon_id}/projects.csv", response_class=PlainTextResponse)
@router.get("/hackathons/{hackathon_id}/projects.csv", response_class=PlainTextResponse)
def get_projects_csv(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    csv_data = export_projects_csv(hackathon, db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=projects_{hackathon.slug}.csv"}
    )

@router.get("/{hackathon_id}/participants.csv", response_class=PlainTextResponse)
@router.get("/hackathons/{hackathon_id}/participants.csv", response_class=PlainTextResponse)
def get_participants_csv(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    csv_data = export_participants_csv(hackathon, db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=participants_{hackathon.slug}.csv"}
    )

@router.get("/{hackathon_id}/evaluations.csv", response_class=PlainTextResponse)
@router.get("/hackathons/{hackathon_id}/evaluations.csv", response_class=PlainTextResponse)
def get_evaluations_csv(
    hackathon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    csv_data = export_evaluations_csv(hackathon, db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=evaluations_{hackathon.slug}.csv"}
    )
