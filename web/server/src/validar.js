// Validacion de las partidas subidas.
//
// limpiar(p) devuelve { partida } con una copia que solo lleva los campos que
// escribe el mod (bo2jodas_stats.gsc), con su tipo y dentro de rango, o
// { error } con el motivo. Despues comprueba que los numeros cuadren entre si
// con las formulas del propio mod (nivel y bajas, zombies por ronda,
// duracion, huecos de carta, sumas de dano), para que editar un numero a mano
// no cuele. Los ids validos salen de catalogo.json (tools/generar_catalogo_web.py).

import { readFileSync } from "node:fs";

const CAT = JSON.parse(readFileSync(new URL("./catalogo.json", import.meta.url), "utf8"));
const CARTAS = CAT.cartas;
const MITICAS = new Set(CAT.miticas);
const CLASES = new Set(CAT.clases);
const ARQUETIPOS = new Set(CAT.arquetipos);
const FUENTES = new Set(CAT.fuentes);
const ARMAS = new Set(CAT.armas);
const JEFES = new Set(CAT.jefes);
const RAREZAS = new Set(CAT.rarezas);
const MOTIVOS = new Set(CAT.motivos_perdida);
const CFG = CAT.cfg;

// Hasta la 1.10.2 Pistolas tenia 5 huecos mas y el Buscador de botin llegaba
// al 15 %: las partidas de esas versiones se validan con sus limites.
const ANTES_1103 = { pistolas_huecos: 5, topes: { botin: 150 } };
const antesDe1103 = (v) => {
  const [a, b, c = 0] = String(v).split(".").map(Number);
  return a * 1e6 + b * 1e3 + c < 1010003;
};

// Campos de analisis (1.10.3): valores permitidos.
const CAUSAS = new Set(["zombie", "tanque", "brutus", "bruja", "leroy", "caida", "fuego", "propio", "explosion", "otro"]);
const PUNTOS = new Set(["clase", "cartas"]);
const GASTOS = new Set(["caja", "torreta", "bruja"]);
const TORRETA = new Set(["colocadas", "bajas", "roturas", "reparaciones", "morteros", "rebotes"]);
const TECNICO = new Set(["max_vivos", "atascos_recolocados", "atascos_muertos", "limpiezas_textos"]);
export const HITOS = ["30", "50", "100", "200"];

const MAX_INT = 2147483647; // los numeros del mod son enteros de 32 bits
const MAX_JUGADORES = 8;
const MAPA_PUEBLO = "zm_transit";

class Invalida extends Error {}
const fallo = (msg) => {
  throw new Invalida(msg);
};

// ---------------------------------------------------------------- tipos

function entero(v, que, min = 0, max = MAX_INT) {
  if (v === undefined || v === null) v = 0;
  if (typeof v !== "number" || !Number.isInteger(v)) fallo(`${que}: tiene que ser un número entero`);
  if (v < min || v > max) fallo(`${que} fuera de rango (${v}; de ${min} a ${max})`);
  return v;
}

function texto(v, que, max, patron) {
  if (v === undefined || v === null) v = "";
  if (typeof v === "number") v = String(v);
  if (typeof v !== "string") fallo(`${que}: tiene que ser un texto`);
  v = v.trim();
  if (v.length > max) fallo(`${que} demasiado largo (máximo ${max} caracteres)`);
  if (/[\u0000-\u001f\u007f]/.test(v)) fallo(`${que} tiene caracteres de control`);
  if (patron && v && !patron.test(v)) fallo(`${que} con formato no válido: "${v.slice(0, 40)}"`);
  return v;
}

function deLista(v, que, conjunto, vacio = true) {
  v = texto(v, que, 40);
  if (!v && vacio) return "";
  if (!conjunto.has(v)) fallo(`${que} desconocido: ${v}`);
  return v;
}

function tabla(v, que, claveValida, maxClaves = 250) {
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v)) fallo(`${que}: tiene que ser una tabla`);
  const claves = Object.keys(v);
  if (claves.length > maxClaves) fallo(`${que}: demasiadas entradas (${claves.length})`);
  const out = {};
  for (const k of claves) {
    if (!claveValida(k)) fallo(`${que}: clave desconocida: ${k.slice(0, 40)}`);
    out[k] = entero(v[k], `${que}.${k.slice(0, 40)}`);
  }
  return out;
}

