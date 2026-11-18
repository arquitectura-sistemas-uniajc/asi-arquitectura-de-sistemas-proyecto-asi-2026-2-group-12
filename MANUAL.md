# AulaViva · Manual de ejecución local y despliegue en AWS

**Arquitectura de Sistemas · UNIAJC · Grupo 1**
**Plataforma educativa con evaluaciones en línea.** Cada evaluación con su cupo, sin caídas el día del parcial.

Este paquete trae la aplicación base de su proyecto, ya construida: **frontend, API y base de datos**. En este curso no se califica cuánto código escriben, sino cómo despliegan, aíslan y operan el sistema. Ustedes no van a programar la aplicación: la van a **ejecutar, segmentar en red, desplegar en la nube y defender**.

Al terminar este manual tendrán:

1. La aplicación corriendo en su computador con Docker Compose.
2. La prueba de que la API y la base de datos **no son alcanzables desde afuera**.
3. La misma aplicación publicada en una instancia EC2 dentro de una VPC propia.
4. Los recursos de AWS eliminados y la evidencia de que quedaron en cero.

---

## 1. Qué hay en el paquete

```text
docker-compose.yml        el diagrama de despliegue, ejecutable
.env.example              plantilla de configuración (el .env real nunca se sube)
.gitignore
src/
  web/                    frontend: index.html, estilos.css, app.js
  api/                    API en Node.js + Express (Dockerfile multi-stage, usuario no root)
    src/index.js          endpoints
    src/dominio.json      textos y reglas del dominio de AulaViva
  db/init.sql             tablas y datos iniciales de AulaViva
infra/
  nginx/nginx.conf        proxy: sirve el frontend y reenvía /api/ a la API
  nube/user-data.sh       instala Docker en la instancia EC2
MANUAL.md                 este documento
```

### Qué muestra la aplicación

| Parte de la pantalla | Qué es en AulaViva |
|---|---|
| Tabla principal | Evaluaciones: evaluación, horario, asignatura y cupos libres |
| Formulario | **Inscribirme**: se elige un elemento y se escribe estudiante |
| Lista de la derecha | Las últimas inscripciones guardadas en PostgreSQL |
| Indicador de la cabecera | Qué contenedor de la API respondió (se usa más adelante, con réplicas) |

### Endpoints de la API

| Método y ruta | Para qué |
|---|---|
| `GET /api/health` | Salud: la API y su conexión con la base |
| `GET /api/info` | Textos del dominio (el frontend se dibuja con ellos) |
| `GET /api/items` | Lectura frecuente: evaluaciones |
| `GET /api/resumen` | Consulta de resumen (totales) |
| `GET /api/registros` | Últimas inscripciones |
| `POST /api/registros` | Escritura crítica: inscribirme, dentro de una transacción |

## 2. La arquitectura de red

```text
            Internet / su navegador
                     |
                     |  puerto 8080 (local) o 80 (EC2)  <- el ÚNICO puerto publicado
                     v
   red "publica"  +--------------+
                  |    proxy     |  Nginx: sirve src/web y reenvía /api/
                  +--------------+
                     |
   red "aplicacion"  |  (internal: true, sin salida a internet)
                     v
                  +--------------+
                  |     api      |  Node.js, puerto 3000 SIN publicar
                  +--------------+
                     |
   red "datos"       |  (internal: true)
                     v
                  +--------------+
                  |      db      |  PostgreSQL 17, puerto 5432 SIN publicar, volumen "datos"
                  +--------------+
```

Las tres redes de Docker equivalen a las tres capas de subredes de una VPC: pública, privada de aplicación y privada de datos. El proxy no puede hablar con la base de datos: no comparten red.

---

## Parte A · Preparar el equipo (10 min)

1. Instale **Docker Desktop** y ábralo. Espere a que diga *Engine running*.
2. Use **Git Bash** (Windows) o la terminal (macOS/Linux) para todos los comandos.
3. Verifique:

```bash
docker --version
docker compose version
```

## Parte B · Integrarlo en el repositorio del grupo (10 min)

