# Diagrama de despliegue (AWS)


## Reglas de red

| Capa | Qué contiene | Entrada permitida |
|---|---|---|
| ALB (subred pública) | Punto único de entrada | Internet, solo puerto 443 |
| Tareas ECS (subred pública, SG propio) | API y trabajador | Solo desde el Security Group del ALB |
| RDS y ElastiCache (subred privada) | Datos y caché | Solo desde el Security Group de las tareas |

Las tareas van en subred pública con IP pública para **evitar el NAT Gateway**
(se cobra por hora y consume créditos). Su Security Group no admite tráfico de
internet, solo el del ALB. La base de datos no tiene ruta a internet.