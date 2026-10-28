// Motor de la calculadora. Cada funcion copia una del juego o del mod; el
// nombre original va en el comentario para poder comprobarlo. Los datos
// (configuracion, cartas, armas) salen de calculadora.json, que genera
// tools/generar_calculadora.py a partir de los scripts y archivos del juego.
import DATOS from "../calculadora.json" with { type: "json" };

export { DATOS };
const CFG = DATOS.cfg;
const JUEGO = DATOS.juego;

import { acentuar } from "../acentos.js";
for (const c of DATOS.cartas) {
  c.nombre = acentuar(c.nombre);
  c.desc = acentuar(c.desc);
}
for (const m of DATOS.miticas) {
  m.nombre = acentuar(m.nombre);
  m.desc = acentuar(m.desc);
}
for (const c of DATOS.clases) c.desc = acentuar(c.desc);
export const CARTAS = Object.fromEntries(DATOS.cartas.map((c) => [c.id, c]));
export const RAREZAS = ["Común", "Poco común", "Rara", "Épica", "Legendaria"];

// Los enteros de GSC son de 32 bits: la vida deja de crecer cuando se desborda.
const i32 = (x) => x | 0;
const trunc = (x) => Math.trunc(x);

// ---------------------------------------------------------------- ronda

// maps\mp\zombies\_zm::ai_calculate_health con zombie_health_start/increase/
// increase_multiplier (el mod pone los suyos en jodas_instalar_caos).
export function vidaPorRonda(ronda, base = CFG.vida_base, suma = CFG.vida_ronda, mult = CFG.vida_mult) {
  let vida = base;
  for (let i = 2; i <= ronda; i++) {
    if (i >= 10) {
      const vieja = vida;
      vida = i32(vida + trunc(vida * mult));
      if (vida < vieja) return vieja;
    } else vida = trunc(vida + suma);
  }
  return vida;
}

export const vidaDeSerie = (ronda) => vidaPorRonda(ronda, JUEGO.vida_inicio, JUEGO.vida_ronda, JUEGO.vida_mult);

// _zm::round_spawning + default_max_zombie_func + bo2jodas::jodas_total_ronda.
export function zombiesPorRonda(ronda, jugadores) {
  let max = JUEGO.zombie_max_ai;
  let m = ronda / 5;
  if (m < 1) m = 1;
  if (ronda >= 10) m = m * (ronda * 0.15);
  if (jugadores === 1) max = max + trunc(0.5 * JUEGO.zombie_ai_per_player * m);
  else max = max + trunc((jugadores - 1) * JUEGO.zombie_ai_per_player * m);
  let total = max;
  if (ronda < 2) total = trunc(max * 0.25);
  else if (ronda < 3) total = trunc(max * 0.3);
  else if (ronda < 4) total = trunc(max * 0.5);
  else if (ronda < 5) total = trunc(max * 0.7);
  else if (ronda < 6) total = trunc(max * 0.9);
  let mult = CFG.zombies_mult;
  if (jugadores > 4) mult = mult * (1 + (jugadores - 4) * CFG.zombies_extra_jugador);
  return { sinMod: total, total: trunc(total * mult) };
}

// Tipos de enemigo y su vida en una ronda (jodas_hacer_tanque, jodas_hacer_jefe,
// jodas_bruja_*, jodas_leroy_*: maxhealth = int(level.zombie_health * x)).
export function enemigos(ronda) {
  const zh = vidaPorRonda(ronda);
  return [
    { id: "normal", nombre: "Zombie", vida: zh, jefe: false, tanque: false, nota: "También los super sprinters: misma vida." },
    { id: "tanque", nombre: "Tanque", vida: trunc(zh * CFG.tanque_vida), jefe: false, tanque: true, nota: `x${CFG.tanque_vida} vida, golpe x${CFG.tanque_danio}` },
    { id: "brutus", nombre: "Brutus", vida: trunc(zh * CFG.jefe_vida), jefe: true, tanque: false, nota: `x${CFG.jefe_vida}; ningún golpe le quita más del 15 %` },
    { id: "bruja", nombre: "Bruja", vida: trunc(zh * CFG.bruja_vida), jefe: true, tanque: false, nota: `x${CFG.bruja_vida}; tope del 15 % por golpe` },
    { id: "leroy", nombre: "Leroy", vida: trunc(zh * CFG.leroy_vida), jefe: true, tanque: false, nota: `x${CFG.leroy_vida}; tope del 15 % por golpe` },
  ];
}

