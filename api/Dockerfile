FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install D2 (diagram renderer) — required for format=svg on /api/azure
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://d2lang.com/install.sh | sh -s -- --tala=false && \
    apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (separate layer for caching)
COPY api/pyproject.toml api/uv.lock api/
RUN cd api && uv sync --frozen --no-dev

# Copy application code
COPY api/main.py api/
COPY api/icons/ api/icons/

# Copy skill scripts and templates referenced by the API
COPY skills/ipcalc-for-cloud/scripts/ skills/ipcalc-for-cloud/scripts/
COPY skills/ipcalc-for-cloud/templates/ skills/ipcalc-for-cloud/templates/

EXPOSE 8000

CMD ["/app/api/.venv/bin/uvicorn", "main:app", "--app-dir", "/app/api", "--host", "0.0.0.0", "--port", "8000"]
