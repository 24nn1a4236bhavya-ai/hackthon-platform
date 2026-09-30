import sys
import os
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app as fastapi_app
import app.models
from app.database import Base, engine

def test_full_dynamic_hackathon_lifecycle(client):
    # ---------------------------------------------------------
    # 1. Register a brand new organizer
    # ---------------------------------------------------------
    organizer_payload = {
        "email": "prof_sharma@university.edu",
        "username": "prof_sharma",
        "full_name": "Prof. Rajesh Sharma",
        "password": "SecurePassword123!",
        "role": "ORGANIZER",
        "institution": "Apex Institute of Technology"
    }
    resp = client.post("/api/v1/auth/register", json=organizer_payload)
    assert resp.status_code in [200, 201]
    org_token = resp.json()["access_token"]
    org_headers = {"Authorization": f"Bearer {org_token}"}

    # Verify user profile contains new fields
    me_resp = client.get("/api/v1/users/me", headers=org_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["institution"] == "Apex Institute of Technology"

    # ---------------------------------------------------------
    # 2. Organizer creates completely new Hackathon
    # ---------------------------------------------------------
    hackathon_payload = {
        "title": "National Student Innovation Challenge 2027",
        "tagline": "Empowering tomorrow's breakthrough tech innovators",
        "description": "A nationwide open challenge for student innovators building sustainable technology.",
        "registration_start": "2027-01-01T00:00:00",
        "registration_deadline": "2027-02-01T23:59:59",
        "submission_deadline": "2027-02-15T23:59:59",
        "judging_deadline": "2027-02-28T23:59:59",
        "min_team_size": 1,
        "max_team_size": 4,
        "is_community_voting_enabled": True
    }
    h_resp = client.post("/api/v1/hackathons", json=hackathon_payload, headers=org_headers)
    assert h_resp.status_code == 201, h_resp.text
    hackathon = h_resp.json()
    h_id = hackathon["id"]
    h_slug = hackathon["slug"]
    assert hackathon["title"] == "National Student Innovation Challenge 2027"

    # Transition to REGISTRATION_OPEN
    client.put(f"/api/v1/hackathons/{h_id}", json={"status": "REGISTRATION_OPEN"}, headers=org_headers)

    # ---------------------------------------------------------
    # 3. Add custom challenge tracks
    # ---------------------------------------------------------
    t1_resp = client.post(f"/api/v1/hackathons/{h_id}/tracks", json={
        "name": "Green Tech & Renewable Energy",
        "description": "Smart IoT & AI systems for pollution and energy reduction"
    }, headers=org_headers)
    assert t1_resp.status_code == 201
    track1_id = t1_resp.json()["id"]

    t2_resp = client.post(f"/api/v1/hackathons/{h_id}/tracks", json={
        "name": "Smart Healthcare & Assistive AI",
        "description": "Accessible digital health diagnostics and patient care"
    }, headers=org_headers)
    assert t2_resp.status_code == 201
    track2_id = t2_resp.json()["id"]

    # ---------------------------------------------------------
    # 4. Add custom prizes
    # ---------------------------------------------------------
    p1_resp = client.post(f"/api/v1/hackathons/{h_id}/prizes", json={
        "title": "Grand Champion Innovation Trophy",
        "description": "Best overall technology, novelty, and execution",
        "reward_amount": "$15,000 USD + Seed Grant",
        "place": 1
    }, headers=org_headers)
    assert p1_resp.status_code == 201
    assert p1_resp.json()["reward_amount"] == "$15,000 USD + Seed Grant"

    p2_resp = client.post(f"/api/v1/hackathons/{h_id}/prizes", json={
        "title": "Green Tech Excellence Award",
        "description": "Top performing solution in sustainability",
        "reward_amount": "$5,000 USD",
        "track_id": track1_id,
        "place": 1
    }, headers=org_headers)
    assert p2_resp.status_code == 201

    # Verify prizes list endpoint
    prizes_list = client.get(f"/api/v1/hackathons/{h_id}/prizes")
    assert prizes_list.status_code == 200
    assert len(prizes_list.json()) == 2

    # ---------------------------------------------------------
    # 5. Create custom rubric with weighted criteria
    # ---------------------------------------------------------
    rubric_payload = {
        "hackathon_id": h_id,
        "name": "National Innovation Scorecard",
        "criteria": [
            {
                "title": "Innovation & Originality",
                "description": "Uniqueness and novelty of the core approach",
                "max_points": 10,
                "weight": 0.30
            },
            {
                "title": "Technical Depth & Execution",
                "description": "System architecture, code quality, and robustness",
                "max_points": 10,
                "weight": 0.40
            },
            {
                "title": "Real-World Impact & Feasibility",
                "description": "Viability for immediate community deployment",
                "max_points": 10,
                "weight": 0.30
            }
        ]
    }
    rubric_resp = client.post("/api/v1/rubrics", json=rubric_payload, headers=org_headers)
    assert rubric_resp.status_code == 201, rubric_resp.text
    rubric = rubric_resp.json()
    assert len(rubric["criteria"]) == 3

    # ---------------------------------------------------------
    # 6. Register two student participants
    # ---------------------------------------------------------
    p1_data = {
        "email": "student_arun@apex.edu",
        "username": "student_arun",
        "full_name": "Arun Patel",
        "password": "Password123!",
        "role": "PARTICIPANT",
        "institution": "Apex Tech"
    }
    r1 = client.post("/api/v1/auth/register", json=p1_data)
    t1_token = r1.json()["access_token"]
    h1_headers = {"Authorization": f"Bearer {t1_token}"}

    p2_data = {
        "email": "student_priya@apex.edu",
        "username": "student_priya",
        "full_name": "Priya Sen",
        "password": "Password123!",
        "role": "PARTICIPANT",
        "institution": "Apex Tech"
    }
    r2 = client.post("/api/v1/auth/register", json=p2_data)
    t2_token = r2.json()["access_token"]
    h2_headers = {"Authorization": f"Bearer {t2_token}"}

    # Register both for the hackathon
    reg1 = client.post(f"/api/v1/hackathons/{h_id}/register", headers=h1_headers)
    assert reg1.status_code == 200
    reg2 = client.post(f"/api/v1/hackathons/{h_id}/register", headers=h2_headers)
    assert reg2.status_code == 200

    # ---------------------------------------------------------
    # 7. Form a team and invite member via code
    # ---------------------------------------------------------
    team_resp = client.post(f"/api/v1/teams", json={
        "hackathon_id": h_id,
        "name": "Quantum Solvers",
        "description": "Dedicated to solving environmental crises with edge AI"
    }, headers=h1_headers)
    assert team_resp.status_code == 201
    team = team_resp.json()
    invite_code = team["invite_code"]

    # Student 2 joins using invite code
    join_resp = client.post("/api/v1/teams/join", json={"invite_code": invite_code}, headers=h2_headers)
    assert join_resp.status_code == 200
    assert len(join_resp.json()["members"]) == 2

    # ---------------------------------------------------------
    # 8. Create and finalize project submission
    # ---------------------------------------------------------
    # Open submissions
    client.put(f"/api/v1/hackathons/{h_id}", json={"status": "SUBMISSION_OPEN"}, headers=org_headers)

    project_payload = {
        "hackathon_id": h_id,
        "team_id": team["id"],
        "track_id": track1_id,
        "title": "EcoSense: Distributed Pollution Monitor",
        "tagline": "IoT + Edge AI for real-time community emission tracking",
        "description": "EcoSense deploys localized mesh sensors to continuously monitor PM2.5, SO2, and CO levels.",
        "repo_url": "https://github.com/apex-students/ecosense",
        "demo_url": "https://ecosense.apex.edu",
        "video_url": "https://youtube.com/watch?v=mock123",
        "presentation_url": "https://speakerdeck.com/apex/ecosense",
        "additional_info": "Demo credentials: user=guest, pass=demo123",
        "tech_stack": "FastAPI, React, SQLite, Mosquitto MQTT",
        "status": "DRAFT"
    }
    proj_resp = client.post("/api/v1/projects", json=project_payload, headers=h1_headers)
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    # Finalize and lock submission
    submit_resp = client.post(f"/api/v1/projects/{project_id}/submit", headers=h1_headers)
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "SUBMITTED"

    # ---------------------------------------------------------
    # 9. Transition to JUDGING and invite two independent judges
    # ---------------------------------------------------------
    client.put(f"/api/v1/hackathons/{h_id}", json={"status": "JUDGING"}, headers=org_headers)

    # Organizer invites judge 1
    j1_resp = client.post(f"/api/v1/hackathons/{h_id}/judges", json={
        "email": "dr_elena@greentech.org",
        "full_name": "Dr. Elena Vance",
        "notes": "Sustainability systems architect"
    }, headers=org_headers)
    assert j1_resp.status_code in [200, 201]
    j1_user = j1_resp.json()

    # Organizer invites judge 2
    j2_resp = client.post(f"/api/v1/hackathons/{h_id}/judges", json={
        "email": "marcus_brody@institute.org",
        "full_name": "Marcus Brody",
        "notes": "Edge AI specialist"
    }, headers=org_headers)
    assert j2_resp.status_code in [200, 201]
    j2_user = j2_resp.json()

    # Check list of invited judges
    judges_list = client.get(f"/api/v1/hackathons/{h_id}/judges", headers=org_headers)
    assert judges_list.status_code == 200
    assert len(judges_list.json()) >= 2

    # ---------------------------------------------------------
    # 10. Run round-robin auto-assignment
    # ---------------------------------------------------------
    assign_resp = client.post(
        f"/api/v1/judging/hackathons/{h_id}/auto-assign?judges_per_project=2&prevent_conflicts=true",
        headers=org_headers
    )
    assert assign_resp.status_code == 200
    assert assign_resp.json()["total_assignments_created"] == 2

    # ---------------------------------------------------------
    # 11. Judges login and submit evaluations
    # ---------------------------------------------------------
    # Judge 1 login
    j1_token = client.post("/api/v1/auth/token", data={
        "username": j1_user["username"],
        "password": "DemoPassword123!"
    }).json()["access_token"]
    j1_headers = {"Authorization": f"Bearer {j1_token}"}

    # Fetch judge 1 assignments
    j1_assigned = client.get("/api/v1/judging/my-assignments", headers=j1_headers).json()
    assert len(j1_assigned) == 1
    assert j1_assigned[0]["project_id"] == project_id

    # Judge 1 submits evaluation
    c_ids = [c["id"] for c in rubric["criteria"]]
    eval1_resp = client.post("/api/v1/judging/evaluations", json={
        "hackathon_id": h_id,
        "project_id": project_id,
        "rubric_id": rubric["id"],
        "scores": [
            {"criterion_id": c_ids[0], "score": 9.0},
            {"criterion_id": c_ids[1], "score": 9.5},
            {"criterion_id": c_ids[2], "score": 9.0}
        ],
        "public_feedback": "Exceptional edge deployment and comprehensive sensor telemetry."
    }, headers=j1_headers)
    assert eval1_resp.status_code in [200, 201]

    # Judge 2 login
    j2_token = client.post("/api/v1/auth/token", data={
        "username": j2_user["username"],
        "password": "DemoPassword123!"
    }).json()["access_token"]
    j2_headers = {"Authorization": f"Bearer {j2_token}"}

    # Judge 2 submits evaluation
    eval2_resp = client.post("/api/v1/judging/evaluations", json={
        "hackathon_id": h_id,
        "project_id": project_id,
        "rubric_id": rubric["id"],
        "scores": [
            {"criterion_id": c_ids[0], "score": 8.5},
            {"criterion_id": c_ids[1], "score": 9.0},
            {"criterion_id": c_ids[2], "score": 8.5}
        ],
        "public_feedback": "Solid engineering foundation and clean documentation."
    }, headers=j2_headers)
    assert eval2_resp.status_code in [200, 201]

    # ---------------------------------------------------------
    # 12. Complete hackathon & verify live statistics
    # ---------------------------------------------------------
    client.put(f"/api/v1/hackathons/{h_id}", json={"status": "COMPLETED"}, headers=org_headers)

    stats_resp = client.get(f"/api/v1/hackathons/{h_id}/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_registrations"] >= 2
    assert stats["total_teams"] >= 1
    assert stats["submitted_projects"] >= 1
    assert stats["completed_evaluations"] == 2
    assert stats["evaluation_completion_rate"] == 100.0

    # ---------------------------------------------------------
    # 13. Verify Leaderboard Rankings
    # ---------------------------------------------------------
    lb_resp = client.get(f"/api/v1/judging/hackathons/{h_id}/leaderboard")
    assert lb_resp.status_code == 200
    lb = lb_resp.json()
    assert len(lb["rankings"]) == 1
    top_project = lb["rankings"][0]
    assert top_project["project_title"] == "EcoSense: Distributed Pollution Monitor"
    assert top_project["rank"] == 1
    assert top_project["raw_average_score"] > 8.5

    # ---------------------------------------------------------
    # 14. Verify Export Endpoints (CSV & JSON)
    # ---------------------------------------------------------
    exp_lb = client.get(f"/api/v1/exports/hackathons/{h_id}/leaderboard.csv")
    assert exp_lb.status_code == 200
    assert "EcoSense" in exp_lb.text

    exp_json = client.get(f"/api/v1/exports/hackathons/{h_id}/leaderboard.json")
    assert exp_json.status_code == 200
    res_data = exp_json.json()
    rankings_list = res_data["rankings"] if isinstance(res_data, dict) and "rankings" in res_data else res_data
    assert rankings_list[0]["project_title"] == "EcoSense: Distributed Pollution Monitor"

    # ---------------------------------------------------------
    # 15. Verify CSV participant bulk import
    # ---------------------------------------------------------
    csv_content = (
        "email,full_name,username,team_name\n"
        "sita_raman@apex.edu,Sita Raman,sita_raman,SolarBots\n"
        "vikram_aditya@apex.edu,Vikram Aditya,vikram_aditya,SolarBots\n"
    )
    files = {"file": ("participants.csv", csv_content, "text/csv")}
    csv_resp = client.post(f"/api/v1/hackathons/{h_id}/import/participants", files=files, headers=org_headers)
    assert csv_resp.status_code == 200
    import_res = csv_resp.json()
    assert import_res["imported_count"] == 2
    assert import_res["registered_count"] == 2
