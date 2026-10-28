// Revision de las partidas validas (las que no son reset ni de prueba).
//
// validar.js ya comprueba que el JSON tenga la forma del mod y que los numeros
// cuadren entre si. Aqui se rehacen las cuentas con la calculadora de la web
// (web/client/src/calc/motor.js y calculadora.json, los mismos archivos que usa
// la pagina /calculadora) para ver si la partida es posible con las reglas del
// mod. Si todas las comprobaciones pasan, la partida queda "validada" (cuenta en
// clasificaciones y records); si alguna falla, queda "en revision" hasta que la
// mire un administrador, con la lista de lo que fallo.
//
// HAY QUE ACTUALIZARLO CON CADA PARCHE QUE TOQUE CARTAS, ARMAS, VIDA, PUNTOS O EL
// JSON DEL MOD (ver CHECKLIST_PARCHE.md en la raiz del proyecto).
//
// Margen: MARGEN (15 %) sobre cada cota, por lo que el JSON no recoge (remates,
// nukes, puntos de reparar, el azar de los tanques). Las cotas son superiores:
// una partida legal no deberia pasarlas nunca; las cifras infladas a mano, si.

import { vidaPorRonda, danioSaliente, CARTAS, DATOS } from "../../client/src/calc/motor.js";
import { zombiesRonda, nivelMaximo, numVersion } from "./validar.js";

const CFG = DATOS.cfg;
export const MARGEN = 1.15;
export const VERSION_REVISION = 1; // sube si cambian las comprobaciones (para volver a revisar)

// Puntos del juego (_zm.gsc zombie_score_*, _zm_score::player_add_points).
const PUNTOS_BAJA_MAX = 50 + 80; // baja + extra de cuchillo (la cabeza da 50, menos)
const PUNTOS_IMPACTO_MAX = 12.5; // 10 por impacto (x1.25 apuntando)
const PUNTOS_RONDA_EXTRA = 2 * (500 + 400); // reparar ventanas (tope 500 por ronda) + nuke, con dobles
// Dobles: no duran toda la partida, y la cota ya es holgada (toda baja a cuchillo, todo impacto
// apuntando, reparar al tope y una nuke cada ronda). Calibrado con 61 partidas reales
// (2026-10-28): con 1.0 la que mas se acerca llega al 48 % de la cota y puntos x3 se pilla 28/28.
const DOBLES = 1.0;

// Dificultad de la ronda r (dificultad_rondas: [ronda, %] cuando cambia).
function dificultadEn(p, r) {
  let d = 0;
  for (const [ronda, pct] of p.dificultad_rondas || []) if (ronda <= r) d = pct;
  return Math.max(d, 0);
}

// Parte de los zombies de una ronda que andan (no corren): _zm_utility::set_run_speed,
// randomintrange( v, v + 35 ) <= 35 anda, con v = zombie_move_speed = ronda x 8. En los
// datos reales cuadra con la ronda anterior (el juego la actualiza despues de sacar los
// primeros): ronda 3 ~57 %, 4 ~34 %, 5 ~11 %, 6 en adelante 0.
function andan(r) {
  const v = Math.max(1, (r - 1) * 8);
  return Math.min(1, Math.max(0, (36 - v) / 35));
}

// Vida media maxima de los zombies de una ronda: vida x dificultad (1 + D/200), y tanques
// (x tanque_vida) desde tanque_ronda: TODOS los que andan (bo2jodas.gsc jodas_zombie_init:
// lento -> jodas_hacer_tanque) y tanque_pct + D/4 % de los demas. Cota alta para el azar
// (pocas bajas por ronda al principio): x1.5 los que andan y x2 la probabilidad.
function vidaMediaMax(p, r) {
  const d = dificultadEn(p, r);
  const vida = vidaPorRonda(r) * (1 + d / 200);
  if (r < CFG.tanque_ronda) return vida;
  const prob = Math.min(1, (2 * (CFG.tanque_pct + Math.trunc(d / 4))) / 100);
  const lentos = Math.min(1, andan(r) * 1.5);
  const tanques = Math.min(1, lentos + (1 - lentos) * prob);
  return vida * (1 + tanques * (CFG.tanque_vida - 1));
}

// Jugadores para contar zombies: los de la partida (+1 por si alguno se fue).
const jugadoresN = (p) => Math.min(8, Math.max(p.jugadores_n || 0, p.jugadores.length) + ((p.abandonos || []).length ? 1 : 0));

