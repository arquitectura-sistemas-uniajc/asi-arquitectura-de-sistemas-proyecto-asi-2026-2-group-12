CREATE TABLE cursos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL
);

CREATE TABLE matriculas (
    usuario_id INT NOT NULL,
    curso_id INT NOT NULL REFERENCES cursos(id),
    PRIMARY KEY (usuario_id, curso_id)
);

CREATE TABLE material (
    id SERIAL PRIMARY KEY,
    curso_id INT NOT NULL REFERENCES cursos(id),
    nombre TEXT NOT NULL,
    clave_objeto TEXT NOT NULL,
    tamano_bytes BIGINT
);

CREATE TABLE examenes (
    id SERIAL PRIMARY KEY,
    curso_id INT NOT NULL REFERENCES cursos(id),
    titulo TEXT NOT NULL,
    duracion_min INT NOT NULL
);

CREATE TABLE respuestas (
    id_respuesta TEXT PRIMARY KEY,
    examen_id INT NOT NULL REFERENCES examenes(id),
    usuario_id INT NOT NULL,
    pregunta INT NOT NULL,
    respuesta TEXT NOT NULL,
    recibida_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_respuestas_examen_usuario ON respuestas (examen_id, usuario_id);
CREATE INDEX idx_matriculas_usuario ON matriculas (usuario_id);
CREATE INDEX idx_material_curso ON material (curso_id);