1. Actualice su repositorio y cree una rama. Nunca se trabaja sobre `main`:

```bash
git switch main
git pull
git switch -c feature/aplicacion-base
```

2. Descomprima el paquete y copie **su contenido** en la raíz del repositorio. Las carpetas `src/` e `infra/` ya existen en la plantilla: se agregan los archivos, no se reemplaza la carpeta. Si un archivo ya existe, conserve el de la plantilla y agregue las líneas que falten (por ejemplo, en `.gitignore`).
3. Confirme que `.env` aparece en `.gitignore`. **El `.env` nunca se sube.**
4. Commit y pull request:

```bash
git add docker-compose.yml .env.example src infra MANUAL.md
git commit -m "feat: aplicacion base de AulaViva con red segmentada"
git push -u origin feature/aplicacion-base
```

Abran el pull request en GitHub y que otro integrante lo revise antes de fusionarlo.

## Parte C · Ejecutar en local (15 min)

1. Cree el archivo de configuración y cambie la clave:

```bash
cp .env.example .env
```

Abra `.env` y cambie `DB_PASSWORD` por una clave propia. Deje `PUERTO_WEB=8080`.

2. Construya y levante los tres contenedores:

```bash
docker compose up -d --build
```

La primera vez tarda unos minutos, porque descarga las imágenes de Node, Nginx y PostgreSQL.

3. Verifique que los tres estén arriba y **sanos**:

```bash
docker compose ps
```

Deben aparecer `proxy`, `api` y `db`. La API y la base deben decir `(healthy)`.

4. Abra **http://localhost:8080**. Debe ver la página de AulaViva con los datos iniciales.
5. Use el formulario **Inscribirme** y compruebe que el registro aparece en la lista y que el total cambia.

> **Captura 1:** la página funcionando en `localhost:8080`, con al menos un registro hecho por ustedes.

## Parte D · Demostrar el aislamiento (15 min)

Esta es la parte que se califica. La aplicación funciona, pero la API y la base **no deben existir** para nadie fuera de su red.

```bash
# 1) A través del proxy: FUNCIONA
curl -i http://localhost:8080/api/health

# 2) Directo a la API desde su computador: FALLA (no hay puerto publicado)
curl -m 3 http://localhost:3000/api/health

# 3) ¿Docker publicó algún puerto de la API o de la base? NO
docker compose port api 3000
docker compose port db 5432

# 4) Desde DENTRO de la red de aplicación: el proxy sí llega a la API
docker compose exec proxy wget -qO- http://api:3000/api/health

# 5) El proxy NO llega a la base (no comparten red): FALLA
docker compose exec proxy nc -zv -w 3 db 5432

# 6) La API no tiene salida a internet (red interna): FALLA
docker compose exec api wget -qO- -T 5 https://example.com
```

Resultado esperado:

| Prueba | Resultado | Por qué |
|---|---|---|
| 1 | `200 OK` con `"estado":"ok"` | El proxy es el único punto publicado |
| 2 | `Failed to connect` | La API no tiene `ports` en el Compose |
| 3 | `:0` (o un error) | Ningún puerto publicado para `api` ni `db` |
| 4 | `{"estado":"ok",...}` | `proxy` y `api` comparten la red `aplicacion` |
| 5 | Falla al resolver o conectar `db` | `proxy` no está en la red `datos` |
| 6 | Falla | La red `aplicacion` es `internal: true`: no hay ruta hacia afuera |

> **Captura 2:** la terminal con las seis pruebas y sus resultados.

> Si en su computador ya corre otro PostgreSQL en el puerto 5432, la prueba 3 sigue siendo válida: lo que importa es que Docker no publica el de este proyecto.

## Parte E · Desplegar en AWS (45 min)

Todo se hace con el **usuario IAM** del integrante, nunca con el usuario raíz. Región sugerida: la que eligieron en el análisis de latencia (por ejemplo, `us-east-1`). Etiquete **todo** con `Proyecto = aulaviva` y `Owner = <su usuario>`.

