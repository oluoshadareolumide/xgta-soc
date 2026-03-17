# BATCH 2 — Full React UI

## What's new in Batch 2

### Frontend Pages (all wired to live API)
| Page | File | Description |
|---|---|---|
| Overview | `OverviewPage.tsx` | KPI cards, live alert feed, model perf, active actors |
| Alerts | `AlertsPage.tsx` | Full CRUD table, filters, status updates, AI analysis panel |
| Threat Graph | `GraphPage.tsx` | Interactive SVG knowledge graph — click nodes to explore |
| Threat Actors | `ActorsPage.tsx` | List + Create modal, confidence bars, TTP tags |
| IOC Library | `IOCPage.tsx` | Search, type filter, Add IOC modal, hits heatmap |
| Playbooks | `PlaybooksPage.tsx` | Execution engine UI, progress bars, step-by-step panel |

### Components
- `AppShell.tsx` — Sticky header, nav tabs, live UTC clock, alert stat counters, user menu
- `components/ui/index.tsx` — Shared primitives: Badge, StatusPill, ConfBar, Spinner, Card, ActionButton, etc.

### Features added
- React Query for all data fetching with 15-30s auto-refresh
- Zustand auth store with token persistence
- Axios interceptor — auto-attaches JWT, redirects to /login on 401
- Paginated alert list with status + severity filters
- Alert detail panel with AI analysis (Claude API) + saves result to backend
- Create/update modals for threat actors and IOCs
- IOC value search with deduplication feedback
- Playbook execution simulator with animated progress (full engine in Batch 3)

## Batch Roadmap
| Batch | Status |
|---|---|
| **Batch 1** — Scaffold, Auth, CRUD APIs | ✅ Done |
| **Batch 2** — Full React UI wired to API | ✅ Done |
| **Batch 3** — Playbooks engine, WebSocket live alerts | 🔜 Next |
| **Batch 4** — GNN threat graph, XAI explainability | 🔜 |
| **Batch 5** — Docker, CI/CD, deployment | 🔜 |
