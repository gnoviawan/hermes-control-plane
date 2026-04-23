# Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Build backend + serve
FROM python:3.13-slim
WORKDIR /app

# Install backend
COPY api/pyproject.toml ./pyproject.toml
COPY api/app ./app
RUN pip install --no-cache-dir -e .

# Copy frontend build
COPY --from=frontend /app/web/dist /app/static

# Runtime user matches host UID/GID
ARG WANTED_UID=10000
ARG WANTED_GID=10000
RUN groupadd -g $WANTED_GID appuser && useradd -u $WANTED_UID -g $WANTED_GID -m appuser
USER appuser

EXPOSE 8080
ENV DASHBOARD_PORT=8080
ENV STATIC_DIR=/app/static
ENV HERMES_HOME=/opt/data
ENV HERMES_BIN=/opt/hermes/.venv/bin/hermes

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
