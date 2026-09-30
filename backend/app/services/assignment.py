from typing import List, Dict, Set
from collections import defaultdict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.team import TeamMember
from app.models.judging import JudgeAssignment, AssignmentStatus

def auto_assign_judges(
    hackathon_id: int,
    judges_per_project: int,
    prevent_conflict_of_interest: bool,
    db: Session
) -> Dict[str, int]:
    # 1. Fetch submitted projects
    projects = db.query(Project).filter(
        Project.hackathon_id == hackathon_id,
        Project.status == ProjectStatus.SUBMITTED
    ).all()

    if not projects:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No submitted projects found in this hackathon to assign"
        )

    # 2. Fetch available judges (prefer dedicated UserRole.JUDGE, fallback to ADMIN/ORGANIZER)
    judges = db.query(User).filter(
        User.role == UserRole.JUDGE,
        User.is_active == True
    ).all()

    if not judges:
        judges = db.query(User).filter(
            User.role.in_([UserRole.ADMIN, UserRole.ORGANIZER]),
            User.is_active == True
        ).all()

    if not judges:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No eligible judges found in the system"
        )

    # 3. Existing assignments to avoid duplicate re-assignment
    existing_assignments = db.query(JudgeAssignment).filter(
        JudgeAssignment.hackathon_id == hackathon_id
    ).all()
    assigned_pairs: Set[tuple] = {(a.judge_id, a.project_id) for a in existing_assignments}

    # Track judge current load
    judge_load = defaultdict(int)
    for a in existing_assignments:
        judge_load[a.judge_id] += 1
    for j in judges:
        judge_load[j.id] += 0

    # 4. Map conflicts of interest (team members/leaders)
    conflicts: Dict[int, Set[int]] = defaultdict(set)
    if prevent_conflict_of_interest:
        for p in projects:
            if p.team:
                conflicts[p.id].add(p.team.leader_id)
                for tm in p.team.members:
                    conflicts[p.id].add(tm.user_id)

    # Count how many judges already assigned per project
    project_judge_counts = defaultdict(int)
    for a in existing_assignments:
        project_judge_counts[a.project_id] += 1

    new_assignments = []
    
    # 5. Round-robin assignment targeting min load
    for p in projects:
        needed = max(0, judges_per_project - project_judge_counts[p.id])
        if needed <= 0:
            continue

        # Sort judges by current assignment load ascending
        available_judges = sorted(
            [
                j for j in judges
                if (j.id, p.id) not in assigned_pairs
                and (not prevent_conflict_of_interest or j.id not in conflicts[p.id])
            ],
            key=lambda j: (judge_load[j.id], j.id)
        )

        candidates = available_judges[:needed]
        for judge in candidates:
            assignment = JudgeAssignment(
                hackathon_id=hackathon_id,
                judge_id=judge.id,
                project_id=p.id,
                status=AssignmentStatus.PENDING
            )
            new_assignments.append(assignment)
            assigned_pairs.add((judge.id, p.id))
            judge_load[judge.id] += 1
            project_judge_counts[p.id] += 1

    if new_assignments:
        db.add_all(new_assignments)
        db.commit()

    return {
        "total_assignments_created": len(new_assignments),
        "judges_count": len(judges),
        "projects_count": len(projects)
    }
