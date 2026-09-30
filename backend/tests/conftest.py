import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Force SQLite in-memory for testing
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import app.models
from app.database import Base, get_db
from app.main import app
from app.services.auth import get_password_hash, create_access_token
from app.models.user import User, UserRole

# Use single in-memory connection
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def init_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def seed_users(db):
    users = {
        "admin": User(
            email="admin_test@hackathon.local",
            username="admin_test",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Admin Test",
            role=UserRole.ADMIN,
            is_active=True
        ),
        "organizer": User(
            email="organizer_test@hackathon.local",
            username="organizer_test",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Organizer Test",
            role=UserRole.ORGANIZER,
            is_active=True
        ),
        "judge1": User(
            email="judge1_test@hackathon.local",
            username="judge1_test",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Judge 1 Test",
            role=UserRole.JUDGE,
            is_active=True
        ),
        "judge2": User(
            email="judge2_test@hackathon.local",
            username="judge2_test",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Judge 2 Test",
            role=UserRole.JUDGE,
            is_active=True
        ),
        "participant1": User(
            email="participant1_test@hackathon.local",
            username="part1_test",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Participant 1 Test",
            role=UserRole.PARTICIPANT,
            is_active=True
        ),
        "participant2": User(
            email="participant2_test@hackathon.local",
            username="part2_test",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Participant 2 Test",
            role=UserRole.PARTICIPANT,
            is_active=True
        ),
    }
    for u in users.values():
        db.add(u)
    db.commit()
    for u in users.values():
        db.refresh(u)
    return users

@pytest.fixture
def user_tokens(seed_users):
    tokens = {}
    for key, user in seed_users.items():
        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})
        tokens[key] = {"Authorization": f"Bearer {token}"}
    return tokens
