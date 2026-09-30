from datetime import timedelta
import pytest
from fastapi import status
from app.services.auth import create_access_token

# 1. Valid Admin Login
def test_valid_admin_login(client, seed_users):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin_test@hackathon.local",
        "password": "Pass123!"
    })
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["username"] == "admin_test"

# 2. Valid Organizer Login
def test_valid_organizer_login(client, seed_users):
    res = client.post("/api/v1/auth/login", json={
        "username": "organizer_test",
        "password": "Pass123!"
    })
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["user"]["role"] == "ORGANIZER"
    assert data["user"]["email"] == "organizer_test@hackathon.local"

# 3. Valid Judge Login
def test_valid_judge_login(client, seed_users):
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "judge1_test@hackathon.local",
        "password": "Pass123!"
    })
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["user"]["role"] == "JUDGE"

# 4. Valid Participant Login
def test_valid_participant_login(client, seed_users):
    res = client.post("/api/v1/auth/login", json={
        "email": "participant1_test@hackathon.local",
        "password": "Pass123!"
    })
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["user"]["role"] == "PARTICIPANT"

# 5. Invalid Password
def test_invalid_password(client, seed_users):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin_test@hackathon.local",
        "password": "IncorrectPassword!"
    })
    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Invalid email or password" in res.json()["detail"]

# 6. Unknown Email
def test_unknown_email(client, seed_users):
    res = client.post("/api/v1/auth/login", json={
        "email": "nonexistent_user@example.local",
        "password": "Pass123!"
    })
    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Invalid email or password" in res.json()["detail"]

# 7. Empty Email / Username
def test_empty_email(client, seed_users):
    res = client.post("/api/v1/auth/login", json={
        "email": "   ",
        "password": "Pass123!"
    })
    assert res.status_code == status.HTTP_400_BAD_REQUEST

# 8. Empty Password
def test_empty_password(client, seed_users):
    res = client.post("/api/v1/auth/login", json={
        "email": "admin_test@hackathon.local",
        "password": ""
    })
    assert res.status_code == status.HTTP_400_BAD_REQUEST

# 9. Malformed Request
def test_malformed_request(client, seed_users):
    res = client.post("/api/v1/auth/login", content="not json", headers={"Content-Type": "application/json"})
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

# 10. Token Validation (GET /api/v1/auth/me & /api/auth/me)
def test_token_validation(client, user_tokens):
    # Test versioned route
    res = client.get("/api/v1/auth/me", headers=user_tokens["admin"])
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["role"] == "ADMIN"

    # Test compatibility unversioned route
    res_compat = client.get("/api/auth/me", headers=user_tokens["organizer"])
    assert res_compat.status_code == status.HTTP_200_OK
    assert res_compat.json()["role"] == "ORGANIZER"

# 11. Expired Token
def test_expired_token(client, seed_users):
    user = seed_users["admin"]
    expired_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=timedelta(seconds=-10)
    )
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    assert "expired" in res.json()["detail"].lower()

# 12. Unauthorized Endpoint Access (missing token)
def test_unauthorized_endpoint_access(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED

# 13. Participant Attempting Organizer API
def test_participant_attempting_organizer_api(client, user_tokens):
    headers = user_tokens["participant1"]
    res = client.post("/api/v1/hackathons", json={
        "title": "Unauthorized Hackathon",
        "tagline": "Should Fail",
        "description": "Test",
        "registration_start": "2026-10-01T00:00:00",
        "registration_deadline": "2026-10-05T00:00:00",
        "submission_deadline": "2026-10-10T00:00:00",
        "judging_deadline": "2026-10-15T00:00:00",
    }, headers=headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN

# 14. Judge Attempting Organizer API
def test_judge_attempting_organizer_api(client, user_tokens):
    headers = user_tokens["judge1"]
    res = client.post("/api/v1/hackathons", json={
        "title": "Judge Hackathon",
        "tagline": "Should Fail",
        "description": "Test",
        "registration_start": "2026-10-01T00:00:00",
        "registration_deadline": "2026-10-05T00:00:00",
        "submission_deadline": "2026-10-10T00:00:00",
        "judging_deadline": "2026-10-15T00:00:00",
    }, headers=headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN

# 15. Organizer Accessing Organizer API
def test_organizer_accessing_organizer_api(client, user_tokens):
    headers = user_tokens["organizer"]
    res = client.post("/api/v1/hackathons", json={
        "title": "Authorized Organizer Hackathon",
        "tagline": "Should Succeed",
        "description": "Valid Organizer creation test",
        "registration_start": "2026-10-01T00:00:00",
        "registration_deadline": "2026-10-05T00:00:00",
        "submission_deadline": "2026-10-10T00:00:00",
        "judging_deadline": "2026-10-15T00:00:00",
    }, headers=headers)
    assert res.status_code == status.HTTP_201_CREATED
    assert res.json()["title"] == "Authorized Organizer Hackathon"
