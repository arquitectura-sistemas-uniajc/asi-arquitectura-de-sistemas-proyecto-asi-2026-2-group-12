import os
from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(title="AulaViva API")


@app.get("/health")
def health():
    return {"status": "ok", "instancia": os.getenv("HOSTNAME", "local")}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)