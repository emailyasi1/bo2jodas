// Nombres, colores y textos a partir de los ids que manda el mod.
import cartasJson from "./cartas.json";
import calc from "./calculadora.json";
import { acentuar } from "./acentos.js";

export const ARQUETIPOS = {
  piromano: { nombre: "Pirómano", color: "#ff7a1f" },
  electricista: { nombre: "Electricista", color: "#4dcbff" },
  berserker: { nombre: "Berserker", color: "#e6262b" },
  francotirador: { nombre: "Francotirador", color: "#eaeaf2" },
  tanque: { nombre: "Tanque", color: "#7f99bf" },
  banquero: { nombre: "Banquero", color: "#ffcc1a" },
  gatillo: { nombre: "Gatillo", color: "#4ed94e" },
  velocista: { nombre: "Velocista", color: "#33f2cc" },
  domador: { nombre: "Domador", color: "#b35cf2" },
  suertudo: { nombre: "Suertudo", color: "#ff99d6" },
};

export const CLASES = {
  escopetas: { nombre: "Escopetas", color: "#ff8c1a" },
  automaticas: { nombre: "Automáticas", color: "#ff4040" },
  rifles: { nombre: "Rifles", color: "#4d99ff" },
  pistolas: { nombre: "Pistolas", color: "#ffd926" },
};

export const MITICAS = {
  bomberman: "Bomberman",
  fenix: "Fénix",
  cristal: "Cuerpo de cristal",
  zeus: "Ira de Zeus",
  midas: "Rey Midas",
  infinito: "Gatillo infinito",
  bruja: "Hora bruja",
  leaper: "Leaper amaestrado",
};

export const RAREZAS = {
  COMUN: "#9a9aa6",
  "POCO COMUN": "#40e640",
  RARA: "#4d99ff",
  EPICA: "#bf59ff",
  LEGENDARIA: "#ffd91a",
  MITICA: "#ff2626",
};

// Fuentes de dano que no son cartas de la lista (o son efectos de cartas).
const ESPECIALES = {
  arma: { nombre: "Daño base del arma", arquetipo: "" },
  clase: { nombre: "Ventaja de clase", arquetipo: "" },
  zeus: { nombre: "Ira de Zeus (mítica)", arquetipo: "" },
  fenix: { nombre: "Fénix (mítica)", arquetipo: "" },
  cristal: { nombre: "Cuerpo de cristal (mítica)", arquetipo: "" },
  bomberman: { nombre: "Bomberman (mítica)", arquetipo: "" },
  rayo: { nombre: "Rayo", arquetipo: "electricista" },
  bebida_cherry: { nombre: "Electric Cherry (bebida)", arquetipo: "" },
  none: { nombre: "Sin arma", arquetipo: "" },
};

const CARTAS = Object.fromEntries(cartasJson.map((c) => [c.id, { ...c, nombre: acentuar(c.nombre) }]));

export function carta(id) {
  if (CARTAS[id]) return CARTAS[id];
  if (ESPECIALES[id]) return { id, tipo: "efecto", ...ESPECIALES[id] };
  return { id, nombre: id, arquetipo: "", tipo: "?" };
}

export function nombreCarta(id) {
  return carta(id).nombre;
}

export function colorArquetipo(id) {
  return (ARQUETIPOS[id] && ARQUETIPOS[id].color) || "#c8c8d2";
}

export function nombreArquetipo(id) {
  return (ARQUETIPOS[id] && ARQUETIPOS[id].nombre) || "Sin arquetipo";
}

export function nombreClase(id) {
  return (CLASES[id] && CLASES[id].nombre) || id || "?";
}

export function colorClase(id) {
  return (CLASES[id] && CLASES[id].color) || "#c8c8d2";
}

export function nombreMitica(id) {
  return MITICAS[id] || id || "";
}

export const BEBIDAS = {
  specialty_armorvest: "Juggernog",
  specialty_quickrevive: "Quick Revive",
  specialty_fastreload: "Speed Cola",
  specialty_rof: "Double Tap",
  specialty_longersprint: "Stamin-Up",
  specialty_scavenger: "Tombstone",
  specialty_additionalprimaryweapon: "Mule Kick",
  specialty_deadshot: "Deadshot",
  specialty_flakjacket: "PhD Flopper",
  specialty_grenadepulldeath: "Electric Cherry",
  specialty_nomotionsensor: "Vulture Aid",
  specialty_finalstand: "Who's Who",
};

export function nombreBebida(id) {
  return BEBIDAS[id] || id.replace("specialty_", "");
}

export const ARMAS = {
  staff_fire_zm: "Bastón de fuego",
  staff_fire_upgraded_zm: "Bastón de fuego mejorado",
  staff_fire_upgraded2_zm: "Bastón mejorado (carga)",
  staff_fire_upgraded3_zm: "Bastón mejorado (carga completa)",
  slipgun_zm: "Sliquifier",
  slipgun_upgraded_zm: "Sliquifier mejorada",
  slowgun_zm: "Paralizador",
  slowgun_upgraded_zm: "Paralizador mejorado",
  ray_gun_zm: "Ray Gun",
  ray_gun_upgraded_zm: "Ray Gun mejorada",
  raygun_mark2_zm: "Ray Gun Mark II",
  raygun_mark2_upgraded_zm: "Ray Gun Mark II mejorada",
  blundergat_zm: "Blundergat",
  blundergat_upgraded_zm: "Blundergat mejorada",
  knife_zm: "Cuchillo",
  bowie_knife_zm: "Bowie",
  tazer_knuckles_zm: "Galvanudillos",
  frag_grenade_zm: "Granada",
  sticky_grenade_zm: "Semtex",
  claymore_zm: "Claymore",
  cymbal_monkey_zm: "Mono",
  emp_grenade_zm: "EMP",
  none: "Sin arma / efecto",
};

// Nombres reales de las armas (displayName del juego), desde calculadora.json.
const ARMAS_JUEGO = Object.fromEntries(
  calc.armas.flatMap((g) => g.armas.flatMap((a) => [[a.id, a.nombre], ...(a.mejorada ? [[a.mejorada.id, a.mejorada.nombre]] : [])]))
);

export function nombreArma(id) {
  if (ARMAS[id]) return ARMAS[id];
  if (id.startsWith("zombie_perk_bottle")) return "Botella de bebida";
  if (ARMAS_JUEGO[id]) return ARMAS_JUEGO[id];
  let s = id.replace(/_zm$/, "");
  const mejorada = s.endsWith("_upgraded");
  s = s.replace(/_upgraded$/, "").replace(/_/g, " ");
  return s.toUpperCase() + (mejorada ? " (mejorada)" : "");
}

export function fmt(n) {
  return new Intl.NumberFormat("es-ES").format(Math.round(n || 0));
}

export function duracion(s) {
  if (!s && s !== 0) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function fecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const MAPAS = {
  zm_transit: "Town",
  zm_nuked: "Nuketown",
  zm_highrise: "Die Rise",
  zm_buried: "Buried",
  zm_prison: "Mob of the Dead",
  zm_tomb: "Origins",
};

export function nombreMapa(id, sitio) {
  const base = MAPAS[id] || id;
  if (id === "zm_transit" && sitio && sitio !== "town") return `TranZit (${sitio})`;
  return base;
}