function lista(v, que, max) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) fallo(`${que}: tiene que ser una lista`);
  if (v.length > max) fallo(`${que}: demasiados elementos (${v.length})`);
  return v;
}

const suma = (t) => Object.values(t).reduce((a, b) => a + b, 0);

// Lista de filas de enteros con un numero fijo de columnas ([[ronda, ...], ...]).
function filas(v, que, columnas, max) {
  return lista(v, que, max).map((f, i) => {
    if (!Array.isArray(f) || f.length !== columnas) fallo(`${que}: la fila ${i + 1} no tiene ${columnas} números`);
    return f.map((x) => entero(x, `${que} (fila ${i + 1})`, -MAX_INT));
  });
}

// Pone en out[clave] el campo si viene en la entrada (los JSON antiguos no lo traen).
function opcional(out, entrada, clave, fn) {
  if (entrada[clave] !== undefined && entrada[clave] !== null) out[clave] = fn(entrada[clave]);
}

// ---------------------------------------------------------------- formulas del mod

// Zombies que salen en una ronda (_zm::round_spawning + default_max_zombie_func
// del juego, x jodas_zombies_mult y +20 % por jugador por encima de 4).
function zombiesRonda(r, n) {
  let mult = Math.max(1, r / 5);
  if (r >= 10) mult *= r * 0.15;
  let max = 24 + (n === 1 ? Math.trunc(0.5 * 6 * mult) : Math.trunc((n - 1) * 6 * mult));
  if (r < 2) max = Math.trunc(max * 0.25);
  else if (r < 3) max = Math.trunc(max * 0.3);
  else if (r < 4) max = Math.trunc(max * 0.5);
  else if (r < 5) max = Math.trunc(max * 0.7);
  else if (r < 6) max = Math.trunc(max * 0.9);
  let m = CFG.zombies_mult;
  if (n > 4) m *= 1 + (n - 4) * CFG.zombies_extra_jugador;
  return Math.trunc(max * m);
}

function zombiesHasta(ronda, n) {
  let t = 0;
  for (let r = 1; r <= ronda; r++) t += zombiesRonda(r, n);
  return t;
}

// Nivel mas alto posible con estas bajas: el nivel L cuesta en total
// base*L + paso*L*(L-1)/2 bajas (jodas_al_matar).
function nivelMaximo(bajas) {
  const b = CFG.cartas_base;
  const p = CFG.cartas_paso;
  let L = 0;
  while (b * (L + 1) + (p * (L + 1) * L) / 2 <= bajas) L++;
  return L;
}

// ---------------------------------------------------------------- partida

