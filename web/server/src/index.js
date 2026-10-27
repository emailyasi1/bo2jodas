// Servidor de partidas de bo2jodas.
//
//   POST /api/runs                sube el JSON de una partida (cabecera x-token con el token de tu cuenta);
//                                 422 si nadie paso del nivel 10 (filtro de resets)
//   GET  /api/runs                lista de partidas (resumen), las mas recientes primero
//   GET  /api/runs/:id            una partida entera
//   DELETE /api/runs/:id          borra una partida (solo administradores)
//   GET  /api/leaderboards        mejores rondas por jugador, clase y arquetipo, records y su historia
//   GET  /api/stats               totales del grupo
//   GET  /api/jugadores/:nombre   perfil de un jugador: totales, cartas favoritas y sus partidas
//   POST /api/auth/registro       { usuario, contrasena } -> crea la cuenta y entra
//   POST /api/auth/login          { usuario, contrasena } -> entra (cookie de sesion)
//   POST /api/auth/logout
//   GET  /api/auth/yo             quien soy + mi token de subida (32 caracteres)
//   POST /api/auth/token          genera un token nuevo (el viejo deja de valer)
//   POST /api/auth/contrasena     { actual, nueva }
//   GET  /api/descarga/info       ultima version del mod en GitHub (con sesion)
//   GET  /api/descarga            redirige al zip de la ultima version (con sesion; ver descarga.js)
//   GET  /api/salud               para el health check del hosting
//   /                             la web (client/dist)
//
// Partidas y cuentas van al almacen (almacen.js): Postgres si hay DATABASE_URL,
// si no archivos en DATA_DIR. Todo se mantiene en memoria: para un grupo de
// amigos sobra.

import express from "express";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resumen, leaderboards, totales, categoria, esPrueba, jugador } from "./partidas.js";
import { limpiar } from "./validar.js";
import { cargarTokens, comprobarToken } from "./tokens.js";
import { Usuarios } from "./usuarios.js";
import { crearAlmacen } from "./almacen.js";
import { descargaConfigurada, enlaceZip, ultimaVersion } from "./descarga.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "..", "data");
const CLIENT_DIR = process.env.CLIENT_DIR || join(__dirname, "..", "..", "client", "dist");

const almacen = await crearAlmacen(DATA_DIR);
const TOKENS = cargarTokens(DATA_DIR); // tokens sueltos del administrador (opcional)
const usuarios = await Usuarios.crear(almacen);

// ---------------------------------------------------------------- partidas
const partidas = new Map();
for (const [, p] of await almacen.todos("run")) if (p && p.id) partidas.set(p.id, p);
console.log(`${partidas.size} partidas y ${usuarios.total} cuentas cargadas (${almacen.nombre})`);

// Huella de los datos clave de una partida (no cuenta lo que anaden el subidor
// o la web, como la fecha o quien la subio).
function huella(p) {
  const clave = {
    version: p.version,
    mapa: p.mapa,
    ronda: p.ronda,
    duracion_s: p.duracion_s,
    jugadores: [...p.jugadores]
      .map((j) => [j.nombre, j.nivel, j.bajas, j.puntos_total, j.danio_total])
      .sort((a, b) => (a[0] < b[0] ? -1 : 1)),
  };
  return createHash("sha1").update(JSON.stringify(clave)).digest("hex").slice(0, 10);
}

// El id que se guarda es el del mod + la huella: una partida falsa con el id de
// otra real ya no la "ocupa" (cae en otro id), y la misma partida subida dos
// veces sigue siendo la misma. Las guardadas antes (solo con el id del mod)
// cuentan como repetidas si tienen la misma huella.
function buscarRepetida(p) {
  const id = `${p.id}-${huella(p)}`;
  if (partidas.has(id)) return { id, repetida: true };
  const vieja = partidas.get(p.id);
  if (vieja && huella(vieja) === huella(p)) return { id: p.id, repetida: true };
  return { id, repetida: false };
}

