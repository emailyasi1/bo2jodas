// Donde se guardan las cosas. Dos opciones, misma interfaz:
//
//   - Postgres, si existe DATABASE_URL (necesario en Render free y similares:
//     su disco se borra en cada reinicio). Una tabla clave/valor con JSONB.
//   - Archivos en DATA_DIR/<tipo>/<clave>.json (local, VPS con disco).
//
// Tipos que usa el servidor: "run" (partidas), "usuario" (cuentas), "config".
// Todo se carga en memoria al arrancar y cada cambio se escribe al momento.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CARPETAS = { run: "runs", usuario: "usuarios", config: "config" };

function claveSegura(clave) {
  const c = String(clave).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!c) throw new Error(`clave invalida: ${clave}`);
  return c;
}

// ---------------------------------------------------------------- archivos
function almacenArchivos(dataDir) {
  const carpeta = (tipo) => {
    const d = join(dataDir, CARPETAS[tipo] || tipo);
    mkdirSync(d, { recursive: true });
    return d;
  };
  return {
    nombre: `archivos en ${dataDir}`,
    async todos(tipo) {
      const d = carpeta(tipo);
      const lista = [];
      for (const f of readdirSync(d)) {
        if (!f.endsWith(".json")) continue;
        try {
          lista.push([f.slice(0, -5), JSON.parse(readFileSync(join(d, f), "utf8"))]);
        } catch (e) {
          console.warn(`${tipo} ilegible: ${f}: ${e.message}`);
        }
      }
      return lista;
    },
    async guardar(tipo, clave, datos) {
      const ruta = join(carpeta(tipo), `${claveSegura(clave)}.json`);
      writeFileSync(ruta + ".tmp", JSON.stringify(datos, null, 1));
      renameSync(ruta + ".tmp", ruta);
    },
    async borrar(tipo, clave) {
      const ruta = join(carpeta(tipo), `${claveSegura(clave)}.json`);
      if (existsSync(ruta)) unlinkSync(ruta);
    },
  };
}

// ---------------------------------------------------------------- postgres
async function almacenPostgres(url) {
  const { default: pg } = await import("pg");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const pool = new pg.Pool({
    connectionString: url,
    // Neon/Supabase/Render piden TLS; si la URL no dice nada, se activa.
    ssl: local || /sslmode=/.test(url) ? undefined : { rejectUnauthorized: true },
    max: 4,
    idleTimeoutMillis: 30_000,
  });
  pool.on("error", (e) => console.warn(`postgres: ${e.message}`));
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bo2jodas_datos (
      tipo        text        NOT NULL,
      clave       text        NOT NULL,
      datos       jsonb       NOT NULL,
      actualizado timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (tipo, clave)
    )`);
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "?";
    }
  })();
  return {
    nombre: `postgres en ${host}`,
    async todos(tipo) {
      const r = await pool.query("SELECT clave, datos FROM bo2jodas_datos WHERE tipo = $1", [tipo]);
      return r.rows.map((f) => [f.clave, f.datos]);
    },
    async guardar(tipo, clave, datos) {
      await pool.query(
        `INSERT INTO bo2jodas_datos (tipo, clave, datos) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (tipo, clave) DO UPDATE SET datos = EXCLUDED.datos, actualizado = now()`,
        [tipo, claveSegura(clave), JSON.stringify(datos)]
      );
    },
    async borrar(tipo, clave) {
      await pool.query("DELETE FROM bo2jodas_datos WHERE tipo = $1 AND clave = $2", [tipo, claveSegura(clave)]);
    },
  };
}

export async function crearAlmacen(dataDir) {
  const url = process.env.DATABASE_URL;
  if (url) return almacenPostgres(url);
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  migrarUsuariosViejos(dataDir);
  return almacenArchivos(dataDir);
}

// Las primeras pruebas guardaban todas las cuentas en un solo usuarios.json.
function migrarUsuariosViejos(dataDir) {
  const viejo = join(dataDir, "usuarios.json");
  if (!existsSync(viejo)) return;
  try {
    const obj = JSON.parse(readFileSync(viejo, "utf8"));
    const d = join(dataDir, CARPETAS.usuario);
    mkdirSync(d, { recursive: true });
    for (const [clave, u] of Object.entries(obj)) {
      const ruta = join(d, `${claveSegura(clave)}.json`);
      if (!existsSync(ruta)) writeFileSync(ruta, JSON.stringify(u, null, 1));
    }
    renameSync(viejo, viejo + ".migrado");
  } catch (e) {
    console.warn(`no se pudo migrar usuarios.json: ${e.message}`);
  }
}
