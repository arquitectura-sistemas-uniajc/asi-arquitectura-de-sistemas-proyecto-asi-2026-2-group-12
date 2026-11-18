// Conexion a PostgreSQL. La cadena llega por variable de entorno (12-Factor, factor III):
// la misma imagen sirve en el portatil y en la nube; solo cambia la configuracion.
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;