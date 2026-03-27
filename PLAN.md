# Finance Assistant – AI Workflow Diagram Builder

## Context

Build a local-first web app where a user types a 3–5 line natural language query describing an AI system or workflow. A local LLM (via Ollama) acts as the "brain": it extracts entities, relationships, and visual attributes (colors, shapes) from the text, outputs structured JSON, and the app renders an interactive, moveable knowledge-graph-style diagram (neo4j/falkordb aesthetic). The chat accumulates history so follow-up messages refine the same diagram rather than resetting it.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| UI framework | **Streamlit** | Already in deps; quick layout |
| Graph visualization | **Cytoscape.js** (CDN, via `st.components.v1.html`) | Neo4j-like look, moveable nodes, no extra Python package |
| LLM | **qwen2.5-coder:7b** (default) / user-selectable | Best structured JSON output; user can switch in sidebar |
| LLM client | **ollama** Python SDK (already in deps) | — |
| Data models | **pydantic** (already in deps) | Typed graph structures |
| Persistence | JSON file (`data/history.json`) | Simple, local, no DB dependency |

---

## File Structure

```
lseg/
├── docker-compose.yml             ← app + (optional) ollama services
├── Dockerfile                     ← uv-based Python 3.13 image
├── .env.example                   ← committed template with all vars documented
├── .env                           ← NOT committed, actual values
├── pyproject.toml                 ← deps (uv), no requirements.txt needed
├── uv.lock                        ← pinned deps
├── PLAN.md                        ← this file
│
├── main.py                        ← Streamlit entry point (two-column layout)
│
├── src/
│   ├── __init__.py
│   ├── config.py                  ← reads .env → typed Settings object
│   ├── extraction/                ◄── PHASE 1 (build first)
│   │   ├── __init__.py
│   │   ├── models.py              ← Pydantic: Node, Edge, GraphData
│   │   ├── prompts.py             ← system prompt templates
│   │   └── brain.py               ← Ollama call + JSON parse + validation
│   ├── graph/                     ◄── PHASE 3 (merge/update logic)
│   │   └── operations.py          ← merge_graphs(), update_node() etc.
│   └── conversation/              ◄── PHASE 4
│       └── history.py             ← load/save history.json
│
├── components/
│   └── graph_viewer.py            ← returns Cytoscape.js HTML string (Phase 2)
│
├── data/
│   └── .gitkeep                   ← history.json written here at runtime
│
└── tests/
    ├── test_extraction.py         ← runs all 4 query levels, prints JSON
    └── fixtures/
        └── queries.py             ← the 4 test queries hardcoded
```

---

## Config & Environment Files

### `.env.example` (committed)
```env
# Ollama
OLLAMA_HOST=http://localhost:11434      # use http://host.docker.internal:11434 inside Docker
DEFAULT_MODEL=qwen2.5-coder:7b         # qwen2.5-coder:7b | llama3.1:latest | llama3.2:latest

# App
DATA_DIR=./data                        # where history.json is written
ASK_QUESTIONS=false                    # toggle clarifying questions mode
```

### `src/config.py`
```python
import os
from dataclasses import dataclass, field

@dataclass
class Settings:
    ollama_host: str        = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    default_model: str      = os.getenv("DEFAULT_MODEL", "qwen2.5-coder:7b")
    data_dir: str           = os.getenv("DATA_DIR", "./data")
    ask_questions: bool     = os.getenv("ASK_QUESTIONS", "false").lower() == "true"
    available_models: list  = field(default_factory=lambda: [
        "qwen2.5-coder:7b",
        "llama3.1:latest",
        "llama3.2:latest",
    ])

settings = Settings()   # imported as singleton everywhere
```

### `docker-compose.yml`
```yaml
services:
  app:
    build: .
    ports:
      - "8501:8501"
    volumes:
      - ./data:/app/data
    env_file: .env
    environment:
      - OLLAMA_HOST=http://host.docker.internal:11434  # reaches host-native Ollama
    restart: unless-stopped

  # Uncomment when running Ollama containerised (non-Intel or Linux host)
  # ollama:
  #   image: ollama/ollama
  #   ports:
  #     - "11434:11434"
  #   volumes:
  #     - ollama_data:/root/.ollama

# volumes:
#   ollama_data:
```

### `Dockerfile`
```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
EXPOSE 8501
CMD ["uv", "run", "streamlit", "run", "main.py", "--server.address=0.0.0.0", "--server.port=8501"]
```

> **Why no `requirements.txt`?** `uv` installs from `pyproject.toml` + `uv.lock` directly. `uv sync --frozen` = exact same versions as local env.

---

## Phase 1 – The Brain (Query → GraphData JSON)

### Goal
Single LLM call (Ollama) takes a natural language query and returns a validated `GraphData` JSON object containing nodes and edges. No UI yet. Gate: all 4 test queries pass.

### Test Queries (4 levels)