// ---------------------------------------------------------------- daño de un golpe

const BALA = new Set(["MOD_RIFLE_BULLET", "MOD_PISTOL_BULLET"]);
const EXPLOSIVO = new Set(["MOD_GRENADE", "MOD_GRENADE_SPLASH", "MOD_PROJECTILE", "MOD_PROJECTILE_SPLASH", "MOD_EXPLOSIVE"]); // _zm_utility::is_explosive_damage
const FRANCOS = ["dsr50", "barretm82", "svu", "ballista"];

export function firmaActiva(build, id) {
  const c = CARTAS[id];
  return Boolean(build.v[id]) && (!c || c.requiere.every((r) => (build.v[r] || 0) > 0));
}

// bo2jodas::jodas_danio_saliente + bo2jodas_arq::jodas_arq_mult_saliente.
// danio = lo que manda el motor (ya multiplicado por la zona del cuerpo).
// golpe: { mod, cabeza, arma, zombie: {vida, vidaMax, jefe, tanque} }
// build: { clase, mitica, v: {id: valor}, sit: situaciones }
// azar: { critico: "nunca"|"siempre"|"media", escopeta: false }
export function danioSaliente(danio, golpe, build, azar = {}) {
  const { v, sit } = build;
  const val = (id) => v[id] || 0;
  const bala = BALA.has(golpe.mod);
  const z = golpe.zombie;
  const sumandos = {};
  const factores = {};
  const sumar = (id, pct) => {
    if (!pct) return 0;
    sumandos[id] = (sumandos[id] || 0) + pct;
    return pct / 100;
  };
  // La carta da Double Tap con setperk: hasperk("specialty_rof") es cierto y el % se dobla
  // (salvo junto a la maquina de Double Tap sin haberla comprado: sit.junto_dt).
  let cadencia = val("cadencia");
  if (cadencia > 0 && (!sit.junto_dt || sit.dt_comprado)) cadencia = cadencia * 2;
  // SMR (Rifles): x4 de dano por bala.
  if (bala && String(golpe.arma || "").includes("saritch")) danio = trunc(danio * CFG.smr_mult);
  let mult = 1 + sumar("danio", val("danio")) + sumar("cadencia", cadencia);

  if (bala && build.clase === "escopetas") {
    if (azar.escopeta) {
      if (z.jefe) {
        factores.clase = 3;
        mult = mult * 3;
      } else return { danio: z.vida + 666, letal: "clase", sumandos, factores };
    }
  } else if (bala && build.clase === "automaticas") {
    let racha = sit.racha * CFG.auto_racha;
    if (racha > CFG.auto_racha_max) racha = CFG.auto_racha_max;
    mult = mult + sumar("clase", racha);
  } else if (bala && build.clase === "pistolas") mult = mult + sumar("clase", CFG.pistolas_danio);

  if (EXPLOSIVO.has(golpe.mod)) {
    mult = mult + sumar("explosivo", val("explosivo"));
    if (build.mitica === "bomberman") {
      factores.bomberman = CFG.bomberman_explosivo;
      mult = mult * CFG.bomberman_explosivo;
    }
  }

  if (golpe.mod === "MOD_MELEE") mult = mult + sumar("melee", val("melee"));
  else if (golpe.cabeza) mult = mult + sumar("cabeza", val("cabeza"));

  if (sit.media_vida) mult = mult + sumar("adrenalina", val("adrenalina"));
  if (val("punteria") > 0 && sit.apuntando) mult = mult + sumar("punteria", val("punteria"));
  if (val("ultimas") > 0 && bala && sit.cargador_bajo) mult = mult + sumar("ultimas", val("ultimas"));
  if (z.tanque) mult = mult + sumar("cazatanques", val("cazatanques"));
  if (val("combo") > 0 && sit.combo > 0) mult = mult + sumar("combo", sit.combo * val("combo"));

  // --- arquetipos (jodas_arq_mult_saliente)
  let m = 0;
  if (val("furia") > 0 && sit.furia > 0) m += sumar("furia", sit.furia * val("furia"));
  if (sit.ultimo_aliento) m += sumar("ultimo", 100);
  if (bala && val("pulso") > 0 && sit.pulso) m += sumar("pulso", val("pulso"));
  if (bala && val("tambor") > 0 && sit.rafaga) m += sumar("tambor", val("tambor"));
  if (bala && val("plomo") > 0) m += sumar("plomo", Math.min(sit.plomo, val("plomo")));
  if (val("sangrefria") > 0 && sit.solo) m += sumar("sangrefria", val("sangrefria"));
  if (val("madrugador") > 0 && sit.madrugador) m += sumar("madrugador", val("madrugador"));
  if (val("interes") > 0) m += sumar("interes", Math.min(trunc(sit.puntos / 1000), val("interes")));
  if (firmaActiva(build, "plutocrata")) m += sumar("plutocrata", sit.bebidas * 6);
  if (val("mecha") > 0 && EXPLOSIVO.has(golpe.mod) && golpe.granada_letal) m += sumar("mecha", val("mecha"));

  let factor = 1;
  if (bala && golpe.cabeza && val("unabala") > 0 && !z.jefe && sit.lejos && z.vida <= (z.vidaMax * val("unabala")) / 100) {
    return { danio: z.vida + 666, letal: "unabala", sumandos, factores };
  }
  if (golpe.cabeza && (z.tanque || z.jefe) && firmaActiva(build, "elites")) {
    factor *= 3;
    factores.elites = 3;
  }
  if (golpe.mod === "MOD_MELEE" && firmaActiva(build, "coloso") && sit.quieto) {
    factor *= 3;
    factores.coloso = 3;
  }
  mult = mult + m;
  mult = mult * factor;
  if (build.mitica === "cristal") {
    factores.cristal = CFG.cristal_danio;
    mult = mult * CFG.cristal_danio;
  }
  const critico = val("critico");
  if (critico > 0 && azar.critico === "siempre") {
    factores.critico = 2.5;
    mult = mult * 2.5;
  } else if (critico > 0 && azar.critico === "media") {
    const f = 1 + (1.5 * Math.min(critico, 100)) / 100;
    factores.critico_media = f;
    mult = mult * f;
  }
  const final = mult === 1 ? danio : trunc(danio * mult);
  // Rifles (Ejecutor): la bala que deja al zombie por debajo del 20 % lo remata (al jefe no).
  if (bala && build.clase === "rifles" && !z.jefe && z.vida - final <= (z.vidaMax * CFG.rifles_ejecutor) / 100)
    return { danio: z.vida + 666, letal: "clase", sumandos, factores };
  return { danio: final, mult, sumandos, factores };
}

