import csv
import io
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.hackathon import Hackathon, HackathonRegistration
from app.models.project import Project, ProjectStatus
from app.models.judging import Evaluation, CriterionScore
from app.models.rubric import RubricCriterion
from app.services.normalization import compute_leaderboard_rankings

def export_leaderboard_csv(hackathon: Hackathon, db: Session) -> str:
    rankings = compute_leaderboard_rankings(hackathon.id, db)
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Rank", "Project ID", "Project Title", "Team Name", 
        "Track", "Evaluations Count", "Raw Average Score", 
        "Normalized Score", "Trimmed Score", "Community Votes"
    ])
    
    for r in rankings:
        writer.writerow([
            r.rank, r.project_id, r.project_title, r.team_name,
            r.track_name or "General", r.evaluations_count,
            f"{r.raw_average_score:.2f}", f"{r.normalized_score:.2f}",
            f"{r.trimmed_score:.2f}", r.community_votes
        ])
        
    return output.getvalue()

def export_leaderboard_json(hackathon: Hackathon, db: Session) -> List[Dict[str, Any]]:
    rankings = compute_leaderboard_rankings(hackathon.id, db)
    return [r.model_dump() for r in rankings]

def export_projects_csv(hackathon: Hackathon, db: Session) -> str:
    projects = db.query(Project).filter(Project.hackathon_id == hackathon.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Project ID", "Title", "Tagline", "Team Name", "Track",
        "Status", "Repo URL", "Demo URL", "Video URL", "Tech Stack", "Submitted At"
    ])
    
    for p in projects:
        writer.writerow([
            p.id, p.title, p.tagline,
            p.team.name if p.team else "",
            p.track.name if p.track else "",
            p.status.value,
            p.repo_url or "",
            p.demo_url or "",
            p.video_url or "",
            p.tech_stack or "",
            p.submitted_at.isoformat() if p.submitted_at else ""
        ])
        
    return output.getvalue()

def export_participants_csv(hackathon: Hackathon, db: Session) -> str:
    regs = db.query(HackathonRegistration).filter(
        HackathonRegistration.hackathon_id == hackathon.id
    ).all()
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Registration ID", "User ID", "Full Name", "Username", "Email", "Status", "Registered At"
    ])
    
    for r in regs:
        writer.writerow([
            r.id, r.user_id, r.user.full_name, r.user.username, r.user.email,
            r.status.value, r.registered_at.isoformat()
        ])
        
    return output.getvalue()

def export_evaluations_csv(hackathon: Hackathon, db: Session) -> str:
    evals = db.query(Evaluation).filter(Evaluation.hackathon_id == hackathon.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Evaluation ID", "Project ID", "Project Title", "Judge ID", "Judge Name",
        "Total Raw Score", "Public Feedback", "Private Notes", "Submitted At"
    ])
    
    for e in evals:
        writer.writerow([
            e.id, e.project_id, e.project.title if e.project else "",
            e.judge_id, e.judge.full_name if e.judge else "",
            f"{e.total_raw_score:.2f}",
            e.public_feedback or "",
            e.private_notes or "",
            e.submitted_at.isoformat()
        ])
        
    return output.getvalue()
