"""
Phase 1 acceptance test. Run with:
    uv run python tests/test_extraction.py [model]

Defaults to qwen2.5-coder:7b. Pass a model name as first arg to override.
All 4 levels must pass before moving to Phase 2.
"""

import sys
from tests.fixtures.queries import ALL_QUERIES
from src.extraction.brain import extract_graph

model = sys.argv[1] if len(sys.argv) > 1 else "qwen2.5-coder:7b"
print(f"Model: {model}\n{'=' * 60}")

passed = 0
failed = 0

for name, query in ALL_QUERIES:
    print(f"\n{name}")
    print(f"Query: {query[:80]}...")
    try:
        graph = extract_graph(query, model=model)
        print(f"  PASS  {len(graph.nodes)} nodes, {len(graph.edges)} edges")
        for n in graph.nodes:
            print(f"    node  {n.id:<30} type={n.type:<12} color={n.color}  shape={n.shape}")
        for e in graph.edges:
            print(f"    edge  {e.source:<25} → {e.target:<25} [{e.label}] {e.style}")
        passed += 1
    except Exception as exc:
        print(f"  FAIL  {exc}")
        failed += 1

print(f"\n{'=' * 60}")
print(f"Results: {passed} passed, {failed} failed")
if failed:
    sys.exit(1)