function jugador(j, i, p) {
  if (!j || typeof j !== "object" || Array.isArray(j)) fallo(`jugador ${i + 1}: formato no válido`);
  const q = `jugador ${i + 1}`;
  const nombre = texto(j.nombre, `${q}: nombre`, 32);
  if (!nombre) fallo(`${q}: sin nombre`);
  const out = {
    nombre,
    clase: deLista(j.clase, `${nombre}: clase`, CLASES),
    arquetipo: deLista(j.arquetipo, `${nombre}: arquetipo`, ARQUETIPOS),
    mitica: deLista(j.mitica, `${nombre}: mítica`, MITICAS),
    nivel: entero(j.nivel, `${nombre}: nivel`, 0, 999),
    puntos_total: entero(j.puntos_total, `${nombre}: puntos totales`),
    puntos_final: entero(j.puntos_final, `${nombre}: puntos finales`),
    bajas: entero(j.bajas, `${nombre}: bajas`),
    cabezas: entero(j.cabezas, `${nombre}: bajas a la cabeza`),
    caidas: entero(j.caidas, `${nombre}: caídas`, 0, 100000),
    reanimaciones: entero(j.reanimaciones, `${nombre}: reanimaciones`, 0, 100000),
    max_combo: entero(j.max_combo, `${nombre}: combo máximo`, 0, 1000),
    danio_total: entero(j.danio_total, `${nombre}: daño total`),
    rerolls_usados: entero(j.rerolls_usados, `${nombre}: rerolls`, 0, 10000),
    bloqueos_usados: entero(j.bloqueos_usados, `${nombre}: bloqueos`, 0, 10000),
    saltos: entero(j.saltos, `${nombre}: saltos`, 0, 100000),
    bebidas_bruja: entero(j.bebidas_bruja, `${nombre}: bebidas de la Bruja`, 0, 10000),
    recuperadas: entero(j.recuperadas, `${nombre}: cartas recuperadas`, 0, 10000),
  };
  const armaValida = p.mapa === MAPA_PUEBLO ? (k) => ARMAS.has(k) : (k) => /^[a-z0-9_]{1,48}$/.test(k);
  out.danio_cartas = tabla(j.danio_cartas, `${nombre}: daño por carta`, (k) => FUENTES.has(k));
  out.danio_armas = tabla(j.danio_armas, `${nombre}: daño por arma`, armaValida);
  out.bajas_armas = tabla(j.bajas_armas, `${nombre}: bajas por arma`, armaValida);
  out.jefes_matados = tabla(j.jefes_matados, `${nombre}: jefes rematados`, (k) => JEFES.has(k));
  out.bebidas = lista(j.bebidas, `${nombre}: bebidas`, 20).map((b) => texto(b, `${nombre}: bebida`, 48, /^specialty_[a-z0-9_]+$/));

  const vistas = new Set();
  out.cartas = lista(j.cartas, `${nombre}: cartas`, 150).map((c) => {
    if (!c || typeof c !== "object") fallo(`${nombre}: carta con formato no válido`);
    const id = texto(c.id, `${nombre}: carta`, 40);
    const def = CARTAS[id];
    if (!def || def.tipo === "mitica") fallo(`${nombre}: carta desconocida: ${id}`);
    if (vistas.has(id)) fallo(`${nombre}: carta repetida: ${id}`);
    vistas.add(id);
    const valor = entero(c.valor, `${nombre}: valor de ${id}`, 1);
    const tope = antesDe1103(p.version) ? Math.max(def.tope, ANTES_1103.topes[id] || 0) : def.tope;
    if (valor > tope) fallo(`${nombre}: ${id} vale ${valor} y su tope es ${tope}`);
    return {
      id,
      nombre: texto(c.nombre, `${nombre}: nombre de ${id}`, 48),
      arquetipo: def.arquetipo,
      tipo: def.tipo,
      valor,
      veces: entero(c.veces, `${nombre}: veces de ${id}`, 0, 1000),
    };
  });
  out.historial = lista(j.historial, `${nombre}: historial`, 1000).map((h) => {
    if (!h || typeof h !== "object") fallo(`${nombre}: historial con formato no válido`);
    const id = texto(h.id, `${nombre}: carta del historial`, 40);
    if (!CARTAS[id]) fallo(`${nombre}: carta desconocida en el historial: ${id}`);
    const rareza = texto(h.rareza, `${nombre}: rareza`, 16);
    if (!RAREZAS.has(rareza)) fallo(`${nombre}: rareza desconocida: ${rareza}`);
    return { ronda: entero(h.ronda, `${nombre}: ronda del historial`, 0, p.ronda), id, rareza, valor: entero(h.valor, `${nombre}: valor del historial`) };
  });
  // Analisis (1.10.3)
  for (const k of ["desangrados", "clase_letales", "racha_max", "caja_usos"]) opcional(out, j, k, (v) => entero(v, `${nombre}: ${k}`));
  opcional(out, j, "danio_recibido", (v) => tabla(v, `${nombre}: daño recibido`, (k) => CAUSAS.has(k)));
  opcional(out, j, "puntos_fuente", (v) => tabla(v, `${nombre}: puntos por fuente`, (k) => PUNTOS.has(k)));
  opcional(out, j, "gastos", (v) => tabla(v, `${nombre}: gastos`, (k) => GASTOS.has(k)));
  opcional(out, j, "torretas", (v) => tabla(v, `${nombre}: torretas`, (k) => TORRETA.has(k)));
  for (const k of ["arma_tiempo", "disparos_armas", "impactos_armas", "cabezas_armas"]) opcional(out, j, k, (v) => tabla(v, `${nombre}: ${k}`, armaValida));
  opcional(out, j, "rondas", (v) => filas(v, `${nombre}: rondas`, 6, 300));
  opcional(out, j, "caidas_detalle", (v) => lista(v, `${nombre}: caídas`, 1000).map((c) => ({
    ronda: entero(c?.ronda, `${nombre}: ronda de la caída`, 0, p.ronda),
    causa: deLista(c?.causa, `${nombre}: causa de la caída`, CAUSAS),
    segundos: entero(c?.segundos, `${nombre}: segundos en el suelo`, 0, 86400),
    reanimo: texto(c?.reanimo, `${nombre}: quién reanimó`, 32),
    desangrado: entero(c?.desangrado, `${nombre}: desangrado`, 0, 1),
  })));
  opcional(out, j, "bebidas_ronda", (v) => lista(v, `${nombre}: bebidas por ronda`, 50).map((b) => ({
    ronda: entero(b?.ronda, `${nombre}: ronda de la bebida`, 0, p.ronda),
    id: texto(b?.id, `${nombre}: bebida`, 48, /^specialty_[a-z0-9_]+$/),
  })));
  opcional(out, j, "especiales", (v) => lista(v, `${nombre}: armas especiales`, 300).map((e) => {
    const arma = texto(e?.arma, `${nombre}: arma especial`, 48);
    if (!armaValida(arma)) fallo(`${nombre}: arma especial desconocida: ${arma}`);
    return { ronda: entero(e?.ronda, `${nombre}: ronda del arma especial`, 0, p.ronda), arma };
  }));
  out.cartas_perdidas = lista(j.cartas_perdidas, `${nombre}: cartas perdidas`, 500).map((c) => {
    if (!c || typeof c !== "object") fallo(`${nombre}: carta perdida con formato no válido`);
    const id = texto(c.id, `${nombre}: carta perdida`, 40);
    if (!CARTAS[id]) fallo(`${nombre}: carta perdida desconocida: ${id}`);
    const motivo = texto(c.motivo, `${nombre}: motivo`, 16);
    if (!MOTIVOS.has(motivo)) fallo(`${nombre}: motivo de pérdida desconocido: ${motivo}`);
    return { ronda: entero(c.ronda, `${nombre}: ronda de la carta perdida`, 0, p.ronda), id, motivo };
  });
  return out;
}

