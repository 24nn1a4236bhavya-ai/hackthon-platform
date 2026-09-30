from typing import List, Optional, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.hackathon import Hackathon, HackathonStatus
from app.models.project import Project, ProjectStatus
from app.models.rubric import Rubric, RubricCriterion
from app.models.judging import JudgeAssignment, AssignmentStatus, Evaluation, CriterionScore
from app.schemas.judging import (
    JudgeAssignmentCreate, JudgeAssignmentResponse,
    AutoAssignRequest, AutoAssignResponse,
    EvaluationCreate, EvaluationUpdate, EvaluationResponse, EvaluationDetailResponse,
    LeaderboardResponse
)
from app.services.rbac import (
    get_current_user, get_optional_current_user,
    require_organizer, require_judge, verify_hackathon_management_access
)
from app.services.normalization import calculate_evaluation_raw_score, compute_leaderboard_rankings
from app.services.assignment import auto_assign_judges

router = APIRouter(prefix="/judging", tags=["Judging & Scoring"])

@router.get("/assignments", response_model=List[JudgeAssignmentResponse])
@router.get("/my-assignments", response_model=List[JudgeAssignmentResponse])
def list_assignments(
    hackathon_id: Optional[int] = None,
    judge_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(JudgeAssignment)
    
    if hackathon_id:
        query = query.filter(JudgeAssignment.hackathon_id == hackathon_id)

    # Participants cannot browse judge assignments
    if current_user.role == UserRole.PARTICIPANT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # If Judge role (and not Organizer/Admin), force filter to own assignments
    if current_user.role == UserRole.JUDGE:
        query = query.filter(JudgeAssignment.judge_id == current_user.id)
    elif judge_id:
        query = query.filter(JudgeAssignment.judge_id == judge_id)

    return query.order_by(JudgeAssignment.assigned_at.desc()).all()

@router.post("/assignments", response_model=JudgeAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    req: JudgeAssignmentCreate,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == req.hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project or project.hackathon_id != hackathon.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in this hackathon")

    judge = db.query(User).filter(User.id == req.judge_id).first()
    if not judge or judge.role not in [UserRole.JUDGE, UserRole.ORGANIZER, UserRole.ADMIN]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target user is not an eligible judge")

    # Conflict check
    if project.team and (judge.id == project.team.leader_id or any(m.user_id == judge.id for m in project.team.members)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Judge cannot be assigned to their own team's project")

    # Check existing
    existing = db.query(JudgeAssignment).filter(
        JudgeAssignment.judge_id == judge.id,
        JudgeAssignment.project_id == project.id
    ).first()
    if existing:
        return existing

    assignment = JudgeAssignment(
        hackathon_id=hackathon.id,
        judge_id=judge.id,
        project_id=project.id,
        status=AssignmentStatus.PENDING
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment

@router.post("/auto-assign", response_model=AutoAssignResponse)
def auto_assign_route(
    req: AutoAssignRequest,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == req.hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    res = auto_assign_judges(
        hackathon_id=req.hackathon_id,
        judges_per_project=req.judges_per_project,
        prevent_conflict_of_interest=req.prevent_conflict_of_interest,
        db=db
    )
    return AutoAssignResponse(**res)

@router.post("/hackathons/{hackathon_id}/auto-assign", response_model=AutoAssignResponse)
def auto_assign_path_route(
    hackathon_id: int,
    judges_per_project: int = 3,
    prevent_conflicts: bool = True,
    current_user: User = Depends(require_organizer),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")
    verify_hackathon_management_access(hackathon, current_user)

    res = auto_assign_judges(
        hackathon_id=hackathon_id,
        judges_per_project=judges_per_project,
        prevent_conflict_of_interest=prevent_conflicts,
        db=db
    )
    return AutoAssignResponse(**res)

@router.get("/evaluations", response_model=List[EvaluationDetailResponse])
def list_evaluations(
    hackathon_id: int,
    project_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Evaluation).filter(Evaluation.hackathon_id == hackathon_id)
    if project_id:
        query = query.filter(Evaluation.project_id == project_id)

    # Judges can only see their own evaluations unless organizer/admin
    if current_user.role == UserRole.JUDGE:
        query = query.filter(Evaluation.judge_id == current_user.id)
    elif current_user.role == UserRole.PARTICIPANT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return query.all()

@router.post("/evaluations", response_model=EvaluationDetailResponse, status_code=status.HTTP_201_CREATED)
def submit_evaluation(
    req: EvaluationCreate,
    current_user: User = Depends(require_judge),
    db: Session = Depends(get_db)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == req.hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")

    # Allow judging if in JUDGING status or if admin/organizer
    if hackathon.status not in [HackathonStatus.JUDGING, HackathonStatus.SUBMISSION_OPEN] and current_user.role not in [UserRole.ADMIN, UserRole.ORGANIZER]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Judging is not currently open (Status: {hackathon.status.value})"
        )

    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project or project.hackathon_id != hackathon.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in this hackathon")

    if project.status != ProjectStatus.SUBMITTED and current_user.role not in [UserRole.ADMIN]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot evaluate an unsubmitted project draft")

    # Conflict check
    if project.team and (current_user.id == project.team.leader_id or any(m.user_id == current_user.id for m in project.team.members)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conflict of Interest: You cannot evaluate your own project")

    # Check assignment: judges must be assigned unless ADMIN or ORGANIZER
    assignment = db.query(JudgeAssignment).filter(
        JudgeAssignment.project_id == project.id,
        JudgeAssignment.judge_id == current_user.id
    ).first()

    if not assignment and current_user.role == UserRole.JUDGE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to evaluate this project"
        )

    # Check if evaluation already exists
    existing_eval = db.query(Evaluation).filter(
        Evaluation.project_id == project.id,
        Evaluation.judge_id == current_user.id
    ).first()
    if existing_eval:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted an evaluation for this project. Use PUT to update."
        )

    # Fetch criteria map
    criteria_ids = [s.criterion_id for s in req.scores]
    criteria = db.query(RubricCriterion).filter(RubricCriterion.id.in_(criteria_ids)).all()
    criteria_map = {c.id: c for c in criteria}

    # Validate scores
    for s in req.scores:
        crit = criteria_map.get(s.criterion_id)
        if not crit:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid criterion ID: {s.criterion_id}")
        if s.score < 0 or s.score > crit.max_points:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Score {s.score} exceeds bounds [0, {crit.max_points}] for '{crit.title}'"
            )

    eval_obj = Evaluation(
        hackathon_id=hackathon.id,
        project_id=project.id,
        judge_id=current_user.id,
        private_notes=req.private_notes,
        public_feedback=req.public_feedback,
        total_raw_score=0.0
    )
    db.add(eval_obj)
    db.flush()

    criterion_score_objs = []
    for s in req.scores:
        cs = CriterionScore(
            evaluation_id=eval_obj.id,
            criterion_id=s.criterion_id,
            score=s.score
        )
        criterion_score_objs.append(cs)
        db.add(cs)

    raw_total = calculate_evaluation_raw_score(criterion_score_objs, criteria_map)
    eval_obj.total_raw_score = raw_total

    # Update assignment status if present
    if assignment:
        assignment.status = AssignmentStatus.COMPLETED

    db.commit()
    db.refresh(eval_obj)
    return eval_obj

@router.put("/evaluations/{evaluation_id}", response_model=EvaluationDetailResponse)
def update_evaluation(
    evaluation_id: int,
    req: EvaluationUpdate,
    current_user: User = Depends(require_judge),
    db: Session = Depends(get_db)
):
    eval_obj = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not eval_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")

    if eval_obj.judge_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.ORGANIZER]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own evaluation")

    if req.private_notes is not None:
        eval_obj.private_notes = req.private_notes
    if req.public_feedback is not None:
        eval_obj.public_feedback = req.public_feedback

    if req.scores is not None:
        criteria_ids = [s.criterion_id for s in req.scores]
        criteria = db.query(RubricCriterion).filter(RubricCriterion.id.in_(criteria_ids)).all()
        criteria_map = {c.id: c for c in criteria}

        # Clear old scores
        db.query(CriterionScore).filter(CriterionScore.evaluation_id == eval_obj.id).delete()
        
        criterion_score_objs = []
        for s in req.scores:
            crit = criteria_map.get(s.criterion_id)
            if not crit:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid criterion ID: {s.criterion_id}")
            cs = CriterionScore(
                evaluation_id=eval_obj.id,
                criterion_id=s.criterion_id,
                score=s.score
            )
            criterion_score_objs.append(cs)
            db.add(cs)

        raw_total = calculate_evaluation_raw_score(criterion_score_objs, criteria_map)
        eval_obj.total_raw_score = raw_total

    eval_obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(eval_obj)
    return eval_obj

@router.get("/leaderboard/{hackathon_id}", response_model=LeaderboardResponse)
@router.get("/hackathons/{hackathon_id}/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    hackathon_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found")

    # Visibility rules:
    # If COMPLETED or VOTING: published to all
    # Otherwise: only ORGANIZER and ADMIN can view unfinalized leaderboard
    is_organizer_or_admin = current_user and current_user.role in [UserRole.ADMIN, UserRole.ORGANIZER]
    is_published = hackathon.status in [HackathonStatus.COMPLETED, HackathonStatus.VOTING]

    if not is_published and not is_organizer_or_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Leaderboard results are not yet published for this hackathon"
        )

    rankings = compute_leaderboard_rankings(hackathon_id, db)
    total_evals = db.query(Evaluation).filter(Evaluation.hackathon_id == hackathon_id).count()

    return LeaderboardResponse(
        hackathon_id=hackathon.id,
        hackathon_title=hackathon.title,
        status=hackathon.status.value,
        is_published=is_published,
        total_projects=len(rankings),
        total_evaluations=total_evals,
        rankings=rankings
    )
