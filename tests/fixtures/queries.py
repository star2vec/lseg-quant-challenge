"""
The 4 acceptance test queries for Phase 1.
All must produce valid GraphData JSON before moving to Phase 2.
"""

LEVEL_1 = (
    "L1 – Hello World",
    "A User submits a login request to the Authentication Gateway. "
    "The Gateway then connects to the User Database.",
)

LEVEL_2 = (
    "L2 – Color & Styling",
    "Create a pipeline where a Raw CSV feeds into a Data Cleaner, "
    "which then sends output to a Postgres Database. "
    "Make the Raw CSV blue and the Postgres Database green.",
)

LEVEL_3 = (
    "L3 – Branching Logic",
    "A Customer initiates a wire transfer which goes to a Fraud Detection module. "
    "From the Fraud Detection module, approved transactions go to the Clearing House, "
    "and denied transactions go to a Blocked Queue. Make the Blocked Queue red.",
)

LEVEL_4 = (
    "L4 – Boss Fight",
    "I want an orchestrator tool that receives a user query append history applies azure "
    "guardrails and then decides to which component to use from a sentiment; summarizations; "
    "or drawing tools. I want the tools to be in red and the classificator in green.",
)

ALL_QUERIES = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4]
