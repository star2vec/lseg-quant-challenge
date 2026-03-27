import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    ollama_host: str       = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    default_model: str     = os.getenv("DEFAULT_MODEL", "qwen2.5-coder:7b")
    data_dir: str          = os.getenv("DATA_DIR", "./data")
    ask_questions: bool    = os.getenv("ASK_QUESTIONS", "false").lower() == "true"
    available_models: list = field(default_factory=lambda: [
        "qwen2.5-coder:7b",
        "llama3.1:latest",
        "llama3.2:latest",
    ])


settings = Settings()
