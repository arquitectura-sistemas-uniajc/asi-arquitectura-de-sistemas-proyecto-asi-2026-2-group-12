import os
import time
from contextlib import asynccontextmanager

import jwt
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from prometheus_client import (
    Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST,
)

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITMO = "HS256"
JWT_EXPIRA_SEG = 3600  # 1 hora, como dice el NFR

pool: ConnectionPool | None = None

PETICIONES = Counter("http_requests_total", "Peticiones", ["metodo", "ruta", "estado"])
LATENCIA = Histogram("http_request_duration_seconds", "Latencia", ["ruta"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = ConnectionPool(DATABASE_URL, min_size=2, max_size=10,
                          kwargs={"row_factory": dict_row}, open=True)
    yield
    pool.close()


app = FastAPI(title="AulaViva API", lifespan=lifespan)


@app.middleware("http")
async def medir(request: Request, call_next):
    inicio = time.perf_counter()
    respuesta = await call_next(request)
    ruta = request.scope.get("route").path if request.scope.get("route") else request.url.path
    LATENCIA.labels(ruta).observe(time.perf_counter() - inicio)
    PETICIONES.labels(request.method, ruta, respuesta.status_code).inc()
    return respuesta


# ---------- Autenticacion JWT ----------

def crear_token(usuario_id: int) -> str:
    ahora = int(time.time())
    return jwt.encode(
        {"sub": str(usuario_id), "iat": ahora, "exp": ahora + JWT_EXPIRA_SEG},
        JWT_SECRET, algorithm=JWT_ALGORITMO,
    )


def usuario_actual(authorization: str = Header(...)) -> int:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="falta token")
    try:
        datos = jwt.decode(authorization[7:], JWT_SECRET, algorithms=[JWT_ALGORITMO])
        return int(datos["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="token expirado")
    except Exception:
        raise HTTPException(status_code=401, detail="token invalido")


# ---------- Modelos ----------

class LoginIn(BaseModel):
    usuario_id: int


class RespuestaIn(BaseModel):
    id_respuesta: str
    pregunta: int
    respuesta: str


# ---------- Endpoints operativos ----------

@app.get("/health")
def health():
    # Liveness: solo dice que el proceso responde. La usa el ALB.
    return {"status": "ok", "instancia": os.getenv("HOSTNAME", "local")}


@app.get("/ready")
def ready():
    # Readiness: comprueba la base de datos. Útil para diagnóstico.
    try:
        with pool.connection() as conn:
            conn.execute("SELECT 1")
    except Exception:
        raise HTTPException(status_code=503, detail="bd no disponible")
    return {"status": "ok"}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/login")
def login(datos: LoginIn):
    # Simplificado: no valida contrasena (gestion de usuarios fuera de alcance).
    return {"access_token": crear_token(datos.usuario_id), "token_type": "bearer"}


# ---------- Endpoints de negocio ----------

@app.get("/cursos")
def cursos(usuario_id: int = Depends(usuario_actual)):
    with pool.connection() as conn:
        filas = conn.execute(
            """SELECT c.id, c.nombre FROM cursos c
               JOIN matriculas m ON m.curso_id = c.id
               WHERE m.usuario_id = %s ORDER BY c.id""",
            (usuario_id,),
        ).fetchall()
    return filas


@app.get("/cursos/{curso_id}/material")
def material(curso_id: int, usuario_id: int = Depends(usuario_actual)):
    with pool.connection() as conn:
        matriculado = conn.execute(
            "SELECT 1 FROM matriculas WHERE usuario_id=%s AND curso_id=%s",
            (usuario_id, curso_id),
        ).fetchone()
        if not matriculado:
            raise HTTPException(status_code=403, detail="no matriculado")
        return conn.execute(
            "SELECT id, nombre, clave_objeto, tamano_bytes FROM material WHERE curso_id=%s",
            (curso_id,),
        ).fetchall()


@app.get("/examenes/{examen_id}")
def examen(examen_id: int, usuario_id: int = Depends(usuario_actual)):
    with pool.connection() as conn:
        fila = conn.execute(
            """SELECT e.id, e.titulo, e.duracion_min FROM examenes e
               JOIN matriculas m ON m.curso_id = e.curso_id
               WHERE e.id = %s AND m.usuario_id = %s""",
            (examen_id, usuario_id),
        ).fetchone()
    if not fila:
        raise HTTPException(status_code=404, detail="examen no encontrado")
    return fila


@app.post("/examenes/{examen_id}/respuestas", status_code=201)
def guardar_respuesta(examen_id: int, cuerpo: RespuestaIn,
                      usuario_id: int = Depends(usuario_actual)):
    with pool.connection() as conn:
        # El commit ocurre al salir del bloque: solo despues respondemos 201
        # al estudiante (ADR-0003).
        nueva = conn.execute(
            """INSERT INTO respuestas
                 (id_respuesta, examen_id, usuario_id, pregunta, respuesta)
               VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT (id_respuesta) DO NOTHING
               RETURNING id_respuesta""",
            (cuerpo.id_respuesta, examen_id, usuario_id,
             cuerpo.pregunta, cuerpo.respuesta),
        ).fetchone()
    return {"id_respuesta": cuerpo.id_respuesta,
            "duplicada": nueva is None,
            "instancia": os.getenv("HOSTNAME", "local")}


@app.get("/resultados")
def resultados(usuario_id: int = Depends(usuario_actual)):
    with pool.connection() as conn:
        return conn.execute(
            """SELECT examen_id, COUNT(*) AS respondidas, MAX(recibida_en) AS ultima
               FROM respuestas WHERE usuario_id = %s GROUP BY examen_id""",
            (usuario_id,),
        ).fetchall()