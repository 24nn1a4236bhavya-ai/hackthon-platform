import math
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectStatus
from app.models.judging import Evaluation, CriterionScore
from app.models.rubric import RubricCriterion
from app.models.vote import CommunityVote
from app.schemas.judging import ProjectLeaderboardItem

def calculate_evaluation_raw_score(
    scores: List[CriterionScore],
    criteria_map: Dict[int, RubricCriterion]
) -> float:
    """
    Computes weighted 100-point score for an evaluation.
    Formula: Sum((score / max_points) * weight) * 100
    If weights sum to 1.0, this scales nicely to 0-100.
    If weights don't sum to 1.0, normalize by total weight.
    """
    if not scores:
        return 0.0
    
    total_weight = 0.0
    accumulated_points = 0.0
    
    for s in scores:
        criterion = criteria_map.get(s.criterion_id)
        if not criterion or criterion.max_points <= 0:
            continue
        weight = criterion.weight if criterion.weight > 0 else 1.0
        ratio = max(0.0, min(s.score / criterion.max_points, 1.0))
        accumulated_points += ratio * weight * 100.0
        total_weight += weight

    if total_weight <= 0:
        return 0.0
    
    # Scale if total weights sum was not exactly 1.0
    return round(accumulated_points / total_weight, 2)


def compute_leaderboard_rankings(
    hackathon_id: int,
    db: Session
) -> List[ProjectLeaderboardItem]:
    """
    Computes Raw, Z-Score Normalized, and Trimmed scores for all submitted projects
    in a hackathon.
    """
    # 1. Fetch submitted projects
    projects = db.query(Project).filter(
        Project.hackathon_id == hackathon_id,
        Project.status == ProjectStatus.SUBMITTED
    ).all()

    if not projects:
        return []

    # 2. Fetch all evaluations for this hackathon
    evaluations = db.query(Evaluation).filter(
        Evaluation.hackathon_id == hackathon_id
    ).all()

    # 3. Fetch community vote counts per project
    vote_records = db.query(CommunityVote).filter(
        CommunityVote.hackathon_id == hackathon_id
    ).all()
    votes_by_project = defaultdict(int)
    for v in vote_records:
        votes_by_project[v.project_id] += 1

    # Map evaluations by judge
    evals_by_judge = defaultdict(list)
    evals_by_project = defaultdict(list)
    all_raw_scores = []

    for ev in evaluations:
        evals_by_judge[ev.judge_id].append(ev.total_raw_score)
        evals_by_project[ev.project_id].append(ev)
        all_raw_scores.append(ev.total_raw_score)

    # Compute per-judge mean and sample standard deviation
    judge_stats = {}
    for judge_id, raw_scores in evals_by_judge.items():
        n = len(raw_scores)
        mean_j = sum(raw_scores) / n
        if n >= 2:
            var_j = sum((x - mean_j) ** 2 for x in raw_scores) / (n - 1)
            std_j = math.sqrt(var_j)
        else:
            std_j = 0.0
        judge_stats[judge_id] = {"mean": mean_j, "std": std_j, "count": n}

    # Compute global hackathon distribution
    if all_raw_scores:
        global_mean = sum(all_raw_scores) / len(all_raw_scores)
        if len(all_raw_scores) >= 2:
            global_var = sum((x - global_mean) ** 2 for x in all_raw_scores) / (len(all_raw_scores) - 1)
            global_std = math.sqrt(global_var)
        else:
            global_std = 15.0
    else:
        global_mean = 75.0
        global_std = 15.0

    if global_std < 1.0:
        global_std = 15.0

    # Calculate normalized score per evaluation
    eval_normalized_scores = {}
    for ev in evaluations:
        j_stat = judge_stats.get(ev.judge_id, {"mean": ev.total_raw_score, "std": 0.0, "count": 1})
        if j_stat["std"] > 1e-6 and j_stat["count"] >= 2:
            z = (ev.total_raw_score - j_stat["mean"]) / j_stat["std"]
            norm = global_mean + (z * global_std)
        else:
            # Fallback to raw score if single project or zero variance
            norm = ev.total_raw_score
        
        # Clamp to [0, 100]
        eval_normalized_scores[ev.id] = max(0.0, min(norm, 100.0))

    # Compile project scores
    project_items = []
    for p in projects:
        p_evals = evals_by_project.get(p.id, [])
        eval_count = len(p_evals)
        
        if eval_count > 0:
            raw_scores = [ev.total_raw_score for ev in p_evals]
            norm_scores = [eval_normalized_scores[ev.id] for ev in p_evals]
            
            raw_avg = round(sum(raw_scores) / eval_count, 2)
            norm_avg = round(sum(norm_scores) / eval_count, 2)
            
            # Trimmed mean (drop min and max if >= 3 evaluations)
            if eval_count >= 3:
                sorted_raw = sorted(raw_scores)
                trimmed_raw = sorted_raw[1:-1]
                trimmed_avg = round(sum(trimmed_raw) / len(trimmed_raw), 2)
            else:
                trimmed_avg = raw_avg
        else:
            raw_avg = 0.0
            norm_avg = 0.0
            trimmed_avg = 0.0

        project_items.append({
            "project_id": p.id,
            "project_title": p.title,
            "team_name": p.team.name if p.team else "No Team",
            "track_name": p.track.name if p.track else None,
            "evaluations_count": eval_count,
            "raw_average_score": raw_avg,
            "normalized_score": norm_avg,
            "trimmed_score": trimmed_avg,
            "community_votes": votes_by_project.get(p.id, 0),
            "submitted_at": p.submitted_at
        })

    # Sort hierarchy:
    # 1. Normalized score desc
    # 2. Community votes desc
    # 3. Raw average score desc
    # 4. Earliest submitted_at
    project_items.sort(
        key=lambda item: (
            item["normalized_score"],
            item["community_votes"],
            item["raw_average_score"],
            -(item["submitted_at"].timestamp() if item["submitted_at"] else 0)
        ),
        reverse=True
    )

    # Assign ranks
    result = []
    for rank_idx, item in enumerate(project_items, start=1):
        result.append(ProjectLeaderboardItem(
            rank=rank_idx,
            project_id=item["project_id"],
            project_title=item["project_title"],
            team_name=item["team_name"],
            track_name=item["track_name"],
            evaluations_count=item["evaluations_count"],
            raw_average_score=item["raw_average_score"],
            normalized_score=item["normalized_score"],
            trimmed_score=item["trimmed_score"],
            community_votes=item["community_votes"]
        ))

    return result
