// Servidor de partidas de bo2jodas.
//
//   POST /api/runs                sube el JSON de una partida (cabecera x-token con el token de tu cuenta);
//                                 422 si nadie paso del nivel 10 (filtro de resets)
//   GET  /api/runs                lista de partidas (resumen), las mas recientes primero
//   GET  /api/runs/:id            una partida entera
//   DELETE /api/runs/:id          borra una partida (solo administradores)
//   GET  /api/revision            partidas en revision o rechazadas, con lo que fallo (administradores)
//   POST /api/runs/:id/revision   { accion: aprobar | rechazar | revisar, motivo } (administradores)
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
//   GET  /api/subida, /api/subida/ping   subida automatica desde el juego, en trozos (ver abajo)
//   GET  /api/subida/ver          ultimas notas de la subida (por que se guarda o no)
//   GET/DELETE /api/claves-juego  nombres ligados a una clave del juego (administradores)
//   GET  /api/eco/prueba, /api/eco/ver   prueba de peticiones desde el juego
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
import { revisar } from "./revision.js";
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
  const r = await recibirPartida(req.body, auth.nombre, req.claveSubida);
  res.status(r.estado).json(r.json);
}));

// Guarda una partida que llega del mod (POST /api/runs o la subida desde el juego,
// GET /api/subida). subidoPor: quien la subio (cuenta, o el nombre del anfitrion).
// Devuelve { estado, json } con la respuesta HTTP.
// El verificador no puede tumbar una subida: si falla, la partida queda en revision con el error.
function revisarSeguro(p) {
  try {
    return revisar(p);
  } catch (e) {
    console.error("revision:", e);
    return { estado: "en_revision", fecha: new Date().toISOString(),
      comprobaciones: [{ id: "error", ok: false, texto: `el verificador falló: ${String(e.message || e).slice(0, 200)}` }] };
  }
}

async function recibirPartida(cuerpo, subidoPor, claveSubida) {
  // Solo los campos que escribe el mod, con su tipo y rango, y que cuadren.
  // 422 y no 400: el rechazo es por los datos, que no van a cambiar, y el
  // script de subida apunta los 422 para no reintentarlos.
  const { partida: p, error } = limpiar(cuerpo);
  if (error) return { estado: 422, json: { error, rechazada: true } };
  // Resets (ronda < 10) y partidas de prueba (dvars cambiados) se guardan
  // marcadas: salen aparte y no cuentan para clasificaciones ni totales.
  p.categoria = categoria(p);
  p.prueba = esPrueba(p);
  if (p.terminada === undefined) p.terminada = 1;
  // Las que cuentan (ni reset ni prueba) se revisan con la calculadora (revision.js): si todo
  // cuadra quedan validadas; si no, "en revision" hasta que las mire un administrador.
  if (p.categoria !== "reset" && !p.prueba) p.revision = revisarSeguro(p);
  p.id_mod = p.id;
  const r = buscarRepetida(p);
  if (r.repetida) return { estado: 200, json: { ok: true, id: r.id, repetida: true } };
  // Puntos de control: el mod guarda la partida al acabar cada ronda con
  // terminada = 0. La version que llega despues sustituye a la sin terminar;
  // una sin terminar de una partida que ya esta (terminada o mas avanzada) se ignora.
  const mismas = [...partidas.values()].filter((x) => (x.id_mod || x.id) === p.id_mod);
  const masAvanzada = mismas.find((x) => x.terminada !== 0 || x.ronda > p.ronda || (x.ronda === p.ronda && x.duracion_s >= p.duracion_s));
  if (p.terminada === 0 && masAvanzada) return { estado: 200, json: { ok: true, id: masAvanzada.id, repetida: true } };
  for (const x of mismas.filter((x) => x.terminada === 0)) {
    await almacen.borrar("run", x.id);
    partidas.delete(x.id);
    console.log(`partida ${x.id} (sin terminar) sustituida por la nueva`);
  }
  p.id = r.id;
  p.recibido = new Date().toISOString();
  if (!p.fecha) p.fecha = p.recibido;
  // Quien la subio: la cuenta del token o de la sesion, o el anfitrion en la subida
  // desde el juego (lo que diga el JSON no cuenta).
  if (subidoPor) p.subido_por = subidoPor;
  await guardar(p);
  if (claveSubida) recientes(ventanas.nuevas, claveSubida).push(Date.now());
  console.log(`partida ${p.id}: ronda ${p.ronda}, ${p.jugadores.length} jugadores, ${p.mapa}, subida por ${p.subido_por || "?"}`);
  return { estado: 201, json: { ok: true, id: p.id } };
}

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
// Revision de partidas (administradores). Lista de las que no estan validadas, con lo que fallo.
app.get("/api/revision", (req, res) => {
  if (!usuarios.esAdmin(usuarios.deCookie(req))) return res.status(403).json({ error: "solo administradores" });
  const lista = [...partidas.values()].filter((p) => p.revision && p.revision.estado !== "validada")
    .sort((a, b) => String(b.recibido || b.fecha).localeCompare(String(a.recibido || a.fecha)))
    .map((p) => ({ ...resumen(p), detalle: p.revision }));
  res.json(lista);
});

