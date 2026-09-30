from datetime import datetime, timedelta
import logging
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.hackathon import Hackathon, HackathonTrack, HackathonRegistration, HackathonStatus, RegistrationStatus
from app.models.team import Team, TeamMember, TeamRole
from app.models.project import Project, ProjectStatus
from app.models.rubric import Rubric, RubricCriterion
from app.models.judging import JudgeAssignment, AssignmentStatus, Evaluation, CriterionScore
from app.models.vote import CommunityVote
from app.services.auth import get_password_hash
from app.services.normalization import calculate_evaluation_raw_score

logger = logging.getLogger("hackathon_platform.seed")

DEMO_PASSWORD = "DemoPassword123!"

def upsert_user(
    db: Session,
    email: str,
    username: str,
    password: str,
    full_name: str,
    role: UserRole,
    bio: str
) -> User:
    email_clean = email.strip().lower()
    username_clean = username.strip().lower()
    user = db.query(User).filter(
        (func.lower(User.email) == email_clean) | (func.lower(User.username) == username_clean)
    ).first()

    if user:
        user.email = email_clean
        user.username = username_clean
        user.full_name = full_name
        user.role = role
        user.bio = bio
        user.hashed_password = get_password_hash(password)
        user.is_active = True
    else:
        user = User(
            email=email_clean,
            username=username_clean,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=role,
            bio=bio,
            is_active=True
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return user

def seed_database(db: Session = None):
    should_close = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        should_close = True

    logger.info("Executing idempotent seed routine...")

    # 1. Idempotently Seed/Update All Demo Users
    admin = upsert_user(
        db,
        email="admin@example.local",
        username="admin",
        password=DEMO_PASSWORD,
        full_name="Platform Administrator",
        role=UserRole.ADMIN,
        bio="Lead platform engineer and infrastructure administrator."
    )
    organizer = upsert_user(
        db,
        email="organizer@example.local",
        username="organizer",
        password=DEMO_PASSWORD,
        full_name="Sarah Jenkins",
        role=UserRole.ORGANIZER,
        bio="Global Hackathon Director and Open-Source Community Lead."
    )
    judge1 = upsert_user(
        db,
        email="judge1@example.local",
        username="judge1",
        password=DEMO_PASSWORD,
        full_name="Dr. Marcus Vance",
        role=UserRole.JUDGE,
        bio="AI Research Scientist and rigorous code auditor (critical evaluator)."
    )
    judge2 = upsert_user(
        db,
        email="judge2@example.local",
        username="judge2",
        password=DEMO_PASSWORD,
        full_name="Elena Rostova",
        role=UserRole.JUDGE,
        bio="Senior Product Architect and startup mentor (supportive evaluator)."
    )
    judge3 = upsert_user(
        db,
        email="judge3@example.local",
        username="judge3",
        password=DEMO_PASSWORD,
        full_name="Kenji Sato",
        role=UserRole.JUDGE,
        bio="Principal Systems Architect and Open Source Maintainer."
    )
    participant = upsert_user(
        db,
        email="participant@example.local",
        username="participant",
        password=DEMO_PASSWORD,
        full_name="Alex Rivera",
        role=UserRole.PARTICIPANT,
        bio="Full-stack AI developer and open-source contributor."
    )
    alice = upsert_user(
        db,
        email="alice@example.local",
        username="alice",
        password=DEMO_PASSWORD,
        full_name="Alice Chen",
        role=UserRole.PARTICIPANT,
        bio="Lead engineer at NeuralForge team."
    )
    bob = upsert_user(
        db,
        email="bob@example.local",
        username="bob",
        password=DEMO_PASSWORD,
        full_name="Bob Smith",
        role=UserRole.PARTICIPANT,
        bio="Backend distributed systems and database engineer."
    )
    charlie = upsert_user(
        db,
        email="charlie@example.local",
        username="charlie",
        password=DEMO_PASSWORD,
        full_name="Charlie Davis",
        role=UserRole.PARTICIPANT,
        bio="Rustacean, performance tuning & systems developer."
    )
    david = upsert_user(
        db,
        email="david@example.local",
        username="david",
        password=DEMO_PASSWORD,
        full_name="David Kim",
        role=UserRole.PARTICIPANT,
        bio="UI/UX designer and frontend animations specialist."
    )
    eve = upsert_user(
        db,
        email="eve@example.local",
        username="eve",
        password=DEMO_PASSWORD,
        full_name="Eve Torres",
        role=UserRole.PARTICIPANT,
        bio="Zero-knowledge cryptography and privacy researcher."
    )

    # 2. Check if Hackathon already exists
    hackathon = db.query(Hackathon).filter(Hackathon.slug == "global-ai-hackathon-2026").first()
    if hackathon:
        logger.info("Demo hackathon already exists. Ensuring registrations are complete...")
        # Ensure all participants are checked in
        for p in [participant, alice, bob, charlie, david, eve]:
            reg = db.query(HackathonRegistration).filter(
                HackathonRegistration.hackathon_id == hackathon.id,
                HackathonRegistration.user_id == p.id
            ).first()
            if not reg:
                db.add(HackathonRegistration(
                    hackathon_id=hackathon.id,
                    user_id=p.id,
                    status=RegistrationStatus.CHECKED_IN
                ))
        db.commit()
        if should_close:
            db.close()
        return

    logger.info("Creating demo hackathon, tracks, teams, rubrics, and evaluations...")

    now = datetime.utcnow()
    hackathon = Hackathon(
        title="Global AI & Open Source Hackathon 2026",
        slug="global-ai-hackathon-2026",
        tagline="Building the next generation of autonomous, private, and offline-first open-source technology.",
        description=(
            "### Welcome to the Global AI & Open Source Hackathon 2026!\n\n"
            "This flagship competition gathers developers from around the world to build "
            "production-grade tools that can run entirely locally without external proprietary cloud APIs.\n\n"
            "#### Competition Themes:\n"
            "* **Autonomous AI Systems**: Local model agents, tool-calling pipelines, offline inference.\n"
            "* **Developer Tooling & Infrastructure**: Lightning fast compilers, orchestrators, debuggers.\n"
            "* **Privacy & Social Good**: Zero-knowledge validation, cryptographic security, decentralized tools.\n\n"
            "#### Rules & Deadlines:\n"
            "* All code must be open-source under an OSI-approved license.\n"
            "* Teams can be 1 to 4 participants.\n"
            "* Solutions must include working code, README, and reproducible setup instructions."
        ),
        banner_url="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
        status=HackathonStatus.JUDGING,
        registration_start=now - timedelta(days=14),
        registration_deadline=now - timedelta(days=2),
        submission_deadline=now - timedelta(hours=12),
        judging_deadline=now + timedelta(days=2),
        created_by_id=organizer.id,
        is_community_voting_enabled=True,
        min_team_size=1,
        max_team_size=4
    )
    db.add(hackathon)
    db.commit()
    db.refresh(hackathon)

    # 3. Create Tracks
    track_ai = HackathonTrack(
        hackathon_id=hackathon.id,
        name="AI & Autonomous Systems",
        description="Autonomous multi-agent systems, local neural networks, and prompt synthesis engines."
    )
    track_tools = HackathonTrack(
        hackathon_id=hackathon.id,
        name="Developer Tooling & Infrastructure",
        description="High-throughput build tools, terminal utilities, and offline developer environments."
    )
    track_privacy = HackathonTrack(
        hackathon_id=hackathon.id,
        name="Privacy & Social Good",
        description="Privacy-preserving algorithms, data sovereignty solutions, and accessibility tools."
    )
    db.add_all([track_ai, track_tools, track_privacy])
    db.commit()
    db.refresh(track_ai)
    db.refresh(track_tools)
    db.refresh(track_privacy)

    # 4. Register Participants
    participants = [participant, alice, bob, charlie, david, eve]
    for p in participants:
        reg = HackathonRegistration(
            hackathon_id=hackathon.id,
            user_id=p.id,
            status=RegistrationStatus.CHECKED_IN
        )
        db.add(reg)
    db.commit()

    # 5. Create Rubric & Criteria
    rubric = Rubric(
        hackathon_id=hackathon.id,
        name="Comprehensive Innovation & Technical Rubric",
        description="Official 4-dimensional weighted scorecard for hackathon evaluation."
    )
    db.add(rubric)
    db.commit()
    db.refresh(rubric)

    crit_arch = RubricCriterion(
        rubric_id=rubric.id,
        title="Technical Execution & Architecture",
        description="Robustness of design, clean code quality, scalability, and zero-crash reliability.",
        max_points=10.0,
        weight=0.30
    )
    crit_innov = RubricCriterion(
        rubric_id=rubric.id,
        title="Innovation & Originality",
        description="Novelty of concept, creative approach to challenging problems, and unique value proposition.",
        max_points=10.0,
        weight=0.25
    )
    crit_ux = RubricCriterion(
        rubric_id=rubric.id,
        title="Design, Polish & UX",
        description="Intuitive user interface, visual aesthetics, error handling, and ease of use.",
        max_points=10.0,
        weight=0.20
    )
    crit_impact = RubricCriterion(
        rubric_id=rubric.id,
        title="Impact & Practical Utility",
        description="Real-world applicability, community need, and overall completeness of implementation.",
        max_points=10.0,
        weight=0.25
    )
    db.add_all([crit_arch, crit_innov, crit_ux, crit_impact])
    db.commit()
    for c in [crit_arch, crit_innov, crit_ux, crit_impact]:
        db.refresh(c)
    criteria_map = {c.id: c for c in [crit_arch, crit_innov, crit_ux, crit_impact]}

    # 6. Create Teams
    team1 = Team(
        hackathon_id=hackathon.id,
        name="NeuralForge Team",
        invite_code="NEURAL1",
        leader_id=alice.id
    )
    team2 = Team(
        hackathon_id=hackathon.id,
        name="HyperScale Systems",
        invite_code="HYPER22",
        leader_id=charlie.id
    )
    team3 = Team(
        hackathon_id=hackathon.id,
        name="PrivaShield Lab",
        invite_code="PRIVA33",
        leader_id=eve.id
    )
    db.add_all([team1, team2, team3])
    db.commit()
    for t in [team1, team2, team3]:
        db.refresh(t)

    # Team Members
    tm1 = TeamMember(team_id=team1.id, user_id=alice.id, role=TeamRole.LEADER)
    tm2 = TeamMember(team_id=team1.id, user_id=participant.id, role=TeamRole.MEMBER)
    tm3 = TeamMember(team_id=team1.id, user_id=bob.id, role=TeamRole.MEMBER)
    tm4 = TeamMember(team_id=team2.id, user_id=charlie.id, role=TeamRole.LEADER)
    tm5 = TeamMember(team_id=team2.id, user_id=david.id, role=TeamRole.MEMBER)
    tm6 = TeamMember(team_id=team3.id, user_id=eve.id, role=TeamRole.LEADER)
    db.add_all([tm1, tm2, tm3, tm4, tm5, tm6])
    db.commit()

    # 7. Create Submitted Projects
    project1 = Project(
        hackathon_id=hackathon.id,
        team_id=team1.id,
        track_id=track_ai.id,
        title="NeuralForge Agentic Studio",
        tagline="Autonomous multi-agent workflow generator for offline local clusters",
        description=(
            "### Overview\n"
            "NeuralForge Agentic Studio provides a self-contained visual IDE and execution runtime "
            "for orchestrating collaborative AI agent swarms entirely on localhost or private edge clusters.\n\n"
            "### Key Features\n"
            "- Zero external cloud API calls — operates with local GGUF / Ollama models.\n"
            "- Multi-agent graph pipeline with cyclical execution and deadlock detection.\n"
            "- Integrated real-time monitoring and token throughput telemetry.\n\n"
            "### Architecture\n"
            "Built with FastAPI, WebSockets, Python 3.11, and a reactive canvas UI in React + Tailwind."
        ),
        demo_url="http://localhost:3000/demo/neuralforge",
        repo_url="https://github.com/neuralforge/agentic-studio",
        video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        tech_stack="Python, FastAPI, React, TypeScript, WebSockets, TailwindCSS",
        cover_image_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        status=ProjectStatus.SUBMITTED,
        submitted_at=now - timedelta(hours=14)
    )

    project2 = Project(
        hackathon_id=hackathon.id,
        team_id=team2.id,
        track_id=track_tools.id,
        title="HyperScale CLI — Instant Build Engine",
        tagline="Sub-millisecond incremental build matrix compiler with local artifact deduplication",
        description=(
            "### The Problem\n"
            "Modern monorepos spend minutes running repetitive compilation tasks, sapping engineering flow.\n\n"
            "### HyperScale Solution\n"
            "HyperScale is a zero-latency CLI tool that computes content-addressed DAG trees of all dependencies "
            "and shares local CAS caches across branches instantaneously.\n\n"
            "### Benchmarks\n"
            "- 12x faster incremental builds compared to standard workflows.\n"
            "- 100% offline verification using SHA-256 binary checksums."
        ),
        demo_url="http://localhost:3000/demo/hyperscale",
        repo_url="https://github.com/hyperscale/cli",
        video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        tech_stack="Rust, WebAssembly, SQLite, Docker, Python",
        cover_image_url="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
        status=ProjectStatus.SUBMITTED,
        submitted_at=now - timedelta(hours=16)
    )

    project3 = Project(
        hackathon_id=hackathon.id,
        team_id=team3.id,
        track_id=track_privacy.id,
        title="PrivaShield Guard",
        tagline="Zero-knowledge telemetry anonymizer and local audit compliance scanner",
        description=(
            "### Mission\n"
            "PrivaShield protects user privacy by inspecting outbound data packets at runtime and "
            "synthesizing differentially private noise for statistical reporting without exposing PII.\n\n"
            "### Technical Highlights\n"
            "- Strict local differential privacy guarantees ($\epsilon = 0.5$).\n"
            "- Real-time PII pattern masking with zero latency overhead."
        ),
        demo_url="http://localhost:3000/demo/privashield",
        repo_url="https://github.com/privashield/guard",
        video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        tech_stack="TypeScript, Python, Cryptography, SQLite, React",
        cover_image_url="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
        status=ProjectStatus.SUBMITTED,
        submitted_at=now - timedelta(hours=18)
    )

    db.add_all([project1, project2, project3])
    db.commit()
    for p in [project1, project2, project3]:
        db.refresh(p)

    # 8. Assign Judges to Projects
    judges = [judge1, judge2, judge3]
    projects = [project1, project2, project3]
    assignments = []
    for j in judges:
        for p in projects:
            assign = JudgeAssignment(
                hackathon_id=hackathon.id,
                judge_id=j.id,
                project_id=p.id,
                status=AssignmentStatus.COMPLETED
            )
            assignments.append(assign)
    db.add_all(assignments)
    db.commit()

    # 9. Create Evaluations and Criterion Scores
    scoring_matrix = [
        (
            judge1, project1, [8.0, 7.5, 7.0, 7.5],
            "Impressive offline agent architecture. Execution is sound, though documentation could be tighter.",
            "High technical execution; minor rough edges on initial agent handshake."
        ),
        (
            judge1, project2, [7.5, 7.0, 6.5, 7.0],
            "Solid CLI tooling and clean Rust implementation. Solid benchmarks.",
            "Good engineering fundamentals; test coverage is strong."
        ),
        (
            judge1, project3, [6.5, 6.0, 6.5, 6.5],
            "Privacy model is interesting, but sample data set was small.",
            "Rigorous theoretical math, but user interface needs polish."
        ),
        # Judge 2 (Lenient)
        (
            judge2, project1, [10.0, 9.5, 9.0, 9.5],
            "Extraordinary project! The agent canvas is a delight to use and runs seamlessly.",
            "Clear contender for top overall project."
        ),
        (
            judge2, project2, [9.0, 8.5, 8.5, 9.0],
            "Very fast and clean CLI experience. Solves a very real developer problem.",
            "Strong developer focus."
        ),
        (
            judge2, project3, [8.5, 8.0, 8.0, 8.5],
            "Great focus on privacy and user data sovereignty.",
            "Commendable social good impact."
        ),
        # Judge 3 (Balanced)
        (
            judge3, project1, [9.0, 8.5, 8.0, 8.5],
            "Balanced, production-grade system with excellent modular design.",
            "Well structured repo and reproducible Docker configuration."
        ),
        (
            judge3, project2, [8.5, 8.0, 7.5, 8.0],
            "Solid engineering and clean architecture throughout.",
            "High practical value."
        ),
        (
            judge3, project3, [7.5, 7.0, 7.0, 7.5],
            "Good prototype for local privacy auditing.",
            "Promising prototype."
        ),
    ]

    for j, p, scores_list, pub_fb, priv_note in scoring_matrix:
        ev = Evaluation(
            hackathon_id=hackathon.id,
            project_id=p.id,
            judge_id=j.id,
            public_feedback=pub_fb,
            private_notes=priv_note,
            total_raw_score=0.0
        )
        db.add(ev)
        db.flush()

        cs_objs = []
        for crit, score_val in zip([crit_arch, crit_innov, crit_ux, crit_impact], scores_list):
            cs = CriterionScore(
                evaluation_id=ev.id,
                criterion_id=crit.id,
                score=score_val
            )
            cs_objs.append(cs)
            db.add(cs)

        ev.total_raw_score = calculate_evaluation_raw_score(cs_objs, criteria_map)

    db.commit()

    # 10. Create Community Votes
    v1 = CommunityVote(hackathon_id=hackathon.id, project_id=project1.id, user_id=charlie.id)
    v2 = CommunityVote(hackathon_id=hackathon.id, project_id=project1.id, user_id=david.id)
    v3 = CommunityVote(hackathon_id=hackathon.id, project_id=project1.id, user_id=eve.id)
    v4 = CommunityVote(hackathon_id=hackathon.id, project_id=project2.id, user_id=alice.id)
    v5 = CommunityVote(hackathon_id=hackathon.id, project_id=project2.id, user_id=bob.id)
    v6 = CommunityVote(hackathon_id=hackathon.id, project_id=project3.id, user_id=participant.id)
    db.add_all([v1, v2, v3, v4, v5, v6])
    db.commit()

    logger.info("Seed complete! All standard demo users and competition assets are active.")
    if should_close:
        db.close()

if __name__ == "__main__":
    seed_database()
