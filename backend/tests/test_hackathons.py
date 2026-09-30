from datetime import datetime, timedelta
from fastapi import status

def test_hackathon_lifecycle_and_registration(client, user_tokens):
    org_headers = user_tokens["organizer"]
    part_headers = user_tokens["participant1"]
    now = datetime.utcnow()

    # 1. Create Hackathon
    res = client.post("/api/v1/hackathons", json={
        "title": "Spring CodeFest 2026",
        "tagline": "Innovate for good",
        "description": "Full lifecycle test event",
        "registration_start": (now - timedelta(days=2)).isoformat(),
        "registration_deadline": (now + timedelta(days=5)).isoformat(),
        "submission_deadline": (now + timedelta(days=8)).isoformat(),
        "judging_deadline": (now + timedelta(days=12)).isoformat(),
    }, headers=org_headers)
    assert res.status_code == status.HTTP_201_CREATED
    hack_id = res.json()["id"]

    # 2. Add Track
    res_track = client.post(f"/api/v1/hackathons/{hack_id}/tracks", json={
        "name": "Machine Learning Track",
        "description": "Novel ML implementations"
    }, headers=org_headers)
    assert res_track.status_code == status.HTTP_201_CREATED

    # 3. Transition to REGISTRATION_OPEN
    res_open = client.patch(f"/api/v1/hackathons/{hack_id}", json={
        "status": "REGISTRATION_OPEN"
    }, headers=org_headers)
    assert res_open.status_code == status.HTTP_200_OK
    assert res_open.json()["status"] == "REGISTRATION_OPEN"

    # 4. Participant registers
    res_reg = client.post(f"/api/v1/hackathons/{hack_id}/register", headers=part_headers)
    assert res_reg.status_code == status.HTTP_200_OK
    assert res_reg.json()["status"] == "REGISTERED"

    # 5. Check detail with registration indicator
    res_detail = client.get(f"/api/v1/hackathons/{hack_id}", headers=part_headers)
    assert res_detail.status_code == status.HTTP_200_OK
    assert res_detail.json()["is_user_registered"] is True
    assert res_detail.json()["registrations_count"] == 1
