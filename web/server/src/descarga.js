// Descarga del mod desde la web (solo con sesion): el repo de GitHub es
// privado, asi que un enlace directo a la release solo le vale a quien sea
// colaborador. El servidor pregunta a GitHub por la ultima release con un
// token de solo lectura (GITHUB_TOKEN, permiso Contents: read en el repo) y
// redirige al zip: GitHub da un enlace temporal (unos minutos) a su almacen,
// asi que el zip no pasa por este servidor.
//
//   GITHUB_TOKEN   token de solo lectura (sin el, la descarga responde 503)
//   GITHUB_REPO    usuario/repo (por defecto emailyasi1/bo2jodas)

const REPO = process.env.GITHUB_REPO || "emailyasi1/bo2jodas";
const API = "https://api.github.com";
const CACHE_MS = 5 * 60 * 1000;
let cache = null;

const cabeceras = (accept) => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: accept,
  "User-Agent": "bo2jodas-web",
  "X-GitHub-Api-Version": "2022-11-28",
});

export const descargaConfigurada = () => !!process.env.GITHUB_TOKEN;

// Ultima release: version, nombre y tamano del zip (5 minutos de cache).
export async function ultimaVersion() {
  if (cache && Date.now() - cache.t < CACHE_MS) return cache.v;
  const r = await fetch(`${API}/repos/${REPO}/releases/latest`, { headers: cabeceras("application/vnd.github+json") });
  if (!r.ok) throw new Error(`GitHub respondió ${r.status} al pedir la última versión`);
  const rel = await r.json();
  const zip = (rel.assets || []).find((a) => a.name.endsWith(".zip"));
  if (!zip) throw new Error("la última versión no tiene zip");
  const v = {
    version: String(rel.tag_name || "").replace(/^v/, ""),
    nombre: zip.name,
    tamano: zip.size,
    fecha: rel.published_at,
    asset: zip.url,
  };
  cache = { t: Date.now(), v };
  return v;
}

// Enlace temporal al zip (GitHub responde 302 con el enlace a su almacen).
export async function enlaceZip() {
  const v = await ultimaVersion();
  const r = await fetch(v.asset, { headers: cabeceras("application/octet-stream"), redirect: "manual" });
  const destino = r.headers.get("location");
  if (r.status >= 300 && r.status < 400 && destino) return destino;
  throw new Error(`GitHub respondió ${r.status} al pedir el zip`);
}
