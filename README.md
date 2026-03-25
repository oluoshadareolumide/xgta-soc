# BATCH 3 — WebSocket Live Events + Playbook Execution Engine

## What's new in Batch 3

### Backend

| File | Description |
|---|---|
| `app/core/websocket_manager.py` | ConnectionManager — tracks all WS clients, broadcasts events, handles disconnects |
| `app/core/event_bus.py` | Async event bus — decouples producers from WS layer. `event_bus.publish(type, data)` from any service |
| `app/services/playbook_engine.py` | Full async playbook runner — executes steps sequentially, pauses on manual steps, emits progress events |
| `app/services/playbook_service.py` | DB CRUD for playbooks + seeds 4 default playbooks on first startup |
| `app/services/alert_simulator.py` | Generates realistic security alerts at random intervals (dev/demo mode) |
| `app/api/websocket.py` | `/ws?token=<jwt>` endpoint — bridges event bus → all connected clients |
| `app/api/playbooks.py` | REST API: list, execute, resume (manual step), cancel, reset |
| `main.py` | Updated startup: event bus + stats broadcaster + alert simulator background tasks |

### WebSocket Event Types
| Event | Trigger |
|---|---|
| `connection.established` | Client connects |
| `alert.created` | New alert added (API or simulator) |
| `alert.updated` | Alert status/fields changed |
| `alert.critical` | Critical severity alert (extra notification) |
| `playbook.started` | Playbook execution begins |
| `playbook.step` | Step status update (running / completed / awaiting_manual) |
| `playbook.completed` | All steps done |
| `playbook.failed` | Execution error or cancelled |
| `system.stats` | Alert counts broadcast every 10s |

### Frontend

| File | Description |
|---|---|
| `hooks/useWebSocket.ts` | WS hook with auto-reconnect (exponential backoff, max 10 attempts) |
| `components/LiveAlertFeed.tsx` | Toast notifications for live alerts + WSStatusBadge (LIVE/CONNECTING/OFFLINE) |
| `pages/PlaybooksPage.tsx` | Full rewrite — real API calls, live WS step progress, approve/cancel/reset |

### Playbook Execution Flow
```
POST /api/v1/playbooks/{id}/execute
  → PlaybookRegistry.execute()
    → PlaybookRunner.run() [background asyncio.Task]
      → for each step:
          if auto: asyncio.sleep(step.duration)
          if manual: asyncio.Event.wait() → paused until POST /resume
          → event_bus.publish(playbook.step, {...})
            → WebSocket broadcast to all clients
              → Frontend updates step state in real-time
```

## Batch Roadmap
| Batch | Status |
|---|---|
| **Batch 1** — Scaffold, Auth, CRUD APIs | ✅ Done |
| **Batch 2** — Full React UI wired to API | ✅ Done |
| **Batch 3** — WebSocket + Playbook Engine | ✅ Done |
| **Batch 4** — GNN threat graph, XAI module | 🔜 Next |
| **Batch 5** — Docker, CI/CD, deployment | 🔜 |
