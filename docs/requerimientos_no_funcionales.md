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
| Cómputo de la API | ECS Fargate, tarea de 0,25 vCPU y 0,5 GB | Mínimo para controlar el costo; se ajusta con la prueba de carga |
| Capacidad por tarea de la API | 50 req/s | Hipótesis; se mide con k6 en el Hito 3 |
| Zonas de disponibilidad | 2 | Requisito del ALB y tolerancia a la caída de una zona |
| Margen del escalado programado | 30 min antes y 30 min después de cada franja | Tiempo de arranque de tareas y cierre ordenado |

Todos los valores de capacidad son hipótesis de diseño y se reemplazan por
medidas reales cuando se ejecute la prueba de carga.

## 2. Cálculo de carga del pico

| Concepto | Base (2.000) | Alto (10.000) |
|---|---|---|
| Autoguardado promedio (40 resp. en 120 min = 1 cada 3 min) | ≈ 11 req/s | ≈ 56 req/s |
| Ráfaga de inicio (todos cargan el examen en ~1 min) | ≈ 33 req/s | ≈ 167 req/s |
| Ráfaga de cierre (50 % envía en los últimos 5 min) | ≈ 3,3 req/s + reintentos | ≈ 17 req/s + reintentos |
| **Carga de diseño** (ráfaga x margen de seguridad 3x, incluye temporizador y reintentos) | **≈ 100 req/s** | **≈ 500 req/s** |
| Tareas de API necesarias (a 50 req/s) | 2 | 10 |
| Tareas con redundancia N+1 | **3** | **11** |
| Tareas fuera del pico | 2 | 2 |

Las dos tareas mínimas fuera del pico se reparten en dos zonas de
disponibilidad, de modo que la caída de una zona no deja el servicio sin
capacidad.

## 3. Requerimientos con valor

| Atributo | Requerimiento cuantificado | Cómo se verifica |
|---|---|---|
| Disponibilidad | 99,5 % mensual fuera del pico (≈3,6 h de caída tolerada al mes). 99,9 % durante las franjas de examen (≈7 min por franja de 2 h). **Limitación:** RDS en una sola zona por costo; Multi-AZ se evalúa en el escenario alto de costos | Métricas `HealthyHostCount` y `HTTPCode_Target_5XX_Count` del ALB en CloudWatch |
| Rendimiento | p95 < 500 ms en `POST /examenes/{id}/respuestas` con 2.000 usuarios concurrentes; tasa de error < 0,1 % | Prueba de carga con k6 |
| Escalabilidad | Soportar 5x el escenario base (10.000 usuarios) agregando tareas, sin cambiar el diseño. Escalado **programado** con Application Auto Scaling: tareas arriba 30 min antes de la franja y abajo 30 min después | Prueba de carga y ejecución de la acción programada |
| Seguridad | JWT con expiración ≤ 1 h; TLS 1.2+ en el ALB; secretos en SSM Parameter Store, fuera del repositorio; contenedor sin usuario root; imagen sin vulnerabilidades críticas (escaneo de ECR); RDS en subred privada y accesible solo desde el Security Group de la API | Escaneo en ECR, revisión de Security Groups, intento de conexión a RDS desde fuera |
| Recuperación | **RTO:** 15 min fuera del pico (a validar: restaurar una instancia RDS puede tardar más; se mide y se ajusta). **RPO:** 0 para respuestas de examen (solo se confirma tras escribir en RDS); ≈5 min para el resto, con copias automáticas y restauración a un punto en el tiempo | Restauración de RDS verificada; demo de falla inyectada |
| Observabilidad | Detectar un incidente en < 2 min: métricas de 1 minuto en CloudWatch y alarma sobre errores 5xx o latencia p95 | Alarma disparada en la demo |
| Costo | Techo de gasto: los créditos de la cuenta (hasta USD 200), controlados con una alerta en AWS Budgets. La infraestructura se destruye con Terraform fuera de las sesiones de trabajo. El techo mensual del sistema en operación se calcula en el Hito 3 con la calculadora de precios de AWS. Meta: ahorrar ≥ 30 % frente a tener la capacidad pico las 168 h | AWS Budgets y estimación de costos en dos escenarios |

## 4. Por qué el escalado programado ahorra costo

Cada franja de 2 h lleva 30 min de margen antes y 30 min después, es decir,
3 h de capacidad alta por franja. Con 2 franjas a la semana:

- Horas con capacidad alta por semana: 2 x 3 h = 6 h.
- Horas con capacidad alta por mes: 6 h x 52 semanas / 12 meses = 26 h.
- Horas del mes: 720.

| Escenario | Siempre en capacidad pico (720 h) | Programado (2 tareas fijas + extras 26 h) | Ahorro |
|---|---|---|---|
| Base (3 tareas en el pico) | 3 x 720 = 2.160 tarea-hora | 2 x 720 + 1 x 26 = 1.466 | ≈ 32 % |
| Alto (11 tareas en el pico) | 11 x 720 = 7.920 tarea-hora | 2 x 720 + 9 x 26 = 1.674 | ≈ 79 % |

Conclusión: cuanto mayor es el pico respecto a la base, más conviene el
escalado programado. En el escenario base el ahorro viene sobre todo de no
sobredimensionar; en el alto es decisivo. El cálculo cuenta solo las tareas de
la API; el costo del ALB, RDS y ElastiCache es fijo y se suma en la estimación
de costos del Hito 3.

## 5. Notas

- Los costos fijos (ALB, RDS, ElastiCache) no se reducen con el escalado
  programado, por lo que el ahorro real sobre la factura total es menor que el
  porcentaje de la tabla.
- Si la cuenta usa el plan gratuito con créditos, la infraestructura se destruye
  y se recrea con Terraform para no gastarlos fuera de las sesiones de trabajo.