# Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Final runtime: use Hermes image directly so its bundled CLI + venv remain valid
FROM nousresearch/hermes-agent:v2026.4.13
WORKDIR /app

# Create an isolated API runtime so we don't mutate Hermes' own virtualenv
RUN /opt/hermes/.venv/bin/python -m venv /app/venv

# Install backend dependencies into the API runtime
COPY api/app ./app
RUN /app/venv/bin/pip install --no-cache-dir fastapi 'uvicorn[standard]' pydantic PyYAML

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