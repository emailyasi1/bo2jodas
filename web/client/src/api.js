export async function api(ruta) {
  const r = await fetch(`/api${ruta}`, { credentials: "same-origin" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function post(ruta, cuerpo, cabeceras = {}) {
  const r = await fetch(`/api${ruta}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...cabeceras },
    body: JSON.stringify(cuerpo ?? {}),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(datos.error || `${r.status}`);
    e.estado = r.status; // quien llama distingue rechazo (4xx) de servidor caido (5xx)
    throw e;
  }
  return datos;
}

// Ultima version del mod en GitHub (con sesion). null si la descarga no esta configurada.
export async function infoDescarga() {
  const r = await fetch("/api/descarga/info", { credentials: "same-origin" });
  if (r.status === 503) return null;
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || `${r.status}`);
  return datos;
}

export async function borrarPartida(id) {
  const r = await fetch(`/api/runs/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || `${r.status}`);
  return datos;
}

export function subirPartida(json, token) {
  return post("/runs", json, token ? { "x-token": token } : {});
}

// Cuentas. La sesion va en una cookie HttpOnly; /auth/yo devuelve null si no hay.
export async function quienSoy() {
  const r = await fetch("/api/auth/yo", { credentials: "same-origin" });
  if (r.status === 401) return null;
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
export const registrar = (usuario, contrasena) => post("/auth/registro", { usuario, contrasena });
export const entrar = (usuario, contrasena) => post("/auth/login", { usuario, contrasena });
export const salir = () => post("/auth/logout");
export const tokenNuevo = () => post("/auth/token");
export const cambiarContrasena = (actual, nueva) => post("/auth/contrasena", { actual, nueva });
