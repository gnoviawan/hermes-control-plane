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

# Install backend into Hermes runtime environment
COPY api/pyproject.toml ./pyproject.toml
COPY api/app ./app
RUN /opt/hermes/.venv/bin/pip install --no-cache-dir -e .

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

CMD ["/opt/hermes/.venv/bin/python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]