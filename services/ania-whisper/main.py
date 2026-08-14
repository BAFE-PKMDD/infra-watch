from __future__ import annotations

import hmac
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from faster_whisper import WhisperModel

from decoding import transcription_options

MAX_AUDIO_BYTES = 25 * 1024 * 1024
ALLOWED_SUFFIXES = {".webm", ".wav", ".mp3", ".mp4", ".m4a", ".ogg"}
MODEL_PATH = os.environ.get("WHISPER_MODEL_PATH", "/models/whisper-small.en")
MODEL_LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "en").strip() or "en"
MODEL_TOKEN = os.environ.get("LOCAL_WHISPER_TOKEN", "").strip()
CPU_THREADS = max(1, int(os.environ.get("WHISPER_CPU_THREADS", "8")))

model: WhisperModel | None = None


def require_token(authorization: str | None) -> None:
    if len(MODEL_TOKEN) < 24:
        raise HTTPException(status_code=503, detail="Local Whisper is not configured.")
    expected = f"Bearer {MODEL_TOKEN}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Invalid local transcription token.")


@asynccontextmanager
async def lifespan(_: FastAPI):
    global model
    model = WhisperModel(
        MODEL_PATH,
        device="cpu",
        compute_type="int8",
        cpu_threads=CPU_THREADS,
        num_workers=1,
    )
    yield
    model = None


app = FastAPI(
    title="ANIA Local Whisper",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


@app.get("/healthz")
def healthz():
    return {"ready": model is not None, "engine": "faster-whisper", "local": True}


@app.post("/transcribe")
async def transcribe(
    audio: Annotated[UploadFile, File(...)],
    authorization: Annotated[str | None, Header()] = None,
):
    require_token(authorization)
    if model is None:
        raise HTTPException(status_code=503, detail="Local Whisper is not ready.")

    suffix = Path(audio.filename or "command.webm").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="Unsupported audio format.")

    temporary_path: str | None = None
    size = 0
    try:
        with tempfile.NamedTemporaryFile(prefix="ania-", suffix=suffix, delete=False) as temporary:
            temporary_path = temporary.name
            while chunk := await audio.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_AUDIO_BYTES:
                    raise HTTPException(status_code=413, detail="Recording exceeds 25 MB.")
                temporary.write(chunk)

        if size == 0:
            raise HTTPException(status_code=400, detail="Recording is empty.")

        segments, _ = model.transcribe(
            temporary_path,
            **transcription_options(MODEL_LANGUAGE),
        )
        text = " ".join(segment.text.strip() for segment in segments if segment.text.strip()).strip()
        return {"text": text}
    finally:
        await audio.close()
        if temporary_path:
            Path(temporary_path).unlink(missing_ok=True)
