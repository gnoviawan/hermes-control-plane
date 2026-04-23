# Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Build a portable app venv separately so we don't mutate Hermes' bundled runtime.
FROM python:3.13-slim AS api-deps
WORKDIR /build
RUN python -m venv --copies /opt/app-venv
RUN /opt/app-venv/bin/pip install --no-cache-dir fastapi uvicorn pydantic PyYAML

# Final runtime: use Hermes image directly so its bundled CLI + venv remain valid.
FROM nousresearch/hermes-agent:v2026.4.13
WORKDIR /app

# Copy isolated API runtime and app source
COPY --from=api-deps /opt/app-venv /app/venv
COPY api/app ./app

# Copy frontend build
COPY --from=frontend /app/web/dist /app/static

# The base image defines ENTRYPOINT ["hermes"]. Clear it so the dashboard
# container starts uvicorn directly instead of treating it as a Hermes subcommand.
ENTRYPOINT []

EXPOSE 8080
ENV DASHBOARD_PORT=8080
ENV STATIC_DIR=/app/static
ENV HERMES_HOME=/opt/data
ENV HERMES_BIN=/opt/hermes/.venv/bin/hermes
ENV HERMES_ROOT=/opt/hermes

CMD ["/app/venv/bin/python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]