### E1. La VPC: su red privada en la nube

1. Consola → **VPC** → *Create VPC* → **VPC and more**.
2. Configure:

| Campo | Valor |
|---|---|
| Name tag auto-generation | `aulaviva` |
| IPv4 CIDR block | `10.0.0.0/16` |
| Number of Availability Zones | 1 |
| Number of public subnets | 1 (queda `10.0.0.0/20` o similar; puede ajustarla a `10.0.1.0/24`) |
| Number of private subnets | 1 |
| NAT gateways | **None** (cobra por hora; hoy no se necesita) |
| VPC endpoints | None |

3. *Create VPC*. El asistente crea la VPC, las dos subredes, el **Internet Gateway** y las **tablas de rutas**.
4. Abra la tabla de rutas de la subred pública y busque la ruta `0.0.0.0/0 → igw-…`. **Esa ruta es lo que hace pública a la subred.** La tabla de la privada no la tiene.

> **Captura 3:** el mapa de recursos de la VPC (pestaña *Resource map*).

### E2. El grupo de seguridad: qué puertos se abren

EC2 → **Security Groups** → *Create security group*:

| Campo | Valor |
|---|---|
| Name | `sg-aulaviva-web` |
| VPC | la VPC `aulaviva-vpc` |

Reglas de entrada:

| Tipo | Puerto | Origen | Justificación |
|---|---|---|---|
| HTTP | 80 | `0.0.0.0/0` | Los usuarios entran a la aplicación |
| SSH | 22 | **My IP** | Solo su equipo administra el servidor |

**No abra 3000 ni 5432.** Si la base de datos no tiene regla, no existe para internet, aunque alguien conozca la clave.

### E3. La llave y la instancia

1. EC2 → **Key pairs** → *Create key pair*: nombre `kp-aulaviva`, tipo RSA, formato `.pem`. Guárdela fuera del repositorio.
2. EC2 → **Launch instance**:

| Campo | Valor |
|---|---|
| Name | `aulaviva-web` |
| AMI | Ubuntu Server 24.04 LTS |
| Instance type | `t3.micro` (o el que el plan gratuito marque como elegible) |
| Key pair | `kp-aulaviva` |
| Network settings → Edit | VPC `aulaviva-vpc`, subred **pública**, *Auto-assign public IP*: **Enable**, grupo `sg-aulaviva-web` |
| Storage | 10 GiB gp3 |
| Advanced details → User data | pegue el contenido de `infra/nube/user-data.sh` |

3. *Launch instance* y espere a que diga *Running* y *2/2 checks passed*. Copie la **IPv4 pública**.

### E4. Copiar el proyecto al servidor

Desde la raíz del repositorio, en Git Bash (cambie `IP` y la ruta de la llave):

```bash
tar -czf app.tgz docker-compose.yml .env.example src infra
scp -i ~/kp-aulaviva.pem app.tgz ubuntu@IP:~
ssh -i ~/kp-aulaviva.pem ubuntu@IP
```

Si `ssh` dice *Permissions are too open*, ejecute `chmod 400 ~/kp-aulaviva.pem`. Si la red de la universidad bloquea el puerto 22, use **EC2 Instance Connect** desde la consola y copie los archivos con `git clone`.

### E5. Levantar la aplicación en EC2

Ya dentro del servidor:

```bash
docker --version                 # si dice "command not found", espere 1 minuto: user data sigue instalando
mkdir -p aulaviva && tar -xzf app.tgz -C aulaviva && cd aulaviva
cp .env.example .env
nano .env                        # DB_PASSWORD=<otra clave>   PUERTO_WEB=80
docker compose up -d --build
docker compose ps
```

Abra en el navegador **http://IP-PUBLICA**. Es la misma aplicación, con la misma imagen y el mismo Compose que en su computador.

> **Captura 4:** la aplicación funcionando con la IP pública en la barra de direcciones.

### E6. Probar el aislamiento en la nube

Desde **su computador** (no desde el servidor):

