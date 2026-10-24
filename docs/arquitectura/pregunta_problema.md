# Preguntas problema de AulaViva

## 1. ¿Qué pasa si el sistema académico se demora o el correo se cae?

(Lo que ya tienen escrito. Pregunta del C4 Nivel 1 de la clase.)

Mejoren esta sección agregando el detalle técnico:
- Qué se guarda en Redis (matrícula pre-cargada) y por cuánto tiempo.
- Qué va a la cola (notificaciones y envío de notas) y cuántos reintentos hace.
- Qué parte del flujo queda síncrona (guardar la respuesta) y cuál asíncrona
  (correo, sincronización de notas).

## 2. ¿El material pesado va en la base de datos o en almacenamiento de objetos? ¿Por qué?

**Decisión:** almacenamiento de objetos. En la BD solo se guarda la referencia
(URL, nombre, tamaño, curso).

**Por qué:**
- Los archivos pesados inflan la base de datos y encarecen los backups.
- En el pico, muchas descargas simultáneas competirían con las conexiones que
  necesita el examen.
- El almacenamiento de objetos escala la descarga sin cargar la API ni la BD.

## 3. ¿Escalado programado o reactivo? ¿Cuál sirve para un pico conocido?

**Decisión:** escalado programado, con un margen reactivo de respaldo.

**Por qué:**
- El pico es predecible: se sabe el día y la hora del examen.
- El escalado reactivo tarda minutos en responder y el pico llega de golpe.
- Se levantan las réplicas antes del examen y se bajan al terminar, pagando
  capacidad alta solo ~2,4 % del tiempo.

## 4. Si la API cae justo cuando un estudiante envía su examen, ¿qué pasa?

**Decisión:** la respuesta enviada nunca se pierde.

**Mecanismos:**
- Mínimo dos réplicas detrás de Nginx con verificación de salud.
- El cliente guarda las respuestas localmente y reintenta el envío.
- El envío es idempotente: cada respuesta lleva un identificador único y un
  reintento no duplica el registro.
- Se confirma al estudiante solo cuando la respuesta quedó escrita en la BD o
  en la cola.