// Limites de subida, por cuenta (o por IP sin cuenta), en la ultima hora:
// - NUEVAS_HORA partidas guardadas. Solo gasta lo que se guarda: las repetidas,
//   las sin terminar que no aportan y las rechazadas no cuentan.
// - INTENTOS_HORA peticiones en total, contra inundaciones. Se corta antes de
//   leer el cuerpo y se dice cuanto esperar (Retry-After).
// Antes contaba cada intento: un JSON rechazado que el script reintentaba cada
// 10 s gastaba el cupo en minutos y bloqueaba tambien las partidas buenas.
const NUEVAS_HORA = 60;
const INTENTOS_HORA = 600;
const ventanas = { nuevas: new Map(), intentos: new Map() };
function recientes(mapa, quien) {
  const ahora = Date.now();
  const lista = (mapa.get(quien) || []).filter((t) => ahora - t < 3600_000);
  mapa.set(quien, lista);
  if (mapa.size > 5000) mapa.clear();
  return lista;
}

async function guardar(p) {
  await almacen.guardar("run", p.id, p);
  partidas.set(p.id, p);
}

// Las rutas async pasan sus errores a express (express 4 no lo hace solo).
const asinc = (f) => (req, res, siguiente) => Promise.resolve(f(req, res, siguiente)).catch(siguiente);

// Quien puede subir: token de una cuenta (x-token), sesion de la web, o un token
// suelto del administrador. Devuelve { ok, nombre } .
function autorizarSubida(req) {
  const token = req.get("x-token");
  const dueno = usuarios.duenoDelToken(token);
  if (dueno) return { ok: true, nombre: dueno };
  const clave = usuarios.deCookie(req);
  if (clave) return { ok: true, nombre: usuarios.publico(clave).usuario };
  return comprobarToken(TOKENS, token);
}

// ---------------------------------------------------------------- API
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // detras de Caddy: req.ip y req.secure reales
// Freno de subidas antes de leer el cuerpo (hasta 1 MB): asi un cliente que
// reintenta sin parar no cuesta nada.
app.use("/api/runs", (req, res, siguiente) => {
  if (req.method !== "POST" || req.path !== "/") return siguiente();
  const auth = autorizarSubida(req);
  const quien = auth.ok && auth.nombre ? `cuenta:${auth.nombre.toLowerCase()}` : `ip:${req.ip}`;
  const intentos = recientes(ventanas.intentos, quien);
  const nuevas = recientes(ventanas.nuevas, quien);
  const lleno = intentos.length >= INTENTOS_HORA ? intentos : nuevas.length >= NUEVAS_HORA ? nuevas : null;
  if (lleno) {
    const segundos = Math.max(1, Math.ceil((lleno[0] + 3600_000 - Date.now()) / 1000));
    res.set("Retry-After", String(segundos));
    const que = lleno === nuevas ? `${NUEVAS_HORA} partidas nuevas por hora` : `${INTENTOS_HORA} intentos por hora`;
    return res.status(429).json({ error: `demasiadas subidas (como mucho ${que}): prueba en ${Math.ceil(segundos / 60)} min`, reintentar_s: segundos });
  }
  intentos.push(Date.now());
  req.claveSubida = quien;
  siguiente();
});
app.use(express.json({ limit: "1mb" }));

app.post("/api/runs", asinc(async (req, res) => {
  const auth = autorizarSubida(req);
  if (!auth.ok) return res.status(401).json({ error: "token incorrecto: registrate en la web y copia el token de tu perfil" });
  // Solo los campos que escribe el mod, con su tipo y rango, y que cuadren.
  // 422 y no 400: el rechazo es por los datos, que no van a cambiar, y el
  // script de subida apunta los 422 para no reintentarlos.
  const { partida: p, error } = limpiar(req.body);
  if (error) return res.status(422).json({ error, rechazada: true });
  // Resets (ronda < 10) y partidas de prueba (dvars cambiados) se guardan
  // marcadas: salen aparte y no cuentan para clasificaciones ni totales.
  p.categoria = categoria(p);
  p.prueba = esPrueba(p);
  if (p.terminada === undefined) p.terminada = 1;
  p.id_mod = p.id;
  const r = buscarRepetida(p);
  if (r.repetida) return res.json({ ok: true, id: r.id, repetida: true });
  // Puntos de control: el mod guarda la partida al acabar cada ronda con
  // terminada = 0. La version que llega despues sustituye a la sin terminar;
  // una sin terminar de una partida que ya esta (terminada o mas avanzada) se ignora.
  const mismas = [...partidas.values()].filter((x) => (x.id_mod || x.id) === p.id_mod);
  const masAvanzada = mismas.find((x) => x.terminada !== 0 || x.ronda > p.ronda || (x.ronda === p.ronda && x.duracion_s >= p.duracion_s));
  if (p.terminada === 0 && masAvanzada) return res.json({ ok: true, id: masAvanzada.id, repetida: true });
  for (const x of mismas.filter((x) => x.terminada === 0)) {
    await almacen.borrar("run", x.id);
    partidas.delete(x.id);
    console.log(`partida ${x.id} (sin terminar) sustituida por la nueva`);
  }
  p.id = r.id;
  p.recibido = new Date().toISOString();
  if (!p.fecha) p.fecha = p.recibido;
  // Quien la subio: la cuenta del token o de la sesion (lo que diga el JSON no cuenta).
  if (auth.nombre) p.subido_por = auth.nombre;
  await guardar(p);
  if (req.claveSubida) recientes(ventanas.nuevas, req.claveSubida).push(Date.now());
  console.log(`partida ${p.id}: ronda ${p.ronda}, ${p.jugadores.length} jugadores, ${p.mapa}, subida por ${p.subido_por || "?"}`);
  res.status(201).json({ ok: true, id: p.id });
}));

