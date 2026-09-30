from datetime import datetime, timedelta
from fastapi import status

def test_judging_and_normalization_pipeline(client, user_tokens, seed_users):
    org_headers = user_tokens["organizer"]
    j1_headers = user_tokens["judge1"]
    j2_headers = user_tokens["judge2"]
    p1_headers = user_tokens["participant1"]
    p2_headers = user_tokens["participant2"]
    now = datetime.utcnow()

    # 1. Setup Hackathon in SUBMISSION_OPEN
    h_res = client.post("/api/v1/hackathons", json={
        "title": "Judging Test Hackathon",
        "tagline": "Validating scoring and Z-score normalization",
        "description": "Scoring algorithms test",
        "registration_start": (now - timedelta(days=2)).isoformat(),
        "registration_deadline": (now + timedelta(days=1)).isoformat(),
        "submission_deadline": (now + timedelta(days=2)).isoformat(),
        "judging_deadline": (now + timedelta(days=5)).isoformat(),
    }, headers=org_headers)
    hack_id = h_res.json()["id"]

    # Transition to SUBMISSION_OPEN so teams can form and submit
    client.patch(f"/api/v1/hackathons/{hack_id}", json={"status": "SUBMISSION_OPEN"}, headers=org_headers)

    # 2. Create Rubric
    r_res = client.post("/api/v1/rubrics", json={
        "hackathon_id": hack_id,
        "name": "Standard Evaluation Rubric",
        "criteria": [
            {"title": "Technical Complexity", "description": "System architecture", "max_points": 10.0, "weight": 0.6},
            {"title": "UX and Polish", "description": "Design quality", "max_points": 10.0, "weight": 0.4}
        ]
    }, headers=org_headers)
    assert r_res.status_code == status.HTTP_201_CREATED
    crit_ids = [c["id"] for c in r_res.json()["criteria"]]

    # 3. Create two teams and submitted projects
    t1_res = client.post("/api/v1/teams", json={"hackathon_id": hack_id, "name": "Team 1"}, headers=p1_headers)
    team1_id = t1_res.json()["id"]
    p1_res = client.post("/api/v1/projects", json={
        "hackathon_id": hack_id, "team_id": team1_id,
        "title": "Project Alpha", "tagline": "First project", "description": "Description Alpha",
        "status": "SUBMITTED"
    }, headers=p1_headers)
    project1_id = p1_res.json()["id"]

    t2_res = client.post("/api/v1/teams", json={"hackathon_id": hack_id, "name": "Team 2"}, headers=p2_headers)
    team2_id = t2_res.json()["id"]
    p2_res = client.post("/api/v1/projects", json={
        "hackathon_id": hack_id, "team_id": team2_id,
        "title": "Project Beta", "tagline": "Second project", "description": "Description Beta",
        "status": "SUBMITTED"
    }, headers=p2_headers)
    project2_id = p2_res.json()["id"]

    # 4. Transition to JUDGING phase
    client.patch(f"/api/v1/hackathons/{hack_id}", json={"status": "JUDGING"}, headers=org_headers)

    # 5. Assign Judge 1 to both projects
    j1_user_id = seed_users["judge1"].id
    assign1 = client.post("/api/v1/judging/assignments", json={
        "hackathon_id": hack_id,
        "judge_id": j1_user_id,
        "project_id": project1_id
    }, headers=org_headers)
    assert assign1.status_code == status.HTTP_201_CREATED

    assign2 = client.post("/api/v1/judging/assignments", json={
        "hackathon_id": hack_id,
        "judge_id": j1_user_id,
        "project_id": project2_id
    }, headers=org_headers)
    assert assign2.status_code == status.HTTP_201_CREATED

    # 6. Judge 1 evaluates Project Alpha (e.g. 8/10 on crit 1, 9/10 on crit 2)
    # Expected weighted raw score: (8/10 * 0.6 + 9/10 * 0.4) * 100 = (0.48 + 0.36) * 100 = 84.0
    eval1_res = client.post("/api/v1/judging/evaluations", json={
        "hackathon_id": hack_id,
        "project_id": project1_id,
        "scores": [
            {"criterion_id": crit_ids[0], "score": 8.0},
            {"criterion_id": crit_ids[1], "score": 9.0}
        ],
        "public_feedback": "Great technical implementation!"
    }, headers=j1_headers)
    assert eval1_res.status_code == status.HTTP_201_CREATED
    assert abs(eval1_res.json()["total_raw_score"] - 84.0) < 0.1

    # Judge 1 evaluates Project Beta (e.g. 6/10 on crit 1, 7/10 on crit 2)
    # Raw: (6/10 * 0.6 + 7/10 * 0.4) * 100 = (0.36 + 0.28) * 100 = 64.0
    eval2_res = client.post("/api/v1/judging/evaluations", json={
        "hackathon_id": hack_id,
        "project_id": project2_id,
        "scores": [
            {"criterion_id": crit_ids[0], "score": 6.0},
            {"criterion_id": crit_ids[1], "score": 7.0}
        ],
        "public_feedback": "Needs polish"
    }, headers=j1_headers)
    assert eval2_res.status_code == status.HTTP_201_CREATED
    assert abs(eval2_res.json()["total_raw_score"] - 64.0) < 0.1

    # 7. Check Leaderboard
    lb_res = client.get(f"/api/v1/judging/leaderboard/{hack_id}", headers=org_headers)
    assert lb_res.status_code == status.HTTP_200_OK
    rankings = lb_res.json()["rankings"]
    assert len(rankings) == 2
    # Project Alpha should be rank 1
    assert rankings[0]["project_id"] == project1_id
    assert rankings[0]["rank"] == 1
    assert rankings[0]["raw_average_score"] == 84.0
    assert rankings[1]["project_id"] == project2_id
    assert rankings[1]["rank"] == 2