```bash
curl -i http://IP-PUBLICA/api/health          # 200: entra por el proxy
curl -m 5 http://IP-PUBLICA:3000/api/health   # falla: sin regla y sin puerto publicado
curl -m 5 telnet://IP-PUBLICA:5432            # falla: la base no existe para internet
```

En PowerShell también sirve `Test-NetConnection IP-PUBLICA -Port 5432` (debe decir `TcpTestSucceeded : False`).

Hay **dos barreras**: el grupo de seguridad no abre el puerto, y Docker tampoco lo publica. Expliquen en el informe qué pasaría si se quitara solo una de las dos.

> **Captura 5:** las tres pruebas desde su computador.

## Parte F · Apagar y limpiar (10 min, obligatorio)

Un recurso olvidado sigue cobrando.

1. EC2 → *Instances* → seleccione `aulaviva-web` → **Instance state → Terminate**.
2. Cuando la instancia diga *Terminated*: VPC → *Your VPCs* → seleccione `aulaviva-vpc` → **Actions → Delete VPC**. Se borran también las subredes, el Internet Gateway, las tablas de rutas y el grupo de seguridad.
3. Opcional: borre el par de llaves `kp-aulaviva`.
4. Revise **EC2 Dashboard** y **Billing → Free tier**: cero instancias en ejecución.

> **Captura 6:** el panel de EC2 con 0 instancias en ejecución y la lista de VPC sin `aulaviva-vpc`.

Costo de referencia: una `t3.micro` cuesta del orden de 0,01 USD por hora, más unos 0,005 USD por hora de la IP pública. Dejarla encendida un mes completo supera el presupuesto de 1 USD del grupo.

## Parte G · Apagar en local

```bash
docker compose down        # apaga y borra contenedores; los datos quedan en el volumen
docker compose down -v     # además borra el volumen: la base vuelve a los datos iniciales
```

`down -v` borra la base de datos. En producción, esa letra es un incidente.

---

## Evidencias para entregar

Guárdenlas en `evidencias/` del repositorio y enlácenlas en el pull request:

1. Captura 1: la aplicación en `localhost:8080`.
2. Captura 2: las seis pruebas de aislamiento en local.
3. Captura 3: el mapa de recursos de la VPC.
4. Captura 4: la aplicación en la IP pública de EC2.
5. Captura 5: las pruebas de aislamiento desde internet.
6. Captura 6: recursos en cero.
7. La tabla de reglas del grupo de seguridad con la justificación de cada regla.

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `Defina DB_PASSWORD en el archivo .env` | No existe el `.env`. Ejecute `cp .env.example .env` |
| `port is already allocated` en 8080 | Otro programa usa el puerto. Cambie `PUERTO_WEB=8081` en `.env` y abra `localhost:8081` |
| La página dice "La API no responde" | `docker compose ps`: la API debe estar `healthy`. Revise `docker compose logs api` |
| `api` queda `unhealthy` | Casi siempre la clave: cambió `DB_PASSWORD` después del primer arranque. Ejecute `docker compose down -v` y vuelva a levantar |
| Los datos no cambian aunque edité `init.sql` | `init.sql` solo corre con el volumen vacío. `docker compose down -v` y `up -d` |
| La IP pública no abre | Revise que el grupo de seguridad tenga HTTP 80, que la subred sea la pública y que `PUERTO_WEB=80` en el `.env` del servidor |
| `ssh: connect … timed out` | La regla SSH quedó con otra IP (cambió de red). Edite la regla a *My IP* otra vez |
| `docker: command not found` en EC2 | El user data aún instala Docker. Espere y vuelva a entrar; o ejecute el contenido de `infra/nube/user-data.sh` con `sudo bash` |
| `permission denied … docker.sock` | Salga y vuelva a entrar por SSH (el grupo `docker` se aplica al iniciar sesión) |

## Para la siguiente

Esta aplicación es la base sobre la que se construye el resto del semestre: caché, réplicas detrás del proxy, respaldo de la base, observabilidad y pruebas de carga. La red que segmentan hoy es la que se audita en la revisión del sistema funcionando.