// { accion: "aprobar" | "rechazar" | "revisar", motivo }: aprobar la valida a mano, rechazar
// la deja visible y marcada (no cuenta nunca), revisar vuelve a pasar el verificador.
app.post("/api/runs/:id/revision", asinc(async (req, res) => {
  const clave = usuarios.deCookie(req);
  if (!usuarios.esAdmin(clave)) return res.status(403).json({ error: "solo un administrador puede revisar partidas" });
  const p = partidas.get(req.params.id);
  if (!p) return res.status(404).json({ error: "no existe" });
  const accion = String((req.body && req.body.accion) || "");
  const motivo = String((req.body && req.body.motivo) || "").slice(0, 300);
  const quien = usuarios.publico(clave).usuario;
  if (accion === "revisar") p.revision = revisarSeguro(p);
  else if (accion === "aprobar" || accion === "rechazar") {
    p.revision = { ...(p.revision || { comprobaciones: [] }), estado: accion === "aprobar" ? "validada" : "rechazada",
      manual: { por: quien, fecha: new Date().toISOString(), motivo } };
  } else return res.status(400).json({ error: "accion: aprobar, rechazar o revisar" });
  await guardar(p);
  console.log(`partida ${p.id}: revision ${accion} por ${quien} -> ${p.revision.estado}`);
  res.json({ ok: true, revision: p.revision });
}));

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

// Prueba de la subida desde el juego (encargos_mod/json_upload_test/03): el mod pide
// /api/eco/prueba?... con Engine.Url_Load_Jpeg (WinINet del juego, agente "codpcexe").
// Se guardan en memoria las ultimas 20 (sin IP, solo el principio de la ruta) y se
// ven en /api/eco/ver. Contesta un JPEG de 1x1, que es lo que espera el juego.
const JPEG_1X1 = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxl" +
  "Z2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAABAAEDASIAAhEB" +
  "AxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS" +
  "0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKz" +
  "tLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgEC" +
  "BAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpj" +
  "ZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6" +
  "/9oADAMBAAIRAxEAPwDz+iiigD//2Q==", "base64");
const ecos = [];
app.get("/api/eco/prueba", (req, res) => {
  const agente = String(req.get("user-agent") || "").slice(0, 60);
  ecos.unshift({ hora: new Date().toISOString(), largo: req.originalUrl.length, agente, inicio: req.originalUrl.slice(0, 120) });
  ecos.length = Math.min(ecos.length, 20);
  console.log(`eco: ${req.originalUrl.length} caracteres, agente "${agente}"`);
  res.set("Cache-Control", "no-store").type("image/jpeg").send(JPEG_1X1);
});
app.get("/api/eco/ver", (_req, res) => res.set("Cache-Control", "no-store").json(ecos));

// ---------------------------------------------------------------- subida desde el juego
// encargos_mod/json_upload_test/03, Paso B. El Lua del mod (anfitrion) manda el JSON de la
// partida en trozos con GETs (Url_Load_Jpeg, la unica red que deja el juego en Plutonium):
//   /api/subida/ping                                       despierta la web (Render dormido)
//   /api/subida?k=clave&nom=anfitrion&id=&v=&n=&t=&d=      trozo n de t (base64url) de la version v
// Al juntar los t trozos de una version, pasa por recibirPartida como POST /api/runs.
// Identidad sin cuentas: la clave (24 caracteres, la genera el mod la primera vez y la guarda
// en el PC) se liga al nombre del anfitrion la primera vez que sube; despues ese nombre solo
// sube con esa clave. Se guarda el hash, no la clave. El anfitrion tiene que ser un jugador
// de la partida. Siempre se contesta un JPEG de 1x1 (el juego no lee la respuesta).
const clavesJuego = new Map(); // nombre en minusculas -> { nombre, hash, desde }
for (const [k, v] of await almacen.todos("clave_juego")) if (v && v.hash) clavesJuego.set(k, v);
const ensambles = new Map(); // `${hash}|${id}|${v}` -> { total, piezas, hora }
const RE_CLAVE = /^[a-z0-9]{24}$/;
const RE_ID = /^[A-Za-z0-9_.-]{1,64}$/;
const RE_B64 = /^[A-Za-z0-9_-]{0,1200}$/;
const PIEZAS_HORA = 3000;
const hashClave = (k) => createHash("sha256").update(k).digest("hex");
// Ultimas 60 notas de la subida (sin clave ni IP), en /api/subida/ver: para ver por que
// no se guarda una partida sin tener que mirar los logs de Render.
const notasSubida = [];
function nota(texto, datos) {
  console.log(`subida: ${texto}`);
  notasSubida.unshift({ hora: new Date().toISOString(), texto, ...(datos ? { datos } : {}) });
  notasSubida.length = Math.min(notasSubida.length, 60);
}
const enviarJpeg = (res) => res.set("Cache-Control", "no-store").type("image/jpeg").send(JPEG_1X1);

app.get("/api/subida/ping", (_req, res) => enviarJpeg(res));
app.get("/api/subida/ver", (_req, res) => res.set("Cache-Control", "no-store").json(notasSubida));

app.get("/api/subida", (req, res) => {
  enviarJpeg(res);
  procesarTrozo(req.query).catch((e) => console.error("subida:", e));
});

async function procesarTrozo(q) {
  const k = String(q.k || ""), nom = String(q.nom || "").trim(), id = String(q.id || ""), datos = String(q.d || "");
  const v = Number(q.v), n = Number(q.n), t = Number(q.t);
  const entero = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
  if (!RE_CLAVE.test(k) || !nom || nom.length > 40 || !RE_ID.test(id) || !RE_B64.test(datos)
      || !entero(v, 0, 1e6) || !entero(t, 1, 128) || !entero(n, 0, t - 1)) {
    return nota("trozo mal formado", { nom: nom.slice(0, 40), id: id.slice(0, 40), v: q.v, n: q.n, t: q.t,
      largo_d: datos.length, k_ok: RE_CLAVE.test(k), d_ok: RE_B64.test(datos) });
  }
  const h = hashClave(k);
  const quien = `juego:${h.slice(0, 16)}`;
  const intentos = recientes(ventanas.intentos, quien);
  if (intentos.length >= PIEZAS_HORA) return nota(`${nom} pasa de ${PIEZAS_HORA} trozos por hora`);
  intentos.push(Date.now());

  const clave = `${h}|${id}|${v}`;
  let e = ensambles.get(clave);
  if (!e) {
    for (const [c, x] of ensambles) if (Date.now() - x.hora > 3600_000) ensambles.delete(c);
    if (ensambles.size > 500) ensambles.clear();
    e = { total: t, piezas: new Array(t).fill(null), hora: Date.now() };
    ensambles.set(clave, e);
  }
  if (e.total !== t) return;
  e.piezas[n] = Buffer.from(datos, "base64url");
  nota(`trozo ${n + 1}/${t}`, { nom, id, v, largo_d: datos.length, bytes: e.piezas[n].length });
  if (e.piezas.some((x) => x === null)) return;
  ensambles.delete(clave);

  let cuerpo;
  try {
    cuerpo = JSON.parse(Buffer.concat(e.piezas).toString("utf8"));
  } catch {
    const texto = Buffer.concat(e.piezas).toString("latin1");
    return nota(`${nom} ${id} v${v}: el JSON juntado no es valido`, { bytes: texto.length,
      principio: texto.slice(0, 300), final: texto.slice(-200) });
  }
  const nombre = nom.toLowerCase();
  const ligada = clavesJuego.get(nombre);
  if (ligada && ligada.hash !== h) return nota(`"${nom}" esta ligado a otra clave (otro PC): rechazada`);
  const jugadores = Array.isArray(cuerpo && cuerpo.jugadores) ? cuerpo.jugadores : [];
  if (!jugadores.some((j) => String((j && j.nombre) || "").toLowerCase() === nombre)) {
    return nota(`${nom} no es jugador de la partida ${id}: rechazada`, { jugadores: jugadores.map((x) => x && x.nombre) });
  }
  const r = await recibirPartida(cuerpo, nom, quien);
  nota(`${nom}, ${id} v${v} (${t} trozos) -> ${r.estado}`, r.json);
  if (r.estado < 300 && !ligada) {
    const reg = { nombre: nom, hash: h, desde: new Date().toISOString() };
    await almacen.guardar("clave_juego", nombre, reg);
    clavesJuego.set(nombre, reg);
    nota(`"${nom}" ligado a su clave`);
  }
}

// Nombres ligados a una clave del juego (administradores): ver y soltar (cambio de PC).
app.get("/api/claves-juego", (req, res) => {
  if (!usuarios.esAdmin(usuarios.deCookie(req))) return res.status(403).json({ error: "solo administradores" });
  res.json([...clavesJuego.values()].map(({ nombre, desde }) => ({ nombre, desde })));
});
app.delete("/api/claves-juego/:nombre", asinc(async (req, res) => {
  const quien = usuarios.deCookie(req);
  if (!usuarios.esAdmin(quien)) return res.status(403).json({ error: "solo administradores" });
  const nombre = String(req.params.nombre).toLowerCase();
  if (!clavesJuego.has(nombre)) return res.status(404).json({ error: "no esta ligado" });
  await almacen.borrar("clave_juego", nombre);
  clavesJuego.delete(nombre);
  console.log(`subida: "${nombre}" soltado por ${usuarios.publico(quien).usuario}`);
  res.json({ ok: true });
}));

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
