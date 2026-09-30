from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.hackathon import Hackathon
from app.models.rubric import Rubric, RubricCriterion
from app.schemas.rubric import (
    RubricCreate, RubricUpdate, RubricResponse, RubricDetailResponse,
    RubricCriterionCreate, RubricCriterionResponse
)
from app.services.rbac import (
    get_current_user, require_organizer, verify_hackathon_management_access
)

router = APIRouter(prefix="/rubrics", tags=["Rubrics"])

def _normalize_criterion_weights(criteria_list):
    """Ensure criteria weights are non-zero and properly normalized to sum to 1.0."""
    total_weight = sum(c.weight for c in criteria_list)
    if total_weight <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total criteria weight must be greater than zero"
        )
    # If weights were given as percentages (e.g. 25, 25, 30, 20), normalize to fraction
    if total_weight > 1.5:
        return [(c, c.weight / total_weight) for c in criteria_list]
    # If already around 1.0, adjust proportionately to exactly 1.0
    return [(c, c.weight / total_weight) for c in criteria_list]

@router.get("", response_model=List[RubricDetailResponse])
def list_rubrics(hackathon_id: int, db: Session = Depends(get_db)):
    return db.query(Rubric).filter(Rubric.hackathon_id == hackathon_id).all()

@router.post("", response_model=RubricDetailResponse, status_code=status.HTTP_201_CREATED)
def create_rubric(
    req: RubricCreate,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == req.hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    if not req.criteria:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rubric must contain at least one criterion")

    normalized_criteria = _normalize_criterion_weights(req.criteria)

    rubric = Rubric(
        hackathon_id=req.hackathon_id,
        name=req.name,
        description=req.description
    )
    db.add(rubric)
    db.flush()

    for c, norm_weight in normalized_criteria:
        crit = RubricCriterion(
            rubric_id=rubric.id,
            title=c.title,
            description=c.description,
            max_points=c.max_points,
            weight=round(norm_weight, 4)
        )
        db.add(crit)

    db.commit()
    db.refresh(rubric)
    return rubric

@router.get("/{rubric_id}", response_model=RubricDetailResponse)
def get_rubric(rubric_id: int, db: Session = Depends(get_db)):
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubric not found")
    return rubric

@router.put("/{rubric_id}", response_model=RubricDetailResponse)
def update_rubric(
    rubric_id: int,
    req: RubricUpdate,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubric not found")
    verify_hackathon_management_access(rubric.hackathon, current_user)

    if req.name is not None:
        rubric.name = req.name
    if req.description is not None:
        rubric.description = req.description

    if req.criteria is not None:
        if not req.criteria:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rubric must contain at least one criterion")
        normalized_criteria = _normalize_criterion_weights(req.criteria)
        
        # Replace criteria
        db.query(RubricCriterion).filter(RubricCriterion.rubric_id == rubric.id).delete()
        for c, norm_weight in normalized_criteria:
            crit = RubricCriterion(
                rubric_id=rubric.id,
                title=c.title,
                description=c.description,
                max_points=c.max_points,
                weight=round(norm_weight, 4)
            )
            db.add(crit)

    db.commit()
    db.refresh(rubric)
    return rubric

@router.delete("/{rubric_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rubric(
    rubric_id: int,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubric not found")
    verify_hackathon_management_access(rubric.hackathon, current_user)

    db.delete(rubric)
    db.commit()
    return None
