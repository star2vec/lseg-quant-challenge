from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os, sys, json
import ollama as ollama_lib

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.extraction.brain import extract_graph
from src.extraction.models import GraphData, Edge as GraphEdge
from src.extraction.prompts import SYSTEM_PROMPT


def fix_isolated_nodes(graph: GraphData) -> GraphData:
    """Auto-connect any node that has no edges into the logical flow."""
    connected = {e.source for e in graph.edges} | {e.target for e in graph.edges}
    isolated = [n for n in graph.nodes if n.id not in connected]
    if not isolated:
        return graph
    extra: list[GraphEdge] = []
    # Chain isolated nodes together in list order
    for i in range(len(isolated) - 1):
        extra.append(GraphEdge(source=isolated[i].id, target=isolated[i + 1].id, label="flows to"))
    # Connect the last isolated node to the connected node with no incoming edges (the entry point)
    connected_nodes = [n for n in graph.nodes if n.id in connected]
    if connected_nodes:
        targets = {e.target for e in graph.edges}
        entry = next((n for n in connected_nodes if n.id not in targets), connected_nodes[0])
        extra.append(GraphEdge(source=isolated[-1].id, target=entry.id, label="flows to"))
    return GraphData(nodes=graph.nodes, edges=graph.edges + extra)

app = FastAPI(title="Finance Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExtractRequest(BaseModel):
    query: str
    model: str = os.getenv("DEFAULT_MODEL", "llama3.2:latest")


@app.post("/api/extract", response_model=GraphData)
async def extract(req: ExtractRequest):
    try:
        graph = fix_isolated_nodes(extract_graph(req.query, model=req.model))
        return graph
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/extract/stream")
async def extract_stream(req: ExtractRequest):
    async def gen():
        try:
            yield f"data: {json.dumps({'type':'log','msg':'⚡ Connecting to LLM...','color':'teal'})}\n\n"
            client = ollama_lib.AsyncClient()
            full = ""
            count = 0
            yield f"data: {json.dumps({'type':'log','msg':f'🧠 Generating with {req.model}...','color':'blue'})}\n\n"
            async for chunk in await client.chat(
                model=req.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": req.query},
                ],
                format="json",
                stream=True,
            ):
                full += chunk["message"]["content"]
                count += 1
                if count % 20 == 0:
                    yield f"data: {json.dumps({'type':'progress','msg':f'Tokens: {count}','color':'slate'})}\n\n"
            yield f"data: {json.dumps({'type':'log','msg':'✓ Parsing schema...','color':'yellow'})}\n\n"
            graph = fix_isolated_nodes(GraphData.model_validate_json(full))
            connected = {e.source for e in graph.edges} | {e.target for e in graph.edges}
            still_isolated = [n.label for n in graph.nodes if n.id not in connected]
            if still_isolated:
                isolated_str = ", ".join(still_isolated)
                yield f"data: {json.dumps({'type':'log','msg':f'⚠ Still isolated: {isolated_str}','color':'yellow'})}\n\n"
            yield f"data: {json.dumps({'type':'done','msg':f'✓ {len(graph.nodes)} nodes, {len(graph.edges)} edges','color':'green','graph':graph.model_dump()})}\n\n"
        except Exception as e:
            short = str(e).splitlines()[0][:120]
            yield f"data: {json.dumps({'type':'error','msg':f'✗ Schema parse failed — {short}','color':'red'})}\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