function zombiesDeRonda(p, r) {
  return zombiesRonda(r, jugadoresN(p)) * (1 + dificultadEn(p, r) / 100);
}

// Valor mas alto que ha podido tener cada carta: el de al acabar (v100 = exacto) o la suma
// de todo lo que cogio de ella (historial), porque al caer se pierden cartas y el valor del
// final puede ser menor que el que tuvo casi toda la partida.
function valoresCartas(j) {
  const v = {};
  for (const c of j.cartas || []) v[c.id] = c.v100 !== undefined ? c.v100 / 100 : c.valor;
  const cogido = {};
  for (const h of j.historial || []) cogido[h.id] = (cogido[h.id] || 0) + (h.v100 !== undefined ? h.v100 / 100 : h.valor || 0);
  for (const [id, x] of Object.entries(cogido)) v[id] = Math.max(v[id] || 0, x);
  return v;
}

// Maximo de cada carta en un golpe (motor.danioSaliente con todas las situaciones a favor):
// sumandos = % que suma, factores = multiplicador. Se prueba bala a la cabeza a un tanque,
// explosivo y cuchillo, y se queda el mayor de cada carta.
function maximosCartas(j) {
  const build = {
    clase: j.clase,
    mitica: j.mitica,
    v: valoresCartas(j),
    sit: {
      junto_dt: false, racha: 1e6, media_vida: true, apuntando: true, cargador_bajo: true,
      combo: Math.max(10, j.max_combo || 0), furia: 50, ultimo_aliento: true, pulso: true, rafaga: true,
      plomo: 1e6, solo: true, madrugador: true, puntos: 1e9, bebidas: 8, quieto: true, lejos: false,
    },
  };
  const zombie = { vida: 1e9, vidaMax: 1e9, jefe: false, tanque: true };
  const golpes = [
    { mod: "MOD_RIFLE_BULLET", cabeza: true, arma: "x", zombie },
    { mod: "MOD_GRENADE_SPLASH", cabeza: false, arma: "x", zombie, granada_letal: true },
    { mod: "MOD_MELEE", cabeza: false, arma: "x", zombie },
  ];
  const pct = {};
  const fac = {};
  for (const g of golpes) {
    const r = danioSaliente(1000, g, build, { critico: "siempre" });
    for (const [k, x] of Object.entries(r.sumandos || {})) pct[k] = Math.max(pct[k] || 0, x);
    for (const [k, x] of Object.entries(r.factores || {})) fac[k] = Math.max(fac[k] || 0, x);
  }
  // Escopetas al jefe: x3 de clase (factor "clase").
  if (j.clase === "escopetas") fac.clase = Math.max(fac.clase || 0, 3);
  return { pct, fac };
}

