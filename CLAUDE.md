# CLAUDE.md – Finance Assistant / Workflow Diagram Builder

## What this project is
Local web app: user types a natural language query describing an AI system or pipeline,
a local LLM (Ollama) extracts nodes + edges + visual attributes into GraphData JSON,
and the app renders an interactive, moveable diagram (neo4j-style) on the right side.
Chat on the left accumulates history; follow-up messages update the same diagram.

Full plan: see PLAN.md

---

## How to run

```bash
# Install deps
uv sync

# Run tests (Phase 1 gate — must pass before building UI)
uv run python -m tests.test_extraction

# Start app
uv run streamlit run main.py
```

## Docker
```bash
# App connects to host-native Ollama via host.docker.internal
docker compose up --build
```

---

## Model & config
Edit `.env` to change model or Ollama host. Default: `llama3.2:latest`.
`.env` is gitignored — copy `.env.example` to get started.

---

## Current build phase

**Phase 1 – Brain (ACTIVE)**
`src/extraction/` — LLM extraction from query → GraphData JSON
- `models.py` — Pydantic: Node, Edge, GraphData ✓
- `prompts.py` — system prompt with node type/color schema ✓
- `brain.py` — `extract_graph()` calling Ollama ✓
- `tests/test_extraction.py` — 4-level acceptance gate ✓

**Phase 2 – Renderer (not started)**
`components/graph_viewer.py` — Cytoscape.js HTML

**Phase 3 – Graph Merge (not started)**
`src/graph/operations.py` — merge_graphs(), update_node()

**Phase 4 – Conversation History (not started)**
`src/conversation/history.py`

**Phase 5 – Streamlit UI (not started)**
`main.py` — two-column layout, chat + diagram

---

## Key architecture decisions
- No `requirements.txt` — uv uses `pyproject.toml` + `uv.lock` directly
- Cytoscape.js loaded from CDN inside `st.components.v1.html()` — no extra Python package
- Ollama runs natively on host (Intel i7 Mac — no GPU in Docker container)
- `format="json"` in Ollama call constrains token sampling to valid JSON
- `qwen2.5-coder:7b` is best for JSON quality; `llama3.2:latest` is fastest on CPU

---

## Node type → default color + shape
| type       | color   | shape     |
|------------|---------|-----------|
| tool       | #C0392B | rectangle |
| classifier | #27AE60 | rectangle |
| database   | #2980B9 | cylinder  |
| user       | #8E44AD | ellipse   |
| component  | #34495E | rectangle |
| queue      | #E67E22 | rectangle |
| service    | #16A085 | rectangle |
