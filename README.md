# OpenHack — Open-Source Hackathon Management & Judging Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://docker.com)
[![Offline First](https://img.shields.io/badge/Offline-100%25%20Local-10B981.svg)](#offline-guarantee)

> A complete, production-quality, self-hostable Hackathon Management and Judging Platform with statistical Z-score score normalization, weighted rubrics, and automated round-robin judge assignment. Designed to run completely locally without internet connectivity or external cloud dependencies.

---

## 1. Hackathon Lifecycle Walkthrough

```
Organizer creates Hackathon
  └─► Participants register & join event
        └─► Participants form Teams (via secure Invite Codes)
              └─► Teams submit Projects (with Markdown, Demo & Repo links)
                    └─► Round-Robin Automated Judge Assignment (with Conflict Avoidance)
                          └─► Judges evaluate using Configurable Weighted Rubrics
                                └─► Statistical Z-Score Normalization (eliminates judge bias)
                                      └─► Public Submissions Gallery & Community Upvoting
                                            └─► Results Leaderboard & 1-Click CSV/JSON Exports
```

---

## 2. Non-Negotiable Offline Guarantee

OpenHack is strictly engineered with **zero external cloud service dependencies**:
- ❌ No Firebase / Supabase
- ❌ No Auth0 / Clerk / external auth
- ❌ No hosted or proprietary cloud databases
- ❌ No external APIs or telemetry phoning home
- ✅ **100% self-contained local operation** (FastAPI + React + PostgreSQL / SQLite)

---

## 3. Quickstart with Docker Compose

To launch the complete application with PostgreSQL, backend REST API, and frontend web client pre-seeded with demo data:

```bash
docker compose up
```

Once the containers start, open your browser:
- **Web Application**: [http://localhost:3000](http://localhost:3000) or [http://localhost](http://localhost)
- **Interactive OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## 4. Pre-Seeded Demo Accounts

The database seeds automatically on first boot with complete demo personas and evaluations:

| Role | Username | Email | Password | Persona & Key Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin` | `admin@hackathon.local` | `Admin123!` | System metrics, user role elevation, override state |
| **ORGANIZER** | `organizer` | `organizer@hackathon.local` | `Organizer123!` | Sarah Jenkins — Manage rubrics, transitions, exports |
| **JUDGE (Harsh)** | `judge1` | `judge1@hackathon.local` | `Judge123!` | Dr. Marcus Vance — Rigorous critical scoring |
| **JUDGE (Lenient)** | `judge2` | `judge2@hackathon.local` | `Judge123!` | Elena Rostova — Supportive high scoring |
| **JUDGE (Balanced)** | `judge3` | `judge3@hackathon.local` | `Judge123!` | Kenji Sato — Standard deviation baseline |
| **PARTICIPANT** | `alice` | `alice@hackathon.local` | `Participant123!` | Alice Chen — Leader of *NeuralForge Team* |
| **PARTICIPANT** | `charlie` | `charlie@hackathon.local` | `Participant123!` | Charlie Davis — Leader of *HyperScale Systems* |
| **PARTICIPANT** | `eve` | `eve@hackathon.local` | `Participant123!` | Eve Torres — Leader of *PrivaShield Lab* |

> **Pro-Tip**: The web navbar includes an **"Instant Demo User Switcher"** allowing you to switch between Admin, Organizer, Judges, and Participants in 1 click!

---

## 5. Technology Stack

- **Frontend**:
  - React 18 with TypeScript
  - Vite bundler
  - Tailwind CSS with responsive layout
  - React Router v6
  - Axios with JWT request/response interceptors
  - Lucide React icon library
- **Backend**:
  - Python 3.11 with FastAPI
  - Pydantic v2 data validation
  - SQLAlchemy 2.0 ORM with PostgreSQL & SQLite support
  - Stateless JWT (HS256) + direct Bcrypt password hashing
  - Built-in Statistical Z-Score Normalization Engine
- **Infrastructure**:
  - Docker & Docker Compose
  - Nginx Alpine reverse proxy and SPA static server
  - PostgreSQL 16 Alpine database

---

## 6. Local Development Without Docker

### Backend:
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```

### Run Tests:
```bash
# In backend directory:
pytest -v tests
```

---

## 7. Statistical Judging & Score Normalization

OpenHack solves the harsh vs. lenient judge bias problem using **Z-Score Standardization**:
1. For each judge $j$, compute their sample mean $\mu_j$ and standard deviation $\sigma_j$.
2. For each raw rubric score $X_{j,p}$, calculate the standard score:
   $$Z_{j,p} = \frac{X_{j,p} - \mu_j}{\sigma_j}$$
3. Rescale $Z_{j,p}$ to global competition distribution $(\mu_G, \sigma_G)$:
   $$\text{Score}_{\text{norm}} = \text{Clamp}(\mu_G + Z_{j,p} \cdot \sigma_G, \ 0, \ 100)$$
4. Also supports **Olympic Trimmed Mean** (dropping outlier min & max scores).
5. Comprehensive documentation is available in [JUDGING.md](JUDGING.md).

---

## 8. REST API Endpoints Overview

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new participant or user | Public |
| `POST` | `/api/v1/auth/login` | Login and receive Bearer JWT | Public |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Authenticated |
| `GET` | `/api/v1/hackathons` | List hackathons with filters | Public |
| `POST` | `/api/v1/hackathons` | Create hackathon | Organizer/Admin |
| `PATCH` | `/api/v1/hackathons/{id}` | Update status & deadlines | Organizer/Admin |
| `POST` | `/api/v1/hackathons/{id}/register` | Register for hackathon | Authenticated |
| `POST` | `/api/v1/teams` | Create a team | Participant |
| `POST` | `/api/v1/teams/join` | Join team via invite code | Participant |
| `POST` | `/api/v1/projects` | Submit project draft | Team Member |
| `POST` | `/api/v1/projects/{id}/submit` | Finalize submission | Team Member |
| `POST` | `/api/v1/rubrics` | Define weighted criteria | Organizer/Admin |
| `POST` | `/api/v1/judging/auto-assign` | Automated round-robin judge assignment | Organizer/Admin |
| `POST` | `/api/v1/judging/evaluations` | Submit rubric scores & feedback | Judge/Admin |
| `GET` | `/api/v1/judging/leaderboard/{id}` | Fetch normalized rankings | Public / Organizer |
| `POST` | `/api/v1/votes` | Cast community upvote | Authenticated |
| `GET` | `/api/v1/exports/{id}/leaderboard.csv`| Export leaderboard in CSV | Organizer/Admin |
| `GET` | `/api/v1/admin/stats` | System metrics and user counts | Admin |

---

## 9. Architecture & Data Model Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): Multi-tier RBAC pipeline, state machine, and data flow.
- [DATA-MODEL.md](DATA-MODEL.md): Relational schemas, cascade policies, and foreign keys.
- [JUDGING.md](JUDGING.md): Normalization proofs, Olympic trimming, and load balancing algorithms.
- [acceptance-report.txt](acceptance-report.txt): Verification test suite execution report.

---

## 10. License

OpenHack is released under the OSI-approved [MIT License](LICENSE).
