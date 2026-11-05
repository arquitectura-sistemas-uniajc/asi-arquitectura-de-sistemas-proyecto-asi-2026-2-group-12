# Preguntas problema de AulaViva

## 1. ¿Qué pasa si el sistema académico se demora o el correo se cae?

Si el sistema académico se demora o el servicio de correo se cae, el impacto
depende de si el diseño es síncrono o asíncrono.

**Diseño síncrono (sin tolerancia a fallos):** AulaViva se bloquea. Los
estudiantes no pueden ingresar al examen, las entregas se cancelan y el
temporizador falla al intentar comunicarse con los servicios externos.

**Diseño asíncrono (arquitectura elegida):** no pasa nada crítico.

- **Sistema académico:** la matrícula se pre-carga en ElastiCache (Redis) antes
  de la franja de examen, con TTL [definir]. Durante el examen no se consulta
  en línea. Las notas se envían de vuelta en segundo plano cuando el sistema
  externo vuelva a estar disponible.
- **Servicio de correo:** la notificación se publica en una cola de Amazon SQS.
  El trabajador de notificación la consume y, si el correo falla, el mensaje
  vuelve a la cola y se reintenta; tras agotar los reintentos pasa a una cola
  de mensajes fallidos. El estudiante termina y guarda su examen sin
  interrupciones.

**Qué es síncrono y qué asíncrono:**

| Síncrono (el estudiante espera) | Asíncrono (en segundo plano) |
|---|---|
| Guardar la respuesta en RDS PostgreSQL | Correo de confirmación y resultados |
| Validar sesión (JWT) y matrícula en caché | Sincronización de notas con el sistema académico |

Ver [ADR-0004](adr/0004-integraciones-asincronas-con-cola.md) y
[ADR-0005](adr/0005-rabbitmq-como-cola-de-mensajes.md).

## 2. ¿El material pesado va en la base de datos o en almacenamiento de objetos? ¿Por qué?

**Decisión:** almacenamiento de objetos (S3 o MinIO). En PostgreSQL solo se
guarda la referencia: clave del objeto, nombre, tamaño y curso.

**Por qué:**
- Los archivos pesados inflan la BD y encarecen los backups.
- En el pico, las descargas competirían con las conexiones que necesita el
  examen.
- La descarga con URL prefirmada escala sin pasar por la API ni la BD.

Ver [ADR-0001](adr/0001-almacenamiento-de-objetos-para-material.md).

## 3. ¿Escalado programado o reactivo? ¿Cuál sirve para un pico conocido?

**Decisión:** escalado programado, con una regla reactiva solo como respaldo.

**Por qué:**
- El pico es predecible: 4 h de 168 (≈2,4 %), en franjas conocidas.
- El escalado reactivo tarda minutos y todos los estudiantes entran en el mismo
  minuto, así que el sistema se degradaría justo al inicio.
- Se suben las réplicas 30 min antes (de 2 a 3 en el escenario base, a 11 en el
  alto) y se bajan 30 min después. Ahorro estimado: ≈33 % (base) a ≈80 % (alto).

Ver [ADR-0002](adr/0002-escalado-programado.md) y los cálculos en
[requerimientos_no_funcionales.md](requerimientos_no_funcionales.md).

## 4. Si la API cae justo cuando un estudiante envía su examen, ¿qué pasa?

**Decisión:** una respuesta enviada nunca se pierde.

**Qué ocurre, paso a paso:**
1. El cliente guarda la respuesta en almacenamiento local antes de enviarla.
2. Nginx detecta que una réplica cayó (verificación de salud) y dirige la
   petición a otra.
3. Si ninguna responde, el cliente reintenta con espera creciente y conserva
   la respuesta local.
4. Cada respuesta lleva un identificador único, así que un reintento no genera
   duplicados (`INSERT ... ON CONFLICT DO NOTHING`).
5. Solo se confirma al estudiante cuando PostgreSQL confirmó la escritura.

**Caso límite:** si la API cae después de escribir pero antes de responder, el
cliente reintenta, la BD detecta el duplicado y devuelve éxito sin crear un
segundo registro.

Ver [ADR-0003](adr/0003-escritura-idempotente-de-respuestas.md).