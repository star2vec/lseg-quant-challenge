FROM python:3.13-slim
WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies from lockfile
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

EXPOSE 8501
CMD ["uv", "run", "streamlit", "run", "main.py", \
     "--server.address=0.0.0.0", \
     "--server.port=8501"]