// Devuelve { estado: "validada" | "en_revision", comprobaciones: [{ id, ok, texto, esperado?, real? }] }.
export function revisar(p) {
  const res = [];
  const anotar = (id, ok, texto, esperado, real) =>
    res.push({ id, ok, texto, ...(esperado !== undefined ? { esperado: Math.round(esperado) } : {}), ...(real !== undefined ? { real: Math.round(real) } : {}) });
  const conRondas = p.jugadores.every((j) => Array.isArray(j.rondas) && j.rondas.length);

  // 1) Bajas de cada ronda (equipo) <= zombies que salen en esa ronda (+ escoltas de jefe).
  if (conRondas) {
    const jefesRonda = {};
    for (const jf of p.jefes || []) jefesRonda[jf.ronda] = (jefesRonda[jf.ronda] || 0) + 1 + (CFG.jefe_escoltas || 4);
    let peor = null;
    let mejor = { esperado: 1, real: 0 };
    for (let r = 1; r <= p.ronda; r++) {
      const bajas = p.jugadores.reduce((a, j) => a + j.rondas.filter((f) => f[0] === r).reduce((b, f) => b + f[1], 0), 0);
      const max = zombiesDeRonda(p, r) * MARGEN + (jefesRonda[r] || 0) + 2;
      if (bajas > max && (!peor || bajas - max > peor.real - peor.esperado)) peor = { r, esperado: max, real: bajas };
      if (bajas / max > mejor.real / mejor.esperado) mejor = { esperado: max, real: bajas };
    }
    if (peor) anotar("bajas_ronda", false, `ronda ${peor.r}: más bajas de las que salen`, peor.esperado, peor.real);
    else anotar("bajas_ronda", true, "bajas de cada ronda posibles", mejor.esperado, mejor.real);
  }

  // 2) Daño acumulado del equipo <= vida de los zombies que han salido (el mod no cuenta
  //    más daño que la vida que le queda al zombie: jodas_stats_impacto) + daño a jefes.
  if (conRondas) {
    // Jefes: con la lista (1.10.10+) su vida entera (x jefe_vida, ...) en su ronda; sin ella
    // (versiones viejas), los aparecidos desde la ronda en que pueden salir (CFG.jefe_ronda o 3).
    // Cada jefe trae escoltas (tanques).
    const jefesPorRonda = {};
    if (Array.isArray(p.jefes) && p.jefes.length) for (const jf of p.jefes) (jefesPorRonda[jf.ronda] ||= []).push(jf.tipo);
    else {
      const desde = Math.min(p.ronda, CFG.jefe_ronda || 3);
      for (const [t, k] of Object.entries(p.jefes_aparecidos || {})) for (let i = 0; i < k; i++) (jefesPorRonda[desde] ||= []).push(t);
    }
    const vidaJefe = (t) => CFG[`${t === "brutus" ? "jefe" : t}_vida`] || CFG.jefe_vida || 70;
    let tope = 0;
    let real = 0;
    let peor = null;
    let mejor = { esperado: 1, real: 0 };
    const vidaFinal = vidaPorRonda(p.ronda) * (1 + dificultadEn(p, p.ronda) / 200);
    for (let r = 1; r <= p.ronda; r++) {
      const vida = vidaPorRonda(r) * (1 + dificultadEn(p, r) / 200);
      tope += zombiesDeRonda(p, r) * vidaMediaMax(p, r);
      // El jefe vive mas de una ronda: se cuenta con la vida de la ronda final (cota alta).
      for (const t of jefesPorRonda[r] || []) tope += vidaFinal * vidaJefe(t) + (CFG.jefe_escoltas || 4) * vida * CFG.tanque_vida;
      real += p.jugadores.reduce((a, j) => a + j.rondas.filter((f) => f[0] === r).reduce((b, f) => b + f[3], 0), 0);
      const max = tope * MARGEN;
      if (real > max && !peor) peor = { r, esperado: max, real };
      if (real / max > mejor.real / mejor.esperado) mejor = { esperado: max, real };
    }
    if (peor) anotar("danio_vida", false, `hasta la ronda ${peor.r}: más daño que la vida de todos los zombies que han salido`, peor.esperado, peor.real);
    else anotar("danio_vida", true, "daño posible con la vida de los zombies", mejor.esperado, mejor.real);

    // Lo mismo ronda a ronda (una ronda inflada no se esconde en el total): la vida de la
    // ronda, mas los jefes que pueden seguir vivos (salidos en esa ronda o en las 3 anteriores).
    let peorR = null;
    let mejorR = { esperado: 1, real: 0 };
    for (let r = 1; r <= p.ronda; r++) {
      const vida = vidaPorRonda(r) * (1 + dificultadEn(p, r) / 200);
      let max = zombiesDeRonda(p, r) * vidaMediaMax(p, r);
      for (let q = Math.max(1, r - 3); q <= r; q++)
        for (const t of jefesPorRonda[q] || []) max += vidaFinal * vidaJefe(t) + (CFG.jefe_escoltas || 4) * vida * CFG.tanque_vida;
      max = max * MARGEN + 2 * vida * 24; // + los que quedan a medias de la ronda anterior
      const d = p.jugadores.reduce((a, j) => a + j.rondas.filter((f) => f[0] === r).reduce((b, f) => b + f[3], 0), 0);
      if (d > max && !peorR) peorR = { r, esperado: max, real: d };
      if (d / max > mejorR.real / mejorR.esperado) mejorR = { esperado: max, real: d };
    }
    if (peorR) anotar("danio_ronda", false, `ronda ${peorR.r}: más daño que la vida de los zombies de esa ronda`, peorR.esperado, peorR.real);
    else anotar("danio_ronda", true, "daño de cada ronda posible", mejorR.esperado, mejorR.real);
  }

  for (const j of p.jugadores) {
    const n = j.nombre;

    // 3) Nivel de cada ronda <= el posible con las bajas que lleva (con Experiencia al tope,
    //    dificultad y medallas hasta esa ronda), como validar.js pero ronda a ronda.
    if (Array.isArray(j.rondas) && j.rondas.length) {
      let bajas = 0;
      let peor = null;
      let mejor = { esperado: 1, real: 0 };
      for (const f of j.rondas) {
        bajas += f[1];
        const medallas = (j.historial || []).filter((h) => h.id === "medalla" && h.ronda <= f[0]).reduce((a, h) => a + h.valor, 0);
        const max = nivelMaximo(Math.floor(bajas * 2.5 * (1 + dificultadEn(p, f[0]) / 100))) + medallas + 2;
        if (f[5] > max && !peor) peor = { r: f[0], esperado: max, real: f[5] };
        if (max > 0 && f[5] / max > mejor.real / mejor.esperado) mejor = { esperado: max, real: f[5] };
      }
      if (peor) anotar(`nivel:${n}`, false, `${n}: nivel imposible en la ronda ${peor.r} con sus bajas`, peor.esperado, peor.real);
      else anotar(`nivel:${n}`, true, `${n}: niveles posibles ronda a ronda`, mejor.esperado, mejor.real);
    }

    // 4) Puntos ganados <= bajas x (baja + cuchillo) + impactos x 12.5, todo x2 (dobles),
    //    + lo que dan cartas y clase (puntos_fuente) + reparar ventanas y nukes por ronda.
    if (j.impactos_armas) {
      const impactos = Object.values(j.impactos_armas).reduce((a, x) => a + x, 0);
      const fuentes = Object.values(j.puntos_fuente || {}).reduce((a, x) => a + x, 0);
      const max = (DOBLES * (j.bajas * PUNTOS_BAJA_MAX + impactos * PUNTOS_IMPACTO_MAX) + fuentes * 2 + PUNTOS_RONDA_EXTRA * p.ronda + 500) * MARGEN;
      anotar(`puntos:${n}`, j.puntos_total <= max, j.puntos_total <= max ? `${n}: puntos posibles con sus bajas e impactos` : `${n}: más puntos de los posibles con sus bajas e impactos`, max, j.puntos_total);
    }

    // 5) Daño de cada carta <= lo maximo que puede sumar (motor.danioSaliente): una carta
    //    que suma X % se lleva como mucho X/100 del daño; una que multiplica por F, (F-1)/F.
    if (j.danio_cartas && Object.keys(j.danio_cartas).length && j.danio_total > 0) {
      const { pct, fac } = maximosCartas(j);
      // jodas_stats_impacto: en cada golpe la carta que suma X % se lleva X/100 de lo que se
      // lleva la base (el arma, o la carta-fuente del efecto: fuego, rayos...).
      let base = 0;
      for (const [k, d] of Object.entries(j.danio_cartas)) if (pct[k] === undefined && fac[k] === undefined) base += d;
      const malas = [];
      let mejor = { esperado: 1, real: 0 };
      for (const [k, d] of Object.entries(j.danio_cartas)) {
        let max = null;
        if (pct[k] !== undefined) max = (base * pct[k]) / 100;
        if (fac[k] !== undefined) max = (max || 0) + (j.danio_total * (fac[k] - 1)) / fac[k];
        // Cartas de daño propio (fuego, rayos, torreta...), letales (clase, unabala) y "arma":
        // las acota la vida de los zombies (comprobacion 2).
        if (max === null || CARTAS[k] === undefined) continue;
        if (d > max * MARGEN + 1000) malas.push({ k, esperado: max * MARGEN, real: d });
        if (d / (max * MARGEN + 1000) > mejor.real / mejor.esperado) mejor = { esperado: max * MARGEN + 1000, real: d, k };
      }
      if (malas.length) {
        const m = malas[0];
        anotar(`cartas:${n}`, false, `${n}: la carta ${m.k} hace más daño del que puede con su valor${malas.length > 1 ? ` (y ${malas.length - 1} más)` : ""}`, m.esperado, m.real);
      } else anotar(`cartas:${n}`, true, `${n}: daño de cada carta posible con su valor`, mejor.esperado, mejor.real);
    }
  }

  if (!res.length) anotar("datos", false, "la partida no trae datos para revisarla (versión antigua del mod)");
  const estado = res.every((c) => c.ok) ? "validada" : "en_revision";
  return { estado, version: VERSION_REVISION, mod: p.version, fecha: new Date().toISOString(), comprobaciones: res };
}
