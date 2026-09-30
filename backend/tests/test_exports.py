from datetime import datetime, timedelta
from fastapi import status

def test_exports_endpoints(client, user_tokens):
    org_headers = user_tokens["organizer"]
    now = datetime.utcnow()

    h_res = client.post("/api/v1/hackathons", json={
        "title": "Export Test Hackathon",
        "tagline": "CSV and JSON export test",
        "description": "Export tests",
        "registration_start": (now - timedelta(days=2)).isoformat(),
        "registration_deadline": (now + timedelta(days=1)).isoformat(),
        "submission_deadline": (now + timedelta(days=2)).isoformat(),
        "judging_deadline": (now + timedelta(days=5)).isoformat(),
    }, headers=org_headers)
    hack_id = h_res.json()["id"]

    # 1. Leaderboard CSV
    csv_res = client.get(f"/api/v1/exports/{hack_id}/leaderboard.csv", headers=org_headers)
    assert csv_res.status_code == status.HTTP_200_OK
    assert "Rank,Project ID,Project Title" in csv_res.text

    # 2. Leaderboard JSON
    json_res = client.get(f"/api/v1/exports/{hack_id}/leaderboard.json", headers=org_headers)
    assert json_res.status_code == status.HTTP_200_OK
    assert isinstance(json_res.json(), list)

    # 3. Projects CSV
    p_csv = client.get(f"/api/v1/exports/{hack_id}/projects.csv", headers=org_headers)
    assert p_csv.status_code == status.HTTP_200_OK
    assert "Project ID,Title" in p_csv.text

    # 4. Participants CSV
    part_csv = client.get(f"/api/v1/exports/{hack_id}/participants.csv", headers=org_headers)
    assert part_csv.status_code == status.HTTP_200_OK
    assert "Registration ID,User ID" in part_csv.text

    # 5. Evaluations CSV
    eval_csv = client.get(f"/api/v1/exports/{hack_id}/evaluations.csv", headers=org_headers)
    assert eval_csv.status_code == status.HTTP_200_OK
    assert "Evaluation ID,Project ID" in eval_csv.text
