// API del proyecto. Vive en la red interna: nadie desde afuera llega aqui directo,
// solo el proxy (Nginx) le reenvia las peticiones que empiezan por /api/.
const express = require("express");
const os = require("os");
const pool = require("./db");
const dominio = require("./dominio.json");

const app = express();
app.use(express.json());

const PUERTO = process.env.PORT || 3000;
const { accion } = dominio;

// Verificacion de salud: la usan el HEALTHCHECK del Dockerfile y el depends_on de Compose.
async function salud(req, res) {
  try {
    await pool.query("SELECT 1");
    res.json({ estado: "ok", contenedor: os.hostname() });
  } catch (error) {
    res.status(503).json({ estado: "sin base de datos", detalle: error.message });
  }
}
app.get("/health", salud);
app.get("/api/health", salud);

// Textos del dominio para que el frontend se dibuje solo
app.get("/api/info", (req, res) => res.json(dominio));

// Lectura frecuente: el catalogo del dominio
app.get("/api/items", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, nombre, detalle, categoria, cantidad::float AS cantidad FROM items ORDER BY id"
  );
  res.json(rows);
});

// Consulta de resumen
app.get("/api/resumen", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM items)::int            AS items,
            (SELECT coalesce(sum(cantidad), 0) FROM items)::float AS total,
            (SELECT count(*) FROM registros)::int        AS registros,
            (SELECT max(fecha) FROM registros)           AS ultimo`
  );
  res.json(rows[0]);
});

// Ultimos registros
app.get("/api/registros", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, i.nombre AS item, r.persona, r.monto::float AS monto, r.fecha
       FROM registros r LEFT JOIN items i ON i.id = r.item_id
      ORDER BY r.id DESC LIMIT 15`
  );
  res.json(rows);
});

// Escritura critica: todo dentro de una transaccion
app.post("/api/registros", async (req, res) => {
  const itemId = Number(req.body?.itemId);
  const persona = String(req.body?.persona ?? "").trim();
  const usaMonto = accion.modo === "sumar_monto" || accion.modo === "fijar";
  const monto = usaMonto ? Number(req.body?.monto) : null;

  if (!Number.isInteger(itemId) || itemId <= 0 || !persona) {
    return res.status(400).json({ error: `Seleccione un elemento y escriba ${accion.persona.toLowerCase()}` });
  }
  if (usaMonto && !Number.isFinite(monto)) {
    return res.status(400).json({ error: `${accion.monto} debe ser un numero` });
  }
  if (accion.modo === "sumar_monto" && monto <= 0) {
    return res.status(400).json({ error: `${accion.monto} debe ser mayor que 0` });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");

    if (accion.unico) {
      const { rowCount } = await cliente.query("SELECT 1 FROM registros WHERE persona = $1", [persona]);
      if (rowCount > 0) {
        await cliente.query("ROLLBACK");
        return res.status(409).json({ error: "Esa persona ya registro su participacion" });
      }
    }

    let sql;
    let params = [itemId];
    if (accion.modo === "descontar") {
      sql = "UPDATE items SET cantidad = cantidad - 1 WHERE id = $1 AND cantidad > 0";
    } else if (accion.modo === "sumar_uno") {
      sql = "UPDATE items SET cantidad = cantidad + 1 WHERE id = $1";
    } else if (accion.modo === "sumar_monto") {
      sql = "UPDATE items SET cantidad = cantidad + $2 WHERE id = $1";
      params = [itemId, monto];
    } else {
      sql = "UPDATE items SET cantidad = $2 WHERE id = $1";
      params = [itemId, monto];
    }
    const { rowCount } = await cliente.query(sql, params);
    if (rowCount === 0) {
      await cliente.query("ROLLBACK");
      return accion.modo === "descontar"
        ? res.status(409).json({ error: "No queda disponibilidad" })
        : res.status(404).json({ error: "Elemento no encontrado" });
    }

    const { rows } = await cliente.query(
      "INSERT INTO registros (item_id, persona, monto) VALUES ($1, $2, $3) RETURNING id, fecha",
      [accion.anonimo ? null : itemId, persona, monto]
    );
    await cliente.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (error) {
    await cliente.query("ROLLBACK");
    if (error.code === "23505") {
      // Restriccion UNIQUE de la base: la ultima barrera contra el doble registro
      return res.status(409).json({ error: "Esa persona ya registro su participacion" });
    }
    res.status(500).json({ error: error.message });
  } finally {
    cliente.release();
  }
});

app.listen(PUERTO, () => {
  console.log(`API de ${dominio.nombre} en el puerto ${PUERTO}`);
});
