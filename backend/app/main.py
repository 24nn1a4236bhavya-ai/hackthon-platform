import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, SessionLocal, get_db
from app.models.user import User
from app.routers import auth, users, hackathons, teams, projects, rubrics, judging, votes, exports, admin
from app.seed import seed_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hackathon_platform")

def apply_schema_migrations(engine):
    """Safely adds missing columns to existing SQLite tables without losing data."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        
        needed_columns = {
            "users": [
                ("institution", "VARCHAR(255)"),
                ("organization", "VARCHAR(255)"),
                ("skills", "TEXT"),
                ("phone", "VARCHAR(50)"),
            ],
            "hackathons": [
                ("rules", "TEXT"),
                ("contact_email", "VARCHAR(255)"),
                ("website_url", "VARCHAR(500)"),
                ("event_start", "DATETIME"),
                ("event_end", "DATETIME"),
                ("result_publication_date", "DATETIME"),
                ("required_fields", "VARCHAR(500) DEFAULT ''"),
            ],
            "hackathon_tracks": [
                ("is_active", "BOOLEAN DEFAULT 1"),
            ],
            "projects": [
                ("video_url", "VARCHAR(500)"),
                ("presentation_url", "VARCHAR(500)"),
                ("additional_info", "TEXT"),
            ],
            "teams": [
                ("description", "TEXT"),
            ],
        }

        with engine.begin() as conn:
            for table_name, cols in needed_columns.items():
                if inspector.has_table(table_name):
                    existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
                    for col_name, col_type in cols:
                        if col_name not in existing_cols:
                            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
    except Exception as e:
        logger.warning(f"Schema migration warning: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database schemas...")
    Base.metadata.create_all(bind=engine)
    apply_schema_migrations(engine)
    
    # Auto-seed demo data idempotently
    logger.info("Verifying and seeding demo data...")
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    yield
    logger.info("Shutting down application...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade, offline-first open-source hackathon management and judging platform.",
    lifespan=lifespan
)

# CORS - Allow local frontend origins cleanly with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1",
        "http://127.0.0.1:80",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers under /api/v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(hackathons.router, prefix=settings.API_V1_STR)
app.include_router(teams.router, prefix=settings.API_V1_STR)
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(rubrics.router, prefix=settings.API_V1_STR)
app.include_router(judging.router, prefix=settings.API_V1_STR)
app.include_router(votes.router, prefix=settings.API_V1_STR)
app.include_router(exports.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

# Also expose auth and health on unversioned /api prefix for compatibility
app.include_router(auth.router, prefix="/api")

@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        user_count = db.query(User).count()
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        user_count = 0
        db_status = "disconnected"

    return {
        "status": "ok",
        "database": db_status,
        "user_count": user_count,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "name": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }
