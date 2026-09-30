from datetime import datetime, timedelta
from fastapi import status

def test_team_formation_and_project_submission(client, user_tokens):
    org_headers = user_tokens["organizer"]
    p1_headers = user_tokens["participant1"]
    p2_headers = user_tokens["participant2"]
    now = datetime.utcnow()

    # 1. Create Hackathon & set SUBMISSION_OPEN
    h_res = client.post("/api/v1/hackathons", json={
        "title": "Hackathon For Teams & Projects",
        "tagline": "Test team workflows",
        "description": "Lifecycle testing",
        "registration_start": (now - timedelta(days=2)).isoformat(),
        "registration_deadline": (now + timedelta(days=2)).isoformat(),
        "submission_deadline": (now + timedelta(days=5)).isoformat(),
        "judging_deadline": (now + timedelta(days=8)).isoformat(),
        "max_team_size": 2
    }, headers=org_headers)
    hack_id = h_res.json()["id"]

    client.patch(f"/api/v1/hackathons/{hack_id}", json={"status": "SUBMISSION_OPEN"}, headers=org_headers)

    # 2. Participant 1 creates a team
    t_res = client.post("/api/v1/teams", json={
        "hackathon_id": hack_id,
        "name": "Alpha Pioneers"
    }, headers=p1_headers)
    assert t_res.status_code == status.HTTP_201_CREATED
    team_data = t_res.json()
    team_id = team_data["id"]
    invite_code = team_data["invite_code"]
    assert team_data["leader"]["username"] == "part1_test"

    # 3. Participant 2 joins via invite_code
    join_res = client.post("/api/v1/teams/join", json={"invite_code": invite_code}, headers=p2_headers)
    assert join_res.status_code == status.HTTP_200_OK
    assert len(join_res.json()["members"]) == 2

    # 4. Create Project Draft
    p_res = client.post("/api/v1/projects", json={
        "hackathon_id": hack_id,
        "team_id": team_id,
        "title": "Quantum Flow",
        "tagline": "Decentralized task scheduler",
        "description": "### Quantum Flow architecture\nSolves local scheduling.",
        "repo_url": "https://github.com/alpha/quantum",
        "tech_stack": "Rust, Python, React",
        "status": "DRAFT"
    }, headers=p1_headers)
    assert p_res.status_code == status.HTTP_201_CREATED
    project_id = p_res.json()["id"]
    assert p_res.json()["status"] == "DRAFT"

    # 5. Finalize Submission
    submit_res = client.post(f"/api/v1/projects/{project_id}/submit", headers=p2_headers)
    assert submit_res.status_code == status.HTTP_200_OK
    assert submit_res.json()["status"] == "SUBMITTED"
    assert submit_res.json()["submitted_at"] is not None
