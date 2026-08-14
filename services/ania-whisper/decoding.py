from __future__ import annotations

from typing import Any

INFRAWATCH_PROMPT = (
    "InfraWatch agricultural infrastructure voice command. "
    "Common requests include: Show me projects in Aklan; show ongoing AMEFIP projects; "
    "summarize projects by status; list contractors, allocated budgets, bid amounts, "
    "locations, regions, provinces, municipalities, and delayed projects."
)


INFRAWATCH_HOTWORDS = (
    "InfraWatch ANIA Aklan AMEFIP ABEMIS BAFE contractors budgets "
    "allocated amount bid amount ongoing delayed completed projects"
)


def transcription_options(language: str) -> dict[str, Any]:
    return {
        "language": language,
        "beam_size": 5,
        "best_of": 5,
        "temperature": 0.0,
        "vad_filter": True,
        "condition_on_previous_text": False,
        "initial_prompt": INFRAWATCH_PROMPT,
        "hotwords": INFRAWATCH_HOTWORDS,
    }
