from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import time
from base64 import urlsafe_b64decode
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from openwakeword.model import Model

from connection import should_close_websocket
from events import detected_event
from model_factory import ConnectionModelFactory

TOKEN_SECRET = os.environ.get("WAKE_WORD_TOKEN_SECRET", "").encode()
MODEL_PATH = Path(os.environ.get("WAKE_WORD_MODEL_PATH", "models/hey_ania.onnx"))
SLEEP_MODEL_PATH = Path(
    os.environ.get("SLEEP_WORD_MODEL_PATH", "models/anh_ya_sleep.onnx")
)
SLEEP_MODEL_DATA_PATH = Path(f"{SLEEP_MODEL_PATH}.data")
MELSPECTROGRAM_MODEL_PATH = Path(
    os.environ.get("WAKE_WORD_MELSPECTROGRAM_MODEL_PATH", "models/melspectrogram.onnx")
)
EMBEDDING_MODEL_PATH = Path(
    os.environ.get("WAKE_WORD_EMBEDDING_MODEL_PATH", "models/embedding_model.onnx")
)
THRESHOLD = float(os.environ.get("WAKE_WORD_THRESHOLD", "0.5"))
FRAME_SAMPLES = 1280  # openWakeWord's native 80 ms frame at 16 kHz
MAX_CONNECTION_SECONDS = int(os.environ.get("WAKE_WORD_MAX_CONNECTION_SECONDS", "28800"))

app = FastAPI(title="ANIA openWakeWord service", docs_url=None, redoc_url=None)
model: Model | None = None
model_factory: ConnectionModelFactory | None = None


def create_model() -> Model:
    return Model(
        wakeword_models=[str(MODEL_PATH), str(SLEEP_MODEL_PATH)],
        inference_framework="onnx",
        melspec_model_path=str(MELSPECTROGRAM_MODEL_PATH),
        embedding_model_path=str(EMBEDDING_MODEL_PATH),
    )


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        body, signature = token.split(".", 1)
        expected = hmac.new(TOKEN_SECRET, body.encode(), hashlib.sha256).digest()
        received = urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(received, expected):
            return None
        payload = json.loads(urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        if not isinstance(payload.get("userId"), str):
            return None
        if int(payload.get("expiresAt", 0)) < int(time.time()):
            return None
        return payload
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


@app.on_event("startup")
def load_model() -> None:
    global model, model_factory
    if len(TOKEN_SECRET) < 24:
        raise RuntimeError("WAKE_WORD_TOKEN_SECRET must be at least 24 characters")
    required_models = (
        MODEL_PATH,
        SLEEP_MODEL_PATH,
        SLEEP_MODEL_DATA_PATH,
        MELSPECTROGRAM_MODEL_PATH,
        EMBEDDING_MODEL_PATH,
    )
    missing_models = [str(path) for path in required_models if not path.is_file()]
    if missing_models:
        raise RuntimeError(f"Wake-word model files not found: {', '.join(missing_models)}")
    model_factory = ConnectionModelFactory(create_model)
    model = model_factory.create()


@app.get("/healthz")
def healthz() -> dict[str, bool]:
    return {"ready": model is not None}


@app.websocket("/wake")
async def wake(websocket: WebSocket) -> None:
    protocols = [
        value.strip()
        for value in websocket.headers.get("sec-websocket-protocol", "").split(",")
    ]
    token = protocols[1] if len(protocols) == 2 and protocols[0] == "ania" else ""
    identity = decode_token(token)
    if identity is None or model_factory is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept(subprotocol="ania")
    connection_model = model_factory.create()
    started_at = time.monotonic()
    buffered = bytearray()
    try:
        while time.monotonic() - started_at < MAX_CONNECTION_SECONDS:
            chunk = await asyncio.wait_for(websocket.receive_bytes(), timeout=30)
            buffered.extend(chunk)
            frame_bytes = FRAME_SAMPLES * 2
            while len(buffered) >= frame_bytes:
                frame = bytes(buffered[:frame_bytes])
                del buffered[:frame_bytes]
                samples = np.frombuffer(frame, dtype=np.int16)
                scores = connection_model.predict(samples)
                event_type = detected_event(scores, THRESHOLD)
                if event_type:
                    await websocket.send_json({"type": event_type})
                    connection_model.reset()
    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    finally:
        if should_close_websocket(websocket.client_state.name):
            try:
                await websocket.close()
            except (RuntimeError, WebSocketDisconnect):
                pass