// bo2jodas::jodas_danio_actor (tope del 15 % al jefe) + _zm::actor_damage_override (int).
export function danioRecibido(danio, z) {
  let d = danio;
  if (z.jefe && d > z.vidaMax * 0.15) d = trunc(z.vidaMax * 0.15);
  return trunc(d);
}

// ---------------------------------------------------------------- armas

// Daño del arma a una distancia. Hasta alcance_max: danio; desde alcance_min:
// danio_min. Entre medias el motor interpola (no esta en los scripts): aprox.
export function danioArmaDistancia(a, dist) {
  const lo = Math.min(a.alcance_max, a.alcance_min);
  const hi = Math.max(a.alcance_max, a.alcance_min);
  if (dist <= lo) return { danio: a.danio, aprox: false };
  if (dist >= hi) return { danio: a.danio_min, aprox: false };
  const t = (dist - lo) / (hi - lo);
  return { danio: Math.round(a.danio + (a.danio_min - a.danio) * t), aprox: true };
}

export function esFranco(id) {
  return FRANCOS.some((f) => id.includes(f));
}

export function modDeArma(a, claseArma) {
  if (a.tipo === "melee") return "MOD_MELEE";
  if (a.tipo === "grenade") return "MOD_GRENADE_SPLASH";
  if (a.tipo === "projectile") return a.id.includes("knife_ballistic") ? "MOD_IMPACT" : "MOD_PROJECTILE";
  return claseArma === "pistola" ? "MOD_PISTOL_BULLET" : "MOD_RIFLE_BULLET";
}

