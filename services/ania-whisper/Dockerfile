FROM python:3.11-slim@sha256:a630a63cdb314e2d138a2fca3e375e319e8568346ffafac5b980f888630ac4f1

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HUB_DISABLE_TELEMETRY=1 \
    WHISPER_MODEL_PATH=/models/whisper-small.en

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='Systran/faster-whisper-small.en', revision='d1d751a5f8271d482d14ca55d9e2deeebbae577f', local_dir='/models/whisper-small.en')"
COPY main.py decoding.py ./

USER 65532:65532
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--no-server-header"]
