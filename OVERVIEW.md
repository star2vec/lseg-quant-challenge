# Natural Language to Architecture Diagram — QuantChallenge 2026

An AI-powered web app that converts a plain-English system description into a fully interactive, production-quality architecture diagram — powered entirely by a local LLM (no cloud, no API keys).

---

## What it does

Type a description like:

> "An orchestrator receives user queries, applies Azure Guardrails, then routes to an Intent Classifier which dispatches to Sentiment, Summarisation, or Drawing tools. Results are formatted and returned to the user."

And get back an interactive, hierarchical, colour-coded diagram in seconds.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) · React Flow (`@xyflow/react`) · Tailwind CSS · JetBrains Mono |
| Layout engine | Dagre (hierarchical top-down auto-layout) |
| Backend | FastAPI · uvicorn · Server-Sent Events (SSE) |
| LLM | Ollama (local, CPU) — `qwen2.5-coder:7b` / `llama3.2:latest` |
| Data validation | Pydantic v2 with field-level coercers |
| Export | `html-to-image` → PNG download |

---

## Key Features

### Core
- **Natural language extraction** — any freeform description of an AI pipeline, microservice, or workflow is parsed into typed nodes and labelled edges
- **Schema-enforced output** — Pydantic v2 coercers guarantee valid node types, shapes and styles even when the LLM returns slightly malformed JSON (robustness to prompt noise and typos)
- **Dagre hierarchical layout** — nodes are auto-arranged top-to-bottom, rank-separated, with no manual positioning required

### Diagram accuracy (scoring alignment)
- **7 typed node categories** with enforced default colours and shapes:

| Type | Colour | Shape |
|---|---|---|
| tool | #C0392B red | rectangle |
| classifier | #27AE60 green | rectangle |
| database | #2980B9 blue | **3D cylinder** |
| user | #8E44AD purple | ellipse |
| component | #34495E slate | rectangle |
| queue | #E67E22 orange | rectangle |
| service | #16A085 teal | rectangle |

- **Cylinder shape for databases** — custom React Flow node renders a proper drum/cylinder with ellipse caps, matching standard architecture diagram conventions
- **Solid vs dashed edges** — solid lines = direct/synchronous flow; dashed lines = async, feedback loops, or inferred/implied connections
- **Logical deduction** — the extraction prompt infers standard implied nodes (user input, response output, data stores) that complete the architectural flow even when not explicitly named

### Innovative / bonus elements
- **Live streaming log panel** — SSE streams token-by-token progress from the LLM into a neon monospace log at the bottom of the sidebar (`◈ Live Log`). Shows: connecting → generating → token counts → parsing → done/error
- **Indeterminate progress bar** — glowing teal bar slides across the top of the sidebar during generation
- **Deep Dive mode** — one-click button appends a production-expansion prompt that instructs the LLM to add load balancers, Redis caching, monitoring tools, and security gateways to the base diagram
- **Neon cyber aesthetic** — powerline grid background (teal rectilinear lines + junction nodes), node-colour-matched glowing borders, drop-shadow edges, JetBrains Mono font throughout
- **Export PNG** — one-click high-res export of the current diagram
- **Iterative refinement** — multiple query cards let you issue follow-up prompts; each generates a fresh diagram from the updated description

---

## How to run

### Backend
```bash
cd lseg/
uv sync
uv run uvicorn api.main:app --reload --port 8000
```

### Frontend
```bash
cd lseg/frontend/
npm install
npm run dev
# open http://localhost:3000
```

### Model configuration
Edit `.env` (copy from `.env.example`):
```
DEFAULT_MODEL=qwen2.5-coder:7b   # best JSON accuracy
# DEFAULT_MODEL=llama3.2:latest  # 3x faster, occasional schema slippage
OLLAMA_HOST=http://localhost:11434
```

---

## Example queries

**Simple (2 nodes):**
> A user sends a message to a chatbot service.

**Moderate (branching):**
> An orchestrator receives queries and routes them through a guardrails filter. Blocked requests go to a rejection queue; valid ones reach an intent classifier that dispatches to sentiment analysis, summarisation, or drawing tools.

**Complex (full pipeline):**
> Build a production AI assistant: user queries enter an API gateway, pass through rate limiting and auth middleware, reach an orchestrator that checks a Redis cache and conversation history database, routes to specialised LLM tools, aggregates responses through a formatter, and returns structured output to the user. Include monitoring and logging services.