**L1 – Hello World**
> "A User submits a login request to the Authentication Gateway. The Gateway then connects to the User Database."
- Expected: 3 nodes, 2 edges, no color constraints

**L2 – Color & Styling**
> "Create a pipeline where a Raw CSV feeds into a Data Cleaner, which then sends output to a Postgres Database. Make the Raw CSV blue and the Postgres Database green."
- Expected: blue on CSV node only, green on DB only, Data Cleaner default

**L3 – Branching Logic**
> "A Customer initiates a wire transfer which goes to a Fraud Detection module. From the Fraud Detection module, approved transactions go to the Clearing House, and denied transactions go to a Blocked Queue. Make the Blocked Queue red."
- Expected: Fraud Detection has 2 outgoing edges, Blocked Queue = red

**L4 – Boss Fight**
> "I want an orchestrator tool that receives a user query append history applies azure guardrails and then decides to which component to use from a sentiment; summarizations; or drawing tools. I want the tools to be in red and the classificator in green"
- Expected: type-level color (all tools=red), classifier=green, complex branching

### Pydantic Schema (`src/extraction/models.py`)
```python
NodeType = Literal["tool","classifier","database","user","component","queue","service"]
NodeShape = Literal["rectangle","ellipse","cylinder","diamond"]
EdgeStyle = Literal["solid","dashed"]

class Node(BaseModel):
    id: str           # snake_case, unique
    label: str        # display name
    type: NodeType
    color: str        # hex e.g. "#C0392B"
    shape: NodeShape
    description: str  # one sentence

class Edge(BaseModel):
    source: str       # node id
    target: str       # node id
    label: str        # 2-4 words
    style: EdgeStyle
    color: str        # hex, default "#95A5A6"

class GraphData(BaseModel):
    nodes: list[Node]
    edges: list[Edge]
```

### System Prompt (`src/extraction/prompts.py`)
```
You are a graph extraction engine for system architecture diagrams.
Output ONLY valid JSON. No explanation, no markdown.

NODE TYPES AND DEFAULT COLORS:
- tool        → #C0392B  rectangle
- classifier  → #27AE60  rectangle
- database    → #2980B9  cylinder
- user        → #8E44AD  ellipse
- component   → #34495E  rectangle
- queue       → #E67E22  rectangle
- service     → #16A085  rectangle

RULES:
1. id = snake_case of label, unique
2. "color X" targeting a TYPE → apply to ALL nodes of that type
3. "color X" targeting a SPECIFIC node → only that node
4. Only create edges for relationships EXPLICITLY stated
5. Edge label = short verb phrase (2-4 words)
6. style = "dashed" for feedback/fetch flows only
7. Edge color = "#95A5A6" default
8. Output ONLY the JSON object
```

### Brain (`src/extraction/brain.py`)
```python
def extract_graph(query: str, model: str = "qwen2.5-coder:7b") -> GraphData:
    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": query}
        ],
        format="json"   # Ollama constrains token sampling to valid JSON
    )
    return GraphData.model_validate_json(response["message"]["content"])
```

---

## Phase 2 – Graph Renderer (JSON → Cytoscape.js diagram)

`components/graph_viewer.py` returns self-contained HTML string:
- Cytoscape.js from CDN
- dagre layout (hierarchical, top-down)
- Dark neo4j theme (`#1a1a2e` background)
- Nodes colored per `node.color`, shaped per `node.shape`
- Directed edges with curved arrows + labels
- Draggable nodes, scroll-to-zoom, fit-to-screen button
- Hover tooltip showing `node.description`

---

## Phase 3 – Graph Merge (Conversation Updates)

`src/graph/operations.py`:
- `merge_graphs(existing: GraphData, update: GraphData) -> GraphData`
- `update_node_color(graph: GraphData, node_id: str, color: str) -> GraphData`
- Follow-up queries pass existing graph JSON to LLM → LLM returns delta → merge

---

## Phase 4 – Conversation History

`src/conversation/history.py`:
- Persists to `data/history.json`
- Each entry: `{role, content, timestamp}`
- Passed as context to each LLM call (last 10 turns)

---

## Phase 5 – Streamlit UI

```
col_left (35%)          col_right (65%)
────────────────────    ────────────────────────────
Chat messages           Cytoscape.js diagram
Text input + Send       (dark theme, full height)
── Settings ──
[ ] Ask clarifying Qs
Model: [qwen2.5 ▼]
[Clear conversation]
```

---

## Build Order (strict)

```
1. src/extraction/models.py       ← no deps
2. src/extraction/prompts.py      ← no deps
3. src/extraction/brain.py        ← uses above + ollama
4. tests/ + fixtures/             ← validate all 4 levels ← GATE
5. components/graph_viewer.py     ← Phase 2
6. src/conversation/history.py    ← Phase 4
7. src/graph/operations.py        ← Phase 3
8. src/config.py                  ← settings singleton
9. main.py                        ← UI, last
10. Dockerfile + docker-compose   ← containerise
```

**Do not move past step 4 until all 4 test queries produce correct JSON.**
