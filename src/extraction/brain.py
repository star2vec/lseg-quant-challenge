import os
import ollama
from .models import GraphData
from .prompts import SYSTEM_PROMPT

_DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "qwen2.5-coder:7b")


def extract_graph(query: str, model: str | None = None) -> GraphData:
    model = model or _DEFAULT_MODEL
    """
    Send a natural language query to the local LLM and return a validated GraphData object.
    Uses Ollama's format="json" to constrain token sampling to valid JSON.
    """
    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": query},
        ],
        format="json",
    )
    raw_json = response["message"]["content"]
    return GraphData.model_validate_json(raw_json)
