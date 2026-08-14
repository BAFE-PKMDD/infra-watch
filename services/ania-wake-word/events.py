from __future__ import annotations

from collections.abc import Mapping

MODEL_EVENT_TYPES = {
    "hey_ania": "wake_detected",
    "anh_ya_sleep": "sleep_detected",
}


def detected_event(scores: Mapping[str, float], threshold: float) -> str | None:
    if not scores:
        return None
    model_name, score = max(scores.items(), key=lambda item: float(item[1]))
    if float(score) < threshold:
        return None
    return MODEL_EVENT_TYPES.get(model_name)