app.get("/api/runs", (req, res) => {
  const limite = Math.min(Number(req.query.limit) || 100, 1000);
  // ?categoria=reset: solo los resets; si no, todas menos los resets.
  const resets = req.query.categoria === "reset";
  const lista = [...partidas.values()]
    .map(resumen)
    .filter((p) => (p.categoria === "reset") === resets)
    .sort((a, b) => (b.fecha > a.fecha ? 1 : b.fecha < a.fecha ? -1 : 0))
    .slice(0, limite);
  res.json(lista);
});

app.get("/api/runs/:id", (req, res) => {
  const p = partidas.get(req.params.id);
  if (!p) return res.status(404).json({ error: "no existe" });
  res.json(p);
});

// Borrar una partida mal subida: desaparece de la lista, la clasificacion, los
// records y los perfiles (todo se calcula a partir de las partidas). Queda una
// linea en el almacen (tipo "borrado") con que se borro, quien y cuando.
app.delete("/api/runs/:id", asinc(async (req, res) => {
  const clave = usuarios.deCookie(req);
  if (!usuarios.esAdmin(clave)) return res.status(403).json({ error: "solo un administrador puede borrar partidas" });
  const p = partidas.get(req.params.id);
  if (!p) return res.status(404).json({ error: "no existe" });
  await almacen.borrar("run", p.id);
  partidas.delete(p.id);
  const quien = usuarios.publico(clave).usuario;
  await almacen.guardar("borrado", `${p.id}-${Date.now()}`, {
    id: p.id, ronda: p.ronda, fecha: p.fecha, subido_por: p.subido_por || null,
    jugadores: p.jugadores.map((j) => j.nombre), borrado_por: quien, borrado: new Date().toISOString(),
  });
  console.log(`partida ${p.id} borrada por ${quien}`);
  res.json({ ok: true });
}));

app.get("/api/leaderboards", (_req, res) => {
  res.json(leaderboards([...partidas.values()]));
});

app.get("/api/stats", (_req, res) => {
  res.json(totales([...partidas.values()]));
});

app.get("/api/jugadores/:nombre", (req, res) => {
  const j = jugador([...partidas.values()], req.params.nombre);
  if (!j) return res.status(404).json({ error: "no existe" });
  res.json(j);
});

// ---------------------------------------------------------------- cuentas
function perfil(clave) {
  const u = usuarios.publico(clave);
  u.subidas = [...partidas.values()].filter((p) => p.subido_por === u.usuario).length;
  return u;
}

// Como mucho CUENTAS_DIA cuentas nuevas por IP cada 24 horas.
const CUENTAS_DIA = 3;
const registros = new Map(); // ip -> [instantes]
function registrosRecientes(ip) {
  const lista = (registros.get(ip) || []).filter((t) => Date.now() - t < 86400_000);
  registros.set(ip, lista);
  if (registros.size > 5000) registros.clear();
  return lista;
}

