INSERT INTO cursos (id, nombre) VALUES
  (1, 'Arquitectura de Sistemas'),
  (2, 'Bases de Datos');

INSERT INTO matriculas (usuario_id, curso_id) VALUES
  (1, 1), (1, 2), (2, 1);

INSERT INTO material (curso_id, nombre, clave_objeto, tamano_bytes) VALUES
  (1, 'Guia semana 1.pdf', 'cursos/1/guia-semana-1.pdf', 1048576);

INSERT INTO examenes (id, curso_id, titulo, duracion_min) VALUES
  (1, 1, 'Parcial 1', 120);

SELECT setval('cursos_id_seq', 2);
SELECT setval('examenes_id_seq', 1);