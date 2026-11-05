# ADR-0008: VPC, Security Groups y secretos en SSM

- **Estado:** Aceptada
- **Fecha:** 2026-11-04

## Contexto
El enunciado exige que la base de datos no sea alcanzable desde fuera, que los
secretos no estén en el repositorio y que los contenedores no corran como
root. Los datos de notas y respuestas son sensibles. Además, el presupuesto son
créditos limitados, por lo que se evitan servicios con costo por hora.

## Decisión
Una VPC con dos zonas de disponibilidad y dos tipos de subred:

| Capa | Ubicación | Entrada permitida |
|---|---|---|
| ALB | Subredes públicas | Internet, solo puerto 443 (y 80 para redirigir) |
| Tareas ECS (API y trabajador) | Subredes públicas, con IP pública | Solo desde el Security Group del ALB |
| RDS y ElastiCache | Subredes privadas, sin ruta a internet | Solo desde el Security Group de las tareas |

- Los Security Groups se referencian entre sí (el de RDS acepta el del
  servicio, no rangos de IP).
- **Sin NAT Gateway:** cuesta por hora y por dato. Las tareas usan IP pública
  para descargar la imagen de ECR y hablar con SQS, S3 y SSM, pero su Security
  Group no admite tráfico de internet, solo el del ALB.
- RDS con acceso público desactivado.
- Secretos (`JWT_SECRET`, contraseña de la base) como parámetros `SecureString`
  en SSM Parameter Store. ECS los inyecta como variables de entorno mediante el
  rol de ejecución de la tarea; no están en el repositorio ni en la imagen.
- Rol de la tarea con mínimo privilegio: solo enviar y recibir de la cola, y
  leer del bucket del curso.
- Contenedor sin usuario root (`appuser` en el `Dockerfile`) e imagen escaneada
  al subir a ECR.
- El estado de Terraform y los archivos `*.tfvars` con valores reales están en
  `.gitignore`.

## Evidencia
- Intento de conexión al puerto 5432 de RDS desde fuera de la VPC: falla.
- Reglas de entrada de los tres Security Groups.
- RDS con `Publicly accessible = No`.
- Resultado del escaneo de ECR.

## Alternativas descartadas
- **NAT Gateway para tareas en subred privada:** es más estricto, pero cuesta
  por hora y por GB y consume los créditos.
- **VPC endpoints de tipo interface:** también cobran por hora y por zona.
- **Secretos como texto en variables de Terraform o en la definición de la
  tarea:** quedan en el estado de Terraform y en el historial de Git.
- **Base de datos en subred pública:** contradice el requisito del enunciado.

## Consecuencias
- (+) La base de datos no tiene ruta desde internet ni regla que la admita.
- (+) Los secretos no quedan en Git ni en la imagen.
- (+) Sin costo fijo de NAT.
- (-) Las tareas tienen IP pública; solo el ALB puede alcanzarlas, pero es
  menos estricto que una subred privada con NAT. Se declara como compromiso de
  costo.
- (-) Depurar la base exige entrar por una tarea dentro de la VPC.
- (-) Los parámetros de SSM Parameter Store estándar no rotan solos; la
  rotación es manual.
- (-) El estado de Terraform contiene valores sensibles, así que no debe
  subirse a Git.