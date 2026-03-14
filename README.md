# XGTA-SOC — Explainable Graph Threat Attribution SOC Platform

A full-stack cybersecurity SOC automation platform with GNN-based threat attribution, explainable AI, and real-time alert management.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python FastAPI |
| Database | SQL Server (via pyodbc / SQLAlchemy) |
| ORM | SQLAlchemy 2.0 + Alembic migrations |
| Auth | JWT (python-jose) + bcrypt |
| Frontend | React 18 + TypeScript + Vite |
| State | Zustand |
| Styling | Tailwind CSS |
| API Client | Axios + React Query |

## Git Batch Plan

| Batch | Contents |
|---|---|
| **Batch 1** (this) | Project scaffold, Auth, Alerts API, Threat Actors API, IOC Library API |
| **Batch 2** | Frontend React app wired to API, auth flow, dashboard |
| **Batch 3** | Playbooks engine, WebSocket live alerts |
| **Batch 4** | GNN threat graph, XAI explainability module |
| **Batch 5** | Docker, CI/CD, deployment config |

## Project Structure

```
xgta-soc/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Config, security, dependencies
│   │   ├── db/           # Database engine + session
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── services/     # Business logic
│   ├── alembic/          # DB migrations
│   ├── requirements.txt
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route-level pages
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API client functions
│   │   ├── store/        # Zustand state stores
│   │   └── types/        # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Edit with your SQL Server connection string
alembic upgrade head
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### API Docs
Once running: http://localhost:8000/docs