// Simula disparo a disparo hasta matar a un enemigo con un arma de balas o
// de cuerpo a cuerpo. Devuelve golpes, disparos, el primer golpe y el tiempo.
export function simularArma(arma, enemigo, build, op) {
  const z = { vida: enemigo.vida, vidaMax: enemigo.vida, jefe: enemigo.jefe, tanque: enemigo.tanque };
  const sit = { ...build.sit };
  const perdigones = arma.tipo === "bullet" ? Math.max(1, arma.perdigones) : 1;
  const zona = op.zona;
  const cabeza = zona === "cabeza";
  let base;
  let aprox = false;
  if (arma.tipo === "melee") base = arma.cuchillo;
  else {
    const r = danioArmaDistancia(arma, op.distancia);
    base = r.danio;
    aprox = r.aprox;
    base = trunc(base * (arma.zonas[zona] ?? 1));
  }
  const mod = op.mod;
  const azar = { critico: op.critico };
  const golpes = [];
  let disparos = 0;
  let primero = null;
  let letalPor = null;
  for (let tiro = 0; tiro < 5000 && z.vida > 0; tiro++) {
    disparos++;
    // Automaticas: el primer impacto de cada disparo suma 1 a la racha antes de
    // calcular el dano (sit.racha = aciertos seguidos antes del primer disparo).
    if (build.clase === "automaticas" && BALA.has(mod)) sit.racha = (build.sit.racha || 0) + tiro + 1;
    // Plomo: +1 por bala disparada (jodas_arq_disparo, "weapon_fired").
    sit.plomo = (build.sit.plomo || 0) + tiro;
    for (let p = 0; p < perdigones && z.vida > 0; p++) {
      const r = danioSaliente(base, { mod, cabeza, zombie: z, arma: arma.id }, { ...build, sit }, azar);
      const d = danioRecibido(r.danio, z);
      if (!primero) primero = { ...r, recibido: d, base };
      if (r.letal) letalPor = r.letal;
      z.vida -= d;
      golpes.push(d);
    }
  }
  const tiempo = Math.max(0, disparos - 1) * (arma.cadencia || 0);
  return { golpes: golpes.length, disparos, primero, tiempo, perdigones, base, aprox, letalPor, cargadores: arma.cargador ? disparos / arma.cargador : null };
}

// Probabilidad de que un disparo de Escopetas mate de golpe (15 % por perdigón;
// 35 % francotiradores). jodas_danio_saliente tira por cada impacto de bala.
export function probEscopeta(arma) {
  const p = (esFranco(arma.id) ? CFG.francos_oneshot : CFG.escopetas_oneshot) / 100;
  const n = Math.max(1, arma.perdigones);
  return { p, n, porDisparo: 1 - Math.pow(1 - p, n) };
}

// ---------------------------------------------------------------- efectos con % de vida

// Daño que pasa por jodas_danio_saliente sin ser bala (Espinas, Ciclón,
// mordisco de leaper: MOD_UNKNOWN; Reacción en cadena: MOD_GRENADE_SPLASH;
// Bastón: MOD_BURNED). Sin zona del cuerpo (cabeza = no).
function porFormula(danio, mod, enemigo, build, op, extra = {}) {
  const z = { vida: enemigo.vida, vidaMax: enemigo.vida, jefe: enemigo.jefe, tanque: enemigo.tanque };
  const r = danioSaliente(danio, { mod, cabeza: false, zombie: z, ...extra }, build, { critico: op.critico });
  return { bruto: danio, final: danioRecibido(r.danio, z), mult: r.mult, sumandos: r.sumandos };
}

function letal(enemigo) {
  // bo2jodas::jodas_danio_letal
  return enemigo.jefe ? trunc(enemigo.vida * 0.15) + 1 : enemigo.vida + 666;
}