app.post("/api/auth/registro", asinc(async (req, res) => {
  if (usuarios.frenado(req.ip)) return res.status(429).json({ error: "demasiados intentos, espera 10 minutos" });
  if (registrosRecientes(req.ip).length >= CUENTAS_DIA)
    return res.status(429).json({ error: `como mucho ${CUENTAS_DIA} cuentas nuevas por conexión al día` });
  const { usuario, contrasena } = req.body || {};
  const r = await usuarios.registrar(usuario, contrasena);
  if (r.error) {
    usuarios.fallo(req.ip);
    return res.status(400).json({ error: r.error });
  }
  registros.get(req.ip).push(Date.now());
  const clave = usuario.toLowerCase();
  usuarios.ponerCookie(req, res, clave);
  console.log(`cuenta nueva: ${usuario}`);
  res.status(201).json(perfil(clave));
}));

app.post("/api/auth/login", (req, res) => {
  if (usuarios.frenado(req.ip)) return res.status(429).json({ error: "demasiados intentos, espera 10 minutos" });
  const { usuario, contrasena } = req.body || {};
  const r = usuarios.entrar(usuario, contrasena);
  if (r.error) {
    usuarios.fallo(req.ip);
    return res.status(401).json({ error: r.error });
  }
  const clave = String(usuario).toLowerCase();
  usuarios.ponerCookie(req, res, clave);
  res.json(perfil(clave));
});

app.post("/api/auth/logout", (_req, res) => {
  usuarios.quitarCookie(res);
  res.json({ ok: true });
});

function conSesion(req, res, siguiente) {
  const clave = usuarios.deCookie(req);
  if (!clave) return res.status(401).json({ error: "no has entrado" });
  req.clave = clave;
  siguiente();
}

app.get("/api/auth/yo", conSesion, (req, res) => res.json(perfil(req.clave)));

app.post("/api/auth/token", conSesion, asinc(async (req, res) => {
  await usuarios.regenerarToken(req.clave);
  res.json(perfil(req.clave));
}));

app.post("/api/auth/contrasena", conSesion, asinc(async (req, res) => {
  const { actual, nueva } = req.body || {};
  const r = await usuarios.cambiarContrasena(req.clave, actual, nueva);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
}));

// Descarga del mod: solo con sesion (el repo es privado).
app.get("/api/descarga/info", conSesion, async (_req, res) => {
  if (!descargaConfigurada()) return res.status(503).json({ error: "la descarga no está configurada en el servidor (falta GITHUB_TOKEN)" });
  try {
    const v = await ultimaVersion();
    res.json({ version: v.version, nombre: v.nombre, tamano: v.tamano, fecha: v.fecha });
  } catch (e) {
    console.error("descarga:", e.message);
    res.status(502).json({ error: "no se pudo consultar GitHub, prueba en un rato" });
  }
});

app.get("/api/descarga", conSesion, async (_req, res) => {
  if (!descargaConfigurada()) return res.status(503).type("text").send("La descarga no está configurada en el servidor (falta GITHUB_TOKEN).");
  try {
    res.redirect(302, await enlaceZip());
  } catch (e) {
    console.error("descarga:", e.message);
    res.status(502).type("text").send("No se pudo pedir el zip a GitHub, prueba en un rato.");
  }
});

app.get("/api/salud", (_req, res) => res.json({ ok: true, partidas: partidas.size, cuentas: usuarios.total }));

// JSON mal formado o fallo al guardar: respuesta JSON en vez de la pagina de error de express.
app.use("/api", (err, _req, res, _siguiente) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "JSON mal formado" });
  // 422: igual que un rechazo por datos, para que el script no lo reintente.
  if (err.type === "entity.too.large") return res.status(422).json({ error: "archivo demasiado grande (como mucho 1 MB)", rechazada: true });
  console.error(err);
  res.status(500).json({ error: "error del servidor al guardar, prueba otra vez" });
});

// ---------------------------------------------------------------- web
if (existsSync(CLIENT_DIR)) {
  app.use(express.static(CLIENT_DIR, { maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(CLIENT_DIR, "index.html")));
} else {
  app.get("/", (_req, res) => res.type("text").send("bo2jodas: falta la web compilada (client/dist). La API funciona en /api."));
}

app.listen(PORT, () =>
  console.log(`bo2jodas web en http://localhost:${PORT} (${TOKENS.size} tokens sueltos${process.env.UPLOAD_OPEN === "1" ? ", subida abierta" : ""})`)
);
