## ¿qué pasa si el sistema académico se demora o el correo se cae?

Si el sistema académico se demora o el servicio de correo se cae, el impacto depende de si el diseño es síncrono o asíncrono.   

Si el diseño es síncrono (sin tolerancia a fallos): El sistema AulaViva se bloquea o colapsa. Los estudiantes no pueden ingresar al examen, las entregas se cancelan y el temporizador falla al intentar comunicarse con los servicios externos fuera de servicio.  

Si el diseño es asíncrono (arquitectura correcta): No pasa nada crítico. 

Sistema académico: La información de matrícula se pre-carga localmente en caché antes del examen, y las notas se envían de vuelta en segundo plano cuando el sistema externo vuelva a estar disponible.   

Servicio de correo: La notificación se guarda en una cola de mensajes en segundo plano y se reintenta enviar más tarde, permitiendo que el estudiante finalice y guarde su examen sin interrupciones.