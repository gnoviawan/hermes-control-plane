# Hermes Control Plane

QwenPaw-inspired dashboard and control plane for Hermes Agent.

## Architecture

- **web/** — React 19 + TypeScript + Ant Design + Zustand dashboard frontend
- **api/** — FastAPI + Uvicorn adapter backend (no Hermes source modifications)
- **deploy/** — Dokploy deployment assets

The backend wraps the Hermes CLI and reads from `HERMES_HOME` to provide
REST endpoints for status, profiles, sessions, skills, cron, logs, and config.
It does **not** modify Hermes source code.

## Dashboard API contract foundation

The control-plane backend now exposes an initial stable dashboard adapter surface:

- `GET /api/system/health`
- `GET /api/system/version`
- `GET /api/agents`
- `GET /api/agents/{agentId}`

These routes are the first step toward the architecture-spec split between
agent-scoped and system-scoped resources. Legacy Phase 1 routes such as
`/api/health` and `/api/profiles` remain available for compatibility while the
frontend migrates incrementally.

## Development

### Frontend

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build     # production build
```

### Backend

```bash
cd api
pip install -e .
uvicorn app.main:app --reload --port 8788
```

## Deployment

Deployed via Dokploy as a separate compose stack with:
- `dashboard` service (this app, port 8080)
- `hermes-sidecar` service (Hermes agent, isolated named volume)

See `deploy/` for compose templates.

The standalone stack keeps its own Compose-managed `hermes_data` volume while the
dashboard image bundles a Hermes-compatible runtime internally.
