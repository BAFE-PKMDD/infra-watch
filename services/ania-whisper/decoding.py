from __future__ import annotations

from collections.abc import Iterable
from math import isfinite
from typing import Any, Protocol

INFRAWATCH_PROMPT = (
    "InfraWatch, ANIA, Aklan, AMEFIP, ABEMIS, BAFE, contractors, budgets, "
    "allocated amount, bid amount, ongoing, delayed, completed projects, "
    "regions, provinces, municipalities."
)


INFRAWATCH_HOTWORDS = (
    "InfraWatch ANIA Aklan AMEFIP ABEMIS BAFE contractors budgets "
    "allocated amount bid amount ongoing delayed completed projects"
)

MIN_SPEECH_SECONDS = 0.25
MAX_NO_SPEECH_PROBABILITY = 0.6
MIN_AVERAGE_LOG_PROBABILITY = -1.0
MAX_COMPRESSION_RATIO = 2.4


class TranscriptionSegment(Protocol):
    text: str
    start: float
    end: float
    no_speech_prob: float
    avg_logprob: float
    compression_ratio: float


def verified_transcript(
    segments: Iterable[TranscriptionSegment], duration_after_vad: float
) -> str:
    if not isfinite(duration_after_vad) or duration_after_vad < MIN_SPEECH_SECONDS:
        return ""

    parts = []
    for segment in segments:
        text = segment.text.strip()
        if not text:
            continue
        metrics = (
            segment.start, segment.end, segment.no_speech_prob,
            segment.avg_logprob, segment.compression_ratio,
        )
        # Whisper can emit text even when no_speech_prob is high. Fail the
        # whole command rather than submit a fragment with missing qualifiers.
        if (
            not all(isfinite(value) for value in metrics)
            or segment.end <= segment.start
            or segment.no_speech_prob > MAX_NO_SPEECH_PROBABILITY
            or segment.avg_logprob < MIN_AVERAGE_LOG_PROBABILITY
            or segment.compression_ratio > MAX_COMPRESSION_RATIO
        ):
            return ""
        parts.append(text)
    return " ".join(parts)


def transcription_options(language: str) -> dict[str, Any]:
    return {
        "language": language,
        "beam_size": 5,
        "best_of": 5,
        "temperature": 0.0,
        "vad_filter": True,
        "vad_parameters": {
            "threshold": 0.6,
            "min_speech_duration_ms": 250,
            "min_silence_duration_ms": 500,
            "speech_pad_ms": 150,
        },
        "no_speech_threshold": MAX_NO_SPEECH_PROBABILITY,
        "log_prob_threshold": MIN_AVERAGE_LOG_PROBABILITY,
        "compression_ratio_threshold": MAX_COMPRESSION_RATIO,
        "condition_on_previous_text": False,
        "initial_prompt": INFRAWATCH_PROMPT,
        "hotwords": INFRAWATCH_HOTWORDS,
    }
