from datetime import datetime, timedelta
from fastapi import status

def test_community_voting_flow(client, user_tokens):
    org_headers = user_tokens["organizer"]
    p1_headers = user_tokens["participant1"]
    p2_headers = user_tokens["participant2"]
    now = datetime.utcnow()

    h_res = client.post("/api/v1/hackathons", json={
        "title": "Community Vote Hackathon",
        "tagline": "Voting tests",
        "description": "Voting flow verification",
        "registration_start": (now - timedelta(days=2)).isoformat(),
        "registration_deadline": (now + timedelta(days=1)).isoformat(),
        "submission_deadline": (now + timedelta(days=2)).isoformat(),
        "judging_deadline": (now + timedelta(days=5)).isoformat(),
        "is_community_voting_enabled": True
    }, headers=org_headers)
    hack_id = h_res.json()["id"]

    client.patch(f"/api/v1/hackathons/{hack_id}", json={"status": "SUBMISSION_OPEN"}, headers=org_headers)

    t_res = client.post("/api/v1/teams", json={"hackathon_id": hack_id, "name": "Team Vote"}, headers=p1_headers)
    team_id = t_res.json()["id"]

    p_res = client.post("/api/v1/projects", json={
        "hackathon_id": hack_id, "team_id": team_id,
        "title": "Vote Winner", "tagline": "Upvote me", "description": "Good project",
        "status": "SUBMITTED"
    }, headers=p1_headers)
    project_id = p_res.json()["id"]

    # 1. Team member cannot self-vote
    self_vote = client.post("/api/v1/votes", json={"hackathon_id": hack_id, "project_id": project_id}, headers=p1_headers)
    assert self_vote.status_code == status.HTTP_400_BAD_REQUEST

    # 2. Participant 2 can vote
    v_res = client.post("/api/v1/votes", json={"hackathon_id": hack_id, "project_id": project_id}, headers=p2_headers)
    assert v_res.status_code == status.HTTP_201_CREATED

    # 3. Check status
    stat_res = client.get(f"/api/v1/votes/{project_id}/status", headers=p2_headers)
    assert stat_res.status_code == status.HTTP_200_OK
    assert stat_res.json()["has_voted"] is True
    assert stat_res.json()["total_votes"] == 1

    # 4. Retract vote
    retract_res = client.delete(f"/api/v1/votes/{project_id}", headers=p2_headers)
    assert retract_res.status_code == status.HTTP_200_OK

    stat_res2 = client.get(f"/api/v1/votes/{project_id}/status", headers=p2_headers)
    assert stat_res2.json()["has_voted"] is False
    assert stat_res2.json()["total_votes"] == 0
