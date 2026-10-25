// Autosubida desde el navegador: el usuario elige una vez la carpeta donde el
// mod deja los JSON (File System Access API, solo navegadores con motor
// Chromium: Chrome, Edge, Opera, Vivaldi; Brave la tiene tras una flag) y,
// mientras la web este abierta y con sesion, se suben solas las partidas que
// falten. Las terminadas, al momento. Una sin terminar (terminada:0) solo
// cuando su partida ya no esta viva, segun el latido en_partida.txt que el mod
// escribe cada minuto: el latido es de otra partida (reinicio), dice
// "acabada", o lleva 40 min parado (juego cerrado o colgado; una pausa normal
// no llega). Sin latido (carpeta vieja), 40 min sin cambiar el JSON.
import { useSyncExternalStore } from "react";
import { subirPartida } from "./api.js";
import { vaciarCache } from "./ui.jsx";

const SIN_TERMINAR_MS = 40 * 60_000;
const LATIDO = "en_partida.txt";
const CADA_MS = 60_000;
const MAX_POR_REVISION = 15; // el servidor admite 20 subidas por hora
const CLAVE_SUBIDAS = "jodas_autosubida_subidas";

export const soportado = () => typeof window !== "undefined" && "showDirectoryPicker" in window;
export async function esBrave() {
  try {
    return !!(navigator.brave && (await navigator.brave.isBrave()));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- estado
let estado = { carpeta: null, nombre: "", permiso: "sin", revisando: false, ultima: null, subidas: 0, registro: [] };
const oyentes = new Set();
function poner(cambios) {
  estado = { ...estado, ...cambios };
  for (const f of oyentes) f();
}
export function useAutosubida() {
  return useSyncExternalStore((f) => {
    oyentes.add(f);
    return () => oyentes.delete(f);
  }, () => estado);
}

// ---------------------------------------------------------------- carpeta (IndexedDB)
// Un handle de carpeta solo se puede guardar en IndexedDB, no en localStorage.
function bd() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open("jodas_autosubida", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("claves");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
async function guardarCarpeta(handle) {
  const d = await bd();
  await new Promise((ok, mal) => {
    const t = d.transaction("claves", "readwrite");
    if (handle) t.objectStore("claves").put(handle, "carpeta");
    else t.objectStore("claves").delete("carpeta");
    t.oncomplete = ok;
    t.onerror = () => mal(t.error);
  });
}
async function leerCarpeta() {
  const d = await bd();
  return new Promise((ok, mal) => {
    const r = d.transaction("claves").objectStore("claves").get("carpeta");
    r.onsuccess = () => ok(r.result || null);
    r.onerror = () => mal(r.error);
  });
}

async function permisoDe(handle, pedir) {
  const o = { mode: "read" };
  let p = await handle.queryPermission(o);
  if (p !== "granted" && pedir) p = await handle.requestPermission(o);
  return p === "granted" ? "ok" : "pedir";
}

// Lo ya subido, para no repetir: nombre (terminada) o nombre@modificado (sin terminar).
function subidas() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SUBIDAS) || "{}");
  } catch {
    return {};
  }
}
function apuntar(clave, que) {
  try {
    const s = subidas();
    s[clave] = que;
    localStorage.setItem(CLAVE_SUBIDAS, JSON.stringify(s));
  } catch {
    /* sin almacenamiento: el servidor no duplica, solo se reintentaria */
  }
}

// ---------------------------------------------------------------- acciones
export async function elegirCarpeta() {
  const handle = await window.showDirectoryPicker({ id: "bo2jodas_partidas", mode: "read" });
  let recordada = true;
  try {
    await guardarCarpeta(handle);
  } catch {
    recordada = false; // modo privado o sin IndexedDB: vale solo para esta visita
  }
  poner({ carpeta: handle, nombre: handle.name, permiso: "ok", registro: recordada ? [] : [{ t: new Date(), texto: "El navegador no deja recordar la carpeta: habrá que elegirla en cada visita", ok: false }] });
  revisar();
}

export async function quitarCarpeta() {
  await guardarCarpeta(null).catch(() => {});
  poner({ carpeta: null, nombre: "", permiso: "sin", registro: [], ultima: null });
}

// Volver a pedir permiso (hace falta un clic del usuario).
export async function permitir() {
  if (!estado.carpeta) return;
  const p = await permisoDe(estado.carpeta, true);
  poner({ permiso: p });
  if (p === "ok") revisar();
}

function anotar(texto, ok) {
  poner({ registro: [{ t: new Date(), texto, ok }, ...estado.registro].slice(0, 30) });
}

// Latido del mod: { id, estado: "jugando" | "acabada", modificado } o null.
async function leerLatido(h) {
  try {
    const f = await (await h.getFileHandle(LATIDO)).getFile();
    const j = JSON.parse(await f.text());
    return { id: String(j.id ?? ""), estado: j.estado, modificado: f.lastModified };
  } catch (e) {
    // No existe (carpeta de un mod viejo) o esta a medias de escribirse.
    return e && e.name === "NotFoundError" ? null : { id: "", estado: "ilegible", modificado: Date.now() };
  }
}

// Una partida sin terminar se sube solo si su partida ya no esta viva.
function muerta(json, latido, archivo) {
  if (!latido) return Date.now() - archivo.lastModified > SIN_TERMINAR_MS;
  if (latido.estado === "ilegible") return false;
  if (latido.id !== String(json.id ?? "")) return true; // ya hay otra partida
  if (latido.estado === "acabada") return true;
  return Date.now() - latido.modificado > SIN_TERMINAR_MS;
}

// Mira la carpeta y sube lo que falte.
export async function revisar() {
  const h = estado.carpeta;
  if (!h || estado.revisando || estado.permiso !== "ok" || !haySesion) return;
  poner({ revisando: true });
  try {
    const hechas = subidas();
    const latido = await leerLatido(h);
    let n = 0;
    let subido = false;
    for await (const [nombre, entrada] of h.entries()) {
      if (entrada.kind !== "file" || !nombre.endsWith(".json")) continue;
      if (hechas[nombre]) continue;
      const f = await entrada.getFile();
      const claveMod = `${nombre}@${f.lastModified}`;
      if (hechas[claveMod]) continue;
      let json;
      try {
        json = JSON.parse(await f.text());
      } catch {
        // A medias de escribirse o roto: si lleva 40 min asi, se da por perdido.
        if (Date.now() - f.lastModified > SIN_TERMINAR_MS) apuntar(claveMod, "roto");
        continue;
      }
      const terminada = json.terminada === undefined || json.terminada === 1;
      if (!terminada && !muerta(json, latido, f)) continue;
      if (n >= MAX_POR_REVISION) break;
      n++;
      try {
        const r = await subirPartida(json);
        apuntar(terminada ? nombre : claveMod, r.repetida ? "repetida" : "subida");
        if (!r.repetida) {
          subido = true;
          poner({ subidas: estado.subidas + 1 });
          anotar(`${nombre}: subida${terminada ? "" : " (sin terminar)"}`, true);
        }
      } catch (e) {
        // Rechazada (no cuadra, de prueba...): no se reintenta salvo que cambie.
        if (/^429|demasiadas/.test(e.message)) {
          anotar(`${nombre}: ${e.message}; se reintenta luego`, false);
          break;
        }
        apuntar(terminada ? nombre : claveMod, `error: ${e.message}`);
        anotar(`${nombre}: ${e.message}`, false);
      }
    }
    if (subido) vaciarCache();
  } catch (e) {
    if (e && e.name === "NotAllowedError") poner({ permiso: "pedir" });
    else anotar(`No se pudo leer la carpeta: ${e.message}`, false);
  } finally {
    poner({ revisando: false, ultima: new Date() });
  }
}

// ---------------------------------------------------------------- arranque
let haySesion = false;
let temporizador = null;

// Se llama desde App con la sesion: carga la carpeta guardada, comprueba el
// permiso sin molestar y revisa cada minuto mientras la web este abierta.
export function iniciarAutosubida(conSesion) {
  haySesion = !!conSesion;
  if (temporizador) {
    clearInterval(temporizador);
    temporizador = null;
  }
  if (!soportado() || !haySesion) return () => {};
  (async () => {
    try {
      const h = estado.carpeta || (await leerCarpeta());
      if (!h) return;
      const p = await permisoDe(h, false);
      poner({ carpeta: h, nombre: h.name, permiso: p });
      if (p === "ok") revisar();
    } catch {
      /* sin IndexedDB (modo privado): se elige la carpeta cada vez */
    }
  })();
  temporizador = setInterval(revisar, CADA_MS);
  return () => {
    clearInterval(temporizador);
    temporizador = null;
  };
}