export function efectos(ronda, enemigo, build, op) {
  const v = build.v;
  const val = (id) => v[id] || 0;
  const zh = vidaPorRonda(ronda);
  const max = enemigo.vida;
  const filas = [];
  const add = (id, nombre, cuando, r, nota) => filas.push({ id, nombre, cuando, ...r, nota });

  // Fuego (Fósforo / Pirotécnico / Alfa / Napalm)
  if (val("fosforo") > 0 || firmaActiva(build, "pirotecnico") || firmaActiva(build, "alfa") || val("napalm") > 0) {
    const pct = enemigo.jefe ? CFG.fuego_pct / 4 : CFG.fuego_pct;
    const tic = Math.max(1, trunc((max * pct) / 100));
    const tics = Math.round(CFG.fuego_seg); // jodas_fuego_tics: uno por segundo
    const r = porFormula(tic, "MOD_BURNED", enemigo, build, op);
    add("fuego", "Fuego, por segundo", `${val("fosforo") ? `Fósforo ${val("fosforo")} % por bala` : "al prender"}`, r,
      `${tics} tics (${fmtN(r.final * tics)} en total); cada vez que se vuelve a prender vuelven a ser ${tics}. Pasa por tus cartas de daño`);
  }
  if (val("pararrayos") > 0)
    add("pararrayos", "Pararrayos: rayo del 15 %", `${val("pararrayos")} % por baja, a ${1 + rayosExtra(build)} zombie(s)`, porFormula(trunc(max * 0.15) + 1, "MOD_UNKNOWN", enemigo, build, op), "Alcance 350 u; pasa por tus cartas de daño");
  if (val("sobrecarga") > 0)
    add("sobrecarga", `Sobrecarga: rayo del ${val("sobrecarga")} %`, "al recargar (1 por segundo como mucho)", porFormula(val("sobrecarga") >= 100 ? letal(enemigo) : trunc((max * val("sobrecarga")) / 100) + 1, "MOD_UNKNOWN", enemigo, build, op), `A ${1 + rayosExtra(build)} zombie(s), el más cercano`);
  if (val("condensador") > 0)
    add("condensador", `Condensador: rayos del ${val("condensador")} %`, "tras 10 bajas sin recibir daño, en el siguiente impacto", porFormula(val("condensador") >= 100 ? letal(enemigo) : trunc((max * val("condensador")) / 100) + 1, "MOD_UNKNOWN", enemigo, build, op), `${3 + rayosExtra(build)} zombies`);
  if (val("tormenta") > 0) {
    const ms = Math.max(1500, 4500 - val("tormenta") * 30);
    add("tormenta", `Tormenta: descarga del ${val("tormenta")} %`, `cada ${(ms / 1000).toFixed(2)} s a todos a 160 u`, porFormula(val("tormenta") >= 100 ? letal(enemigo) : trunc((max * val("tormenta")) / 100) + 1, "MOD_UNKNOWN", enemigo, build, op), "Y 1 s a la mitad de velocidad");
  }
  if (build.mitica === "zeus")
    add("zeus", "Ira de Zeus", `${CFG.zeus_pct} % por baja, ${CFG.zeus_objetivos + rayosExtra(build)} zombies a 500 u`, porFormula(letal(enemigo), "MOD_UNKNOWN", enemigo, build, op), "Mata (al jefe, el 15 %)");
  // Espinas: % de la vida del zombie que te golpea; pasa por la fórmula (MOD_UNKNOWN).
  let espinas = val("espinas");
  if (firmaActiva(build, "coloso") && build.sit.quieto) espinas = 100;
  if (espinas > 0)
    add("espinas", `Espinas ${espinas} %`, "cada golpe que te dan", porFormula(trunc((max * espinas) / 100), "MOD_UNKNOWN", enemigo, build, op), "Pasa por tus cartas de daño (Calibre, Adrenalina, Cristal...)");
  if (firmaActiva(build, "ciclon"))
    add("ciclon", "Ciclón: 25 %", "zombie a 56 u mientras esprintas, cada 0.5 s", porFormula(trunc(max * 0.25) + 1, "MOD_UNKNOWN", enemigo, build, op), "Pasa por tus cartas de daño");
  if (val("silbato") > 0) {
    let mordisco = 1000;
    if (zh / 3 > mordisco) mordisco = trunc(zh / 3);
    let m = 1 + val("collar") / 100;
    if (firmaActiva(build, "alfa") && build.sit.alfa) m = m * 2;
    const leapers = Math.min(3, 1 + val("manada"));
    add("leaper", "Mordisco de leaper", `1 por segundo por leaper (${leapers})`, porFormula(trunc(mordisco * m), "MOD_UNKNOWN", enemigo, build, op), `Base max(1000, vida de ronda / 3) = ${mordisco}${val("collar") ? `, Collar +${val("collar")} %` : ""}; pasa por tus cartas de daño`);
  }
  if (val("cadena") > 0)
    add("cadena", "Reacción en cadena", `${val("cadena")} % por baja, a 160 u`, porFormula(trunc(zh * 0.6) + 100, "MOD_GRENADE_SPLASH", enemigo, build, op), "0.6 x vida de ronda + 100; cuenta como explosión (Pólvora, Bomberman)");
  return filas;
}

