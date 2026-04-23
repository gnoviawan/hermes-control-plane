# Hermes Control Plane

QwenPaw-inspired dashboard and control plane for Hermes Agent.

## Architecture

- **web/** — React 19 + TypeScript + Ant Design + Zustand dashboard frontend
- **api/** — FastAPI + Uvicorn adapter backend (no Hermes source modifications)
- **deploy/** — Dokploy deployment assets

The backend wraps the Hermes CLI and reads from `HERMES_HOME` to provide
REST endpoints for status, profiles, sessions, skills, cron, logs, and config.
It does **not** modify Hermes source code.

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
- `hermes-sidecar` service (Hermes agent, shared bind mounts)

See `deploy/` for compose templates.

### Dokploy bind mounts

To inspect and control the existing Hermes runtime **without modifying the current live deployment**,
the standalone stack should mount the live Hermes paths from the same host:

- `HERMES_DATA_PATH=/opt/data`
- `HERMES_RUNTIME_PATH=/opt/hermes`
- `HERMES_BIN=/opt/hermes/.venv/bin/hermes`

This lets the dashboard wrap the real Hermes CLI/runtime and read the real `HERMES_HOME`
instead of booting against an empty named volume.
