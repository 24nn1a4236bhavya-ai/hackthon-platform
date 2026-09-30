from datetime import datetime, timedelta
from fastapi import status

def test_participant_cannot_create_hackathon(client, user_tokens):
    headers = user_tokens["participant1"]
    now = datetime.utcnow()
    res = client.post("/api/v1/hackathons", json={
        "title": "Unauthorized Hackathon",
        "tagline": "Should fail",
        "description": "Participant cannot create",
        "registration_start": (now - timedelta(days=1)).isoformat(),
        "registration_deadline": (now + timedelta(days=5)).isoformat(),
        "submission_deadline": (now + timedelta(days=7)).isoformat(),
        "judging_deadline": (now + timedelta(days=10)).isoformat(),
    }, headers=headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN

def test_organizer_can_create_hackathon(client, user_tokens):
    headers = user_tokens["organizer"]
    now = datetime.utcnow()
    res = client.post("/api/v1/hackathons", json={
        "title": "Organizer Created Hackathon",
        "tagline": "Authorized creation",
        "description": "Organizer can create hackathons",
        "registration_start": (now - timedelta(days=1)).isoformat(),
        "registration_deadline": (now + timedelta(days=5)).isoformat(),
        "submission_deadline": (now + timedelta(days=7)).isoformat(),
        "judging_deadline": (now + timedelta(days=10)).isoformat(),
    }, headers=headers)
    assert res.status_code == status.HTTP_201_CREATED
    assert res.json()["title"] == "Organizer Created Hackathon"

def test_admin_can_access_system_stats(client, user_tokens):
    headers = user_tokens["admin"]
    res = client.get("/api/v1/admin/stats", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    assert "total_users" in res.json()

def test_non_admin_cannot_access_system_stats(client, user_tokens):
    headers = user_tokens["organizer"]
    res = client.get("/api/v1/admin/stats", headers=headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN
