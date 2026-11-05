# ADR-0007: Application Load Balancer como balanceador y terminador TLS

- **Estado:** Aceptada
- **Fecha:** 2026-11-04

## Contexto
La API corre en varias tareas de ECS (2 fuera del pico, 3 a 11 en el pico,
según los NFR). Se necesita un único punto de entrada que reparta la carga,
deje de enviar tráfico a una tarea caída y cifre el tráfico externo
(TLS 1.2+).

## Decisión
Usar un Application Load Balancer en dos subredes públicas de zonas distintas:
- Escucha en el puerto 443 con certificado TLS; el puerto 80 redirige a 443.
- Grupo de destino de tipo `ip` (necesario para Fargate) con verificación de
  salud **activa** sobre `GET /health`.
- `/health` solo indica que el proceso responde y **no consulta la base de
  datos**. Así un corte breve de RDS no hace que el ALB marque todas las
  tareas como caídas y apague el servicio. La comprobación con base de datos
  está en `/ready`, solo para diagnóstico.
- Umbrales de salud de 2 aciertos y 2 fallos, y un `deregistration delay`
  corto (30 s) para que el escalado a la baja sea rápido.
- El Security Group del ALB es la única entrada permitida hacia las tareas
  (ADR-0008).
- Certificado: si el grupo dispone de un dominio, un certificado público de
  ACM (sin costo). Si no, se importa a ACM un certificado autofirmado, con la
  advertencia de navegador como limitación para la demo.

## Alternativas descartadas
- **Nginx en una instancia EC2:** es un punto único de falla y hay que
  operarlo.
- **Network Load Balancer:** no entiende HTTP ni hace verificación de salud a
  nivel de aplicación.
- **API Gateway:** se cobra por petición, algo poco conveniente para un pico
  de miles de solicitudes en pocos minutos.

## Consecuencias
- (+) Una tarea puede caer sin que el usuario lo note: el ALB detecta la falla
  con verificación activa y deja de enviarle tráfico.
- (+) Sin servidores que operar; escala solo con el tráfico.
- (+) Punto único para TLS y para las métricas del ALB en CloudWatch.
- (-) Se cobra por hora más por uso (LCU) aunque no haya tráfico; se destruye
  con Terraform fuera de las sesiones de trabajo.
- (-) Exige dos zonas de disponibilidad.
- (-) Sin dominio propio, el certificado es autofirmado y el navegador muestra
  advertencia.