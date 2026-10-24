# Requerimientos funcionales

## 1. Alcance

AulaViva es una plataforma educativa con evaluaciones en línea. El sistema es deliberadamente mínimo: la prioridad del proyecto es la arquitectura, no la cantidad de funcionalidades.

## 2. Usuarios 

- Estudiante: Consulta cursos, descarga material, presenta exámenes y ve resultados.

- Docente: Sube material, crea exámenes y consulta resultados de su curso.

- Coordinador académico: Consulta información general de cursos y resultados. 

## 3. Requerimientos funcionales

RF-01. El sistema debe listar los cursos en los que el usuario está matriculado.  (Actor Estudiante, Actor Docente)

RF-02. El sistema debe permitir subir material de un curso. (Actor Docente)

RF-03.  El sistema debe permitir descargar el material de un curso (Actor Estudiante)

RF-04. El sistema debe permitir presentar un examen con temporizador (Actor Estudiante)

RF-05. El sistema debe registrar las respuestas del estudiante (Actor Estudiante)

RF-06. El sistema debe permitir consultar los resultados de un examen (Actor Estudiante, Actor Docente)

RF-07. El sistema debe validar la matrícula contra el sistema académico externo (Actor Sistema)

RF-08. El sistema debe enviar notificaciones por correo confirmación de entrega, resultados (Actor Sistema)

## 4. Endpoints de la API (máximo 5 de negocio + salud)

| Método | Ruta | Requerimiento |
| GET | `/cursos` | RF-01 |
| GET | `/cursos/{id}/material` | RF-03 |
| GET | `/examenes/{id}` | RF-04 |
| POST | `/examenes/{id}/respuestas` | RF-05 |
| GET | `/resultados` | RF-06 |
| GET | `/health` | Verificación de salud |
| GET | `/metrics` | Métricas para Prometheus |

> RF-02 (subir material) se puede resolver con una carga directa al
> almacenamiento de objetos con URL prefirmada, sin sumar otro endpoint
> pesado. Decídanlo en un ADR.

## 5. Sistemas externos

| Sistema | Uso | Comportamiento ante falla |
| Sistema académico institucional | Validar matrícula | Usar matrícula pre-cargada en caché |
| Servicio de correo | Enviar notificaciones | Encolar y reintentar en segundo plano |

## 6. Restricciones

- La API expone un máximo de 4 o 5 endpoints de negocio.
- Toda la infraestructura debe poder recrearse desde código.
- Un pico conocido: todos los estudiantes de un curso presentan el examen en la
  misma franja de ~4 horas semanales (de 168 h).
- Una respuesta enviada nunca debe perderse.