const fmtN = (x) => Math.trunc(x).toLocaleString("es-ES");

function rayosExtra(build) {
  return firmaActiva(build, "tesla") ? 2 : 0; // jodas_arq_rayos_extra
}

// ---------------------------------------------------------------- armas especiales

// Bastón (bo2jodas_baston): impacto y 8 s ardiendo, MOD_BURNED, por la fórmula.
export const BASTON = {
  staff_fire_zm: { impacto: 2050, segundo: 75, nombre: "Bastón de fuego" },
  staff_fire_upgraded_zm: { impacto: 3300, segundo: 150, nombre: "Bastón mejorado" },
  staff_fire_upgraded2_zm: { impacto: 11500, segundo: 300, nombre: "Bastón mejorado, carga 2" },
  staff_fire_upgraded3_zm: { impacto: 20000, segundo: 450, nombre: "Bastón mejorado, carga 3" },
};

export function baston(id, enemigo, build, op) {
  const b = BASTON[id];
  const imp = porFormula(b.impacto, "MOD_BURNED", enemigo, build, op);
  const seg = porFormula(b.segundo, "MOD_BURNED", enemigo, build, op);
  const total = imp.final + seg.final * 8;
  return { ...b, imp, seg, total, golpes: Math.ceil(enemigo.vida / Math.max(1, total)), remate: id !== "staff_fire_zm" && !enemigo.jefe && imp.final > enemigo.vida };
}

// Explosivos y Ray Gun: impacto directo (MOD_PROJECTILE, con zona) + explosión
// en el centro (MOD_PROJECTILE_SPLASH / MOD_GRENADE_SPLASH, sin zona). Cada
// golpe dispara ademas el extra de _zm_spawner::zombie_damage: granadas
// ronda + 100..199, proyectiles ronda x 0..99 (aqui su media).
export function explosivo(arma, ronda, enemigo, build, op) {
  const granada = arma.tipo === "grenade";
  const partes = [];
  const balistico = arma.id.includes("knife_ballistic");
  if (!granada && arma.danio > 1) {
    const base = trunc(arma.danio * (arma.zonas[op.zona] ?? 1));
    partes.push({ que: "Impacto directo", ...porFormulaZona(base, balistico ? "MOD_IMPACT" : "MOD_PROJECTILE", op.zona === "cabeza", enemigo, build, op) });
  }
  if (arma.explosion.centro > 0) {
    const mod = granada ? "MOD_GRENADE_SPLASH" : "MOD_PROJECTILE_SPLASH";
    partes.push({ que: `Explosión (centro; borde ${arma.explosion.borde}, radio ${arma.explosion.radio})`, ...porFormula(arma.explosion.centro, mod, enemigo, build, op, { granada_letal: granada }) });
  }
  const extraMedio = granada ? ronda + 149.5 : ronda * 49.5;
  const extraMod = granada ? "MOD_GRENADE_SPLASH" : "MOD_PROJECTILE";
  const extra = porFormula(trunc(extraMedio), extraMod, enemigo, build, op);
  // El cuchillo balistico (MOD_IMPACT) no tiene extra: zombie_damage solo lo da a granadas y proyectiles.
  const nExtra = balistico ? 0 : partes.length;
  const porGolpe = partes.reduce((s, p) => s + p.final, 0) + extra.final * nExtra;
  return { partes, extra: nExtra ? extra : null, extraTexto: granada ? `ronda + 100 a 199 (media ${trunc(extraMedio)})` : `ronda x 0 a 99 (media ${trunc(extraMedio)})`, porGolpe, golpes: porGolpe > 0 ? Math.ceil(enemigo.vida / porGolpe) : Infinity };
}

function porFormulaZona(danio, mod, cabeza, enemigo, build, op) {
  const z = { vida: enemigo.vida, vidaMax: enemigo.vida, jefe: enemigo.jefe, tanque: enemigo.tanque };
  const r = danioSaliente(danio, { mod, cabeza, zombie: z }, build, { critico: op.critico });
  return { bruto: danio, final: danioRecibido(r.danio, z), mult: r.mult, sumandos: r.sumandos };
}

// Sliquifier: el goo hace ai_zombie_health(slipgun_max_kill_round = 100).
export function goo() {
  return vidaPorRonda(100);
}
