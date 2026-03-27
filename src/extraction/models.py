from typing import Literal, Any
from pydantic import BaseModel, field_validator


VALID_TYPES = {"tool", "classifier", "database", "user", "component", "queue", "service"}
VALID_SHAPES = {"rectangle", "ellipse", "cylinder", "diamond"}
VALID_STYLES = {"solid", "dashed"}


class Node(BaseModel):
    id: str
    label: str
    type: str = "component"
    color: str = "#34495E"
    shape: str = "rectangle"
    description: str = ""

    @field_validator("type")
    @classmethod
    def coerce_type(cls, v: Any) -> str:
        return v if v in VALID_TYPES else "component"

    @field_validator("shape")
    @classmethod
    def coerce_shape(cls, v: Any) -> str:
        return v if v in VALID_SHAPES else "rectangle"


class Edge(BaseModel):
    source: str
    target: str
    label: str = ""
    style: str = "solid"
    color: str = "#95A5A6"

    @field_validator("style")
    @classmethod
    def coerce_style(cls, v: Any) -> str:
        return v if v in VALID_STYLES else "solid"


class GraphData(BaseModel):
    nodes: list[Node]
    edges: list[Edge]
