# Requerimientos no funcionales

## 1. Supuestos

| Supuesto | Valor | Justificación |
|---|---|---|
| Estudiantes simultáneos en el pico (base) | 2.000 | Curso grande presentando a la vez |
| Estudiantes simultáneos en el pico (alto) | 10.000 | Varios cursos o crecimiento |
| Pico semanal | 4 h de 168 h (≈2,4 %) | Enunciado |
| Distribución del pico | 2 franjas de 2 h | Dos exámenes por semana |
| Preguntas por examen | 40 | Supuesto de diseño |
| Guardado de respuestas | Autoguardado por pregunta | Reduce el riesgo de pérdida |
| Capacidad por réplica de la API | 50 req/s | Hipótesis; se mide con k6 en el Hito 3 |

## 2. Cálculo de carga del pico

| Concepto | Base (2.000) | Alto (10.000) |
|---|---|---|
| Autoguardado promedio (40 resp. en 120 min = 1 cada 3 min) | ≈ 11 req/s | ≈ 56 req/s |
| Ráfaga de inicio (todos cargan el examen en ~1 min) | ≈ 33 req/s | ≈ 167 req/s |
| Ráfaga de cierre (50 % envía en los últimos 5 min) | ≈ 3,3 req/s + reintentos | ≈ 17 req/s + reintentos |
| **Carga de diseño** (ráfaga x margen de seguridad 3x, incluye temporizador y reintentos) | **≈ 100 req/s** | **≈ 500 req/s** |
| Réplicas de API necesarias (a 50 req/s) | 2 | 10 |
| Réplicas con redundancia N+1 | **3** | **11** |
| Réplicas fuera del pico | 2 | 2 |

## 3. Requerimientos con valor

| Atributo | Requerimiento cuantificado | Cómo se verifica |
|---|---|---|
| Disponibilidad | 99,5 % mensual fuera del pico (≈3,6 h de caída tolerada al mes). **99,9 % durante las franjas de examen** (≈7 min por franja de 2 h) | Métrica `up` en Prometheus |
| Rendimiento | p95 < 500 ms en `POST /examenes/{id}/respuestas` con 2.000 usuarios concurrentes; tasa de error < 0,1 % | Prueba de carga con k6 |
| Escalabilidad | Soportar 5x el escenario base (10.000 usuarios) agregando réplicas, sin cambiar el diseño. Escalado **programado**: réplicas arriba 30 min antes de la franja y abajo 30 min después | Prueba de carga y ejecución del escalado programado |
| Seguridad | Autenticación con JWT (expiración ≤ 1 h); TLS 1.2+ en todo el tráfico externo; secretos fuera del repositorio; contenedores sin usuario root; imagen sin vulnerabilidades críticas; BD no alcanzable desde fuera | Escaneo de imagen en el pipeline, prueba de red |
| Recuperación | **RTO:** 15 min fuera del pico, 5 min durante el examen. **RPO:** 0 para respuestas de examen (solo se confirma tras confirmar la escritura en la BD); 5 min para el resto de datos | Restauración de backup verificada, demo de falla inyectada |
| Observabilidad | Detectar un incidente en < 2 min (scrape cada 15 s, alerta tras 1 min de condición sostenida) | Alerta de Grafana/Prometheus disparada en la demo |
| Costo | Techo mensual: USD [definir en Hito 3] en escenario base y USD [definir] en escenario alto. Meta: ahorrar ≥ 50 % frente a tener la capacidad pico las 168 h | Estimación de costos |

## 4. Por qué el escalado programado ahorra costo

Horas de pico al mes: 4 h x 52 semanas / 12 meses ≈ 17,3 h.

| Escenario | Siempre en capacidad pico (720 h) | Programado (2 réplicas fijas + extras 17,3 h) | Ahorro |
|---|---|---|---|
| Base (3 réplicas en el pico) | 3 x 720 = 2.160 réplica-hora | 2 x 720 + 1 x 17,3 ≈ 1.457 | ≈ 33 % |
| Alto (11 réplicas en el pico) | 11 x 720 = 7.920 réplica-hora | 2 x 720 + 9 x 17,3 ≈ 1.596 | ≈ 80 % |

Conclusión: cuanto mayor es el pico respecto a la base, más conviene el
escalado programado. En el escenario base el ahorro viene sobre todo de
no sobredimensionar; en el alto es decisivo.