// Comprobaciones de coherencia con las formulas del mod.
function coherencia(p) {
  let bajasEquipo = 0;
  for (const j of p.jugadores) {
    const n = j.nombre;
    bajasEquipo += j.bajas;
    if (j.cabezas > j.bajas) fallo(`${n}: más bajas a la cabeza (${j.cabezas}) que bajas (${j.bajas})`);
    if (Object.keys(j.bajas_armas).length && suma(j.bajas_armas) !== j.bajas)
      fallo(`${n}: las bajas (${j.bajas}) no cuadran con las bajas por arma (${suma(j.bajas_armas)})`);
    if (suma(j.danio_armas) > j.danio_total + 1) fallo(`${n}: el daño por arma suma más que el daño total`);
    if (Object.keys(j.danio_cartas).length) {
      const sc = suma(j.danio_cartas);
      if (sc < j.danio_total * 0.97 - 1000 || sc > j.danio_total * 1.01 + 1000)
        fallo(`${n}: el reparto del daño (${sc}) no cuadra con el daño total (${j.danio_total})`);
    }
    // Nivel: con la carta Experiencia al tope cada baja cuenta x2.5, y la
    // Medalla sube niveles al momento (va en el historial con los niveles).
    const medallas = j.historial.filter((h) => h.id === "medalla").reduce((a, h) => a + h.valor, 0);
    const maxNivel = nivelMaximo(Math.floor(j.bajas * 2.5)) + medallas + 2;
    if (j.nivel > maxNivel) fallo(`${n}: nivel ${j.nivel} imposible con ${j.bajas} bajas (máximo ${maxNivel})`);
    // Huecos de carta: las de tipo normal (equipo, power-ups e instantaneas no gastan hueco).
    const huecos = j.cartas.filter((c) => c.tipo === "normal").length;
    const extra = antesDe1103(p.version) ? ANTES_1103.pistolas_huecos : CFG.pistolas_huecos;
    const maxHuecos = CFG.max_cartas + (j.clase === "pistolas" ? extra : 0);
    if (huecos > maxHuecos) fallo(`${n}: ${huecos} cartas ocupando hueco y su clase admite ${maxHuecos}`);
  }
  // Bajas del equipo frente a los zombies que han salido (con un jugador mas
  // por si alguno se fue a mitad, y un margen por jefes y escoltas).
  const n = Math.min(MAX_JUGADORES, p.jugadores.length + 1);
  const maxBajas = Math.ceil(zombiesHasta(p.ronda, n) * 1.3) + 50;
  if (bajasEquipo > maxBajas) fallo(`${bajasEquipo} bajas imposibles hasta la ronda ${p.ronda} (salen como mucho ${maxBajas} zombies)`);
  // Y por abajo: para pasar de ronda hay que matar a los zombies de las
  // anteriores. En partidas reales sale del 60 % (rondas bajas) al 95-100 %
  // (partidas largas); nukes y demas no cuentan como bajas del jugador, y en
  // cooperativo quien se va a mitad se lleva sus bajas. Se pide el 30 % hasta
  // la ronda 10, subiendo hasta el 65 % en la 25. Asi no cuela subir la ronda
  // a mano (de 41 a 50 o a 60, por ejemplo).
  const exigido = 0.3 + 0.35 * Math.min(1, Math.max(0, (p.ronda - 10) / 15));
  const minBajas = Math.floor(zombiesHasta(p.ronda - 1, p.jugadores.length) * exigido);
  if (bajasEquipo < minBajas) fallo(`${bajasEquipo} bajas son muy pocas para llegar a la ronda ${p.ronda} (hacen falta al menos ${minBajas})`);
  // Duracion: entre ronda y ronda hay 10 s de pausa y los zombies salen de uno
  // en uno (como mucho cada 0.08 s). Se pide la mitad, de margen.
  const minDur = (r) => Math.floor(((r - 1) * 10 + zombiesHasta(r - 1, 1) * 0.08) * 0.5);
  if (p.duracion_s < minDur(p.ronda)) fallo(`duración imposible: ${p.duracion_s} s para llegar a la ronda ${p.ronda} (mínimo ${minDur(p.ronda)} s)`);
  // Speedrun: el tiempo de llegada a cada ronda tiene que ser posible, ir en
  // orden y no pasar de la duracion de la partida.
  if (p.hitos) {
    let antes = 0;
    for (const k of HITOS) {
      if (p.hitos[k] === undefined) continue;
      const r = Number(k);
      if (r > p.ronda) fallo(`tiempo de la ronda ${r} en una partida que acabó en la ${p.ronda}`);
      if (p.hitos[k] > p.duracion_s) fallo(`el tiempo de la ronda ${r} pasa de la duración de la partida`);
      if (p.hitos[k] < antes) fallo("los tiempos de las rondas no van en orden");
      if (p.hitos[k] < minDur(r)) fallo(`tiempo imposible para llegar a la ronda ${r}: ${p.hitos[k]} s (mínimo ${minDur(r)} s)`);
      antes = p.hitos[k];
    }
  }
  // Jefes
  for (const t of JEFES) {
    const muertos = p.jefes_muertos[t] || 0;
    if (muertos > (p.jefes_aparecidos[t] || 0)) fallo(`jefes: más ${t} muertos que aparecidos`);
    const rematados = p.jugadores.reduce((a, j) => a + (j.jefes_matados[t] || 0), 0);
    if (rematados > muertos) fallo(`jefes: los jugadores rematan más ${t} (${rematados}) de los que mueren (${muertos})`);
  }
}

export function limpiar(entrada) {
  try {
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) fallo("cuerpo vacío o no es una partida");
    const p = {
      version: texto(entrada.version, "versión", 16, /^\d+\.\d+(\.\d+)?$/),
      id: texto(entrada.id, "id", 40, /^[A-Za-z0-9_-]+$/),
      mapa: texto(entrada.mapa, "mapa", 32, /^zm_[a-z0-9_]+$/),
      sitio: texto(entrada.sitio, "sitio", 32, /^[a-z0-9_]*$/),
      ronda: entero(entrada.ronda, "ronda", 1, 255),
      duracion_s: entero(entrada.duracion_s, "duración", 0, 7 * 24 * 3600),
      baston_construidos: entero(entrada.baston_construidos, "bastones construidos", 0, 1000),
      baston_forjados: entero(entrada.baston_forjados, "bastones forjados", 0, 1000),
    };
    if (!p.version) fallo("sin versión del mod");
    if (!p.id) fallo("sin id de partida");
    if (!p.mapa) fallo("sin mapa");
    // Analisis (1.10.3). terminada: 0 = punto de control de una partida sin acabar
    // (reinicio con map_restart / fast_restart o juego cerrado).
    p.terminada = entrada.terminada === undefined ? 1 : entero(entrada.terminada, "terminada", 0, 1);
    opcional(p, entrada, "primera_caida_ronda", (v) => entero(v, "ronda de la primera caída", 0, p.ronda));
    opcional(p, entrada, "fin", (v) => ({
      ronda: entero(v?.ronda, "ronda final", 0, 255),
      ultimo: texto(v?.ultimo, "último jugador", 32),
      causa: v?.causa ? deLista(v.causa, "causa del final", CAUSAS) : "",
    }));
    opcional(p, entrada, "hitos", (v) => tabla(v, "tiempos de ronda", (k) => HITOS.includes(k), 10));
    opcional(p, entrada, "rondas", (v) => filas(v, "rondas", 3, 300));
    opcional(p, entrada, "tecnico", (v) => tabla(v, "datos técnicos", (k) => TECNICO.has(k), 20));
    opcional(p, entrada, "jefes", (v) => lista(v, "jefes", 200).map((j) => {
      if (!j || typeof j !== "object") fallo("jefe con formato no válido");
      return {
        tipo: deLista(j.tipo, "tipo de jefe", JEFES, false),
        ronda: entero(j.ronda, "ronda del jefe", 0, p.ronda),
        segundos: entero(j.segundos, "segundos del jefe", 0, 7 * 24 * 3600),
        muerto: entero(j.muerto, "jefe muerto", 0, 1),
        remato: texto(j.remato, "quién remató al jefe", 32),
        robadas: entero(j.robadas, "cartas robadas", 0, 1000),
        recuperadas: entero(j.recuperadas, "cartas recuperadas", 0, 1000),
        toques: entero(j.toques, "toques de la Bruja", 0, 1000),
        danio: tabla(j.danio, "daño al jefe", (k) => k.length > 0 && k.length <= 32, 16),
      };
    }));
    opcional(p, entrada, "abandonos", (v) => lista(v, "abandonos", 64).map((a) => ({
      nombre: texto(a?.nombre, "jugador que se fue", 32),
      ronda: entero(a?.ronda, "ronda del abandono", 0, p.ronda),
    })));
    opcional(p, entrada, "dvars", (v) => {
      if (typeof v !== "object" || Array.isArray(v)) fallo("dvars: tiene que ser una tabla");
      const claves = Object.keys(v);
      if (claves.length > 100) fallo("dvars: demasiados");
      const out = {};
      for (const k of claves) {
        if (!/^jodas_[a-z0-9_]{1,40}$/.test(k)) fallo(`dvar desconocido: ${k.slice(0, 40)}`);
        out[k] = texto(v[k], `dvar ${k}`, 40);
      }
      return out;
    });
    p.jefes_aparecidos = tabla(entrada.jefes_aparecidos, "jefes aparecidos", (k) => JEFES.has(k));
    p.jefes_muertos = tabla(entrada.jefes_muertos, "jefes muertos", (k) => JEFES.has(k));
    const jugadores = lista(entrada.jugadores, "jugadores", MAX_JUGADORES);
    if (!jugadores.length) fallo("sin jugadores");
    p.jugadores = jugadores.map((j, i) => jugador(j, i, p));
    const nombres = new Set(p.jugadores.map((j) => j.nombre));
    if (nombres.size !== p.jugadores.length) fallo("hay dos jugadores con el mismo nombre");
    p.jugadores_n = entero(entrada.jugadores_n ?? p.jugadores.length, "número de jugadores", 1, MAX_JUGADORES);
    if (p.jugadores_n !== p.jugadores.length) fallo(`jugadores_n (${p.jugadores_n}) no coincide con los jugadores (${p.jugadores.length})`);
    // Fecha: la pone el subidor (fecha del archivo) o la web. Si no vale, se ignora.
    if (typeof entrada.fecha === "string") {
      const f = new Date(entrada.fecha);
      if (!Number.isNaN(f.getTime()) && f.getTime() < Date.now() + 86400000 && f.getFullYear() >= 2024) p.fecha = f.toISOString();
    }
    coherencia(p);
    return { partida: p };
  } catch (e) {
    if (e instanceof Invalida) return { error: e.message };
    throw e;
  }
}
