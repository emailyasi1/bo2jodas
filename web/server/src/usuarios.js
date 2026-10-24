// Usuarios: registro y login con usuario:contrasena, y un token de subida de 32
// caracteres por cuenta (para el script opcional de subida automatica).
//
// Cada cuenta se guarda en el almacen (tipo "usuario", clave = usuario en
// minusculas, no distingue mayusculas al entrar):
//   { "nombre": "Pepe", "hash": "...", "sal": "...", "token": "32 hex", "creado": "ISO" }
//
// La sesion es una cookie firmada con HMAC: "usuario.caducidad.firma". El
// secreto sale de SESSION_SECRET o se genera una vez y se guarda en el almacen
// (tipo "config"), asi las sesiones sobreviven a los reinicios.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const COOKIE = "bo2jodas_sesion";
// Cuentas que pueden borrar partidas (clave en minusculas). Se pueden anadir
// mas con la variable ADMINS="usuario1,usuario2".
const ADMINS = new Set(["lalay", ...(process.env.ADMINS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)]);
const DIAS_SESION = 90;
const USUARIO_RE = /^[a-zA-Z0-9_]{3,20}$/;

export class Usuarios {
  constructor(almacen) {
    this.almacen = almacen;
    this.porUsuario = new Map(); // clave minusculas -> registro
    this.porToken = new Map(); // token -> clave
    this.intentos = new Map(); // ip -> { n, hasta }
    this.secreto = null;
  }

  static async crear(almacen) {
    const u = new Usuarios(almacen);
    for (const [clave, reg] of await almacen.todos("usuario")) {
      if (!reg || !reg.hash) continue;
      u.porUsuario.set(clave, reg);
      if (reg.token) u.porToken.set(reg.token, clave);
    }
    u.secreto = await cargarSecreto(almacen);
    return u;
  }

  guardar(clave) {
    return this.almacen.guardar("usuario", clave, this.porUsuario.get(clave));
  }

  get total() {
    return this.porUsuario.size;
  }

  // ------------------------------------------------------------ cuentas
  validarCredenciales(usuario, contrasena) {
    if (typeof usuario !== "string" || !USUARIO_RE.test(usuario)) {
      return "el usuario tiene que tener de 3 a 20 letras, numeros o _";
    }
    if (typeof contrasena !== "string" || contrasena.length < 6 || contrasena.length > 200) {
      return "la contrasena tiene que tener al menos 6 caracteres";
    }
    return null;
  }

  async registrar(usuario, contrasena) {
    const error = this.validarCredenciales(usuario, contrasena);
    if (error) return { error };
    const clave = usuario.toLowerCase();
    if (this.porUsuario.has(clave)) return { error: "ese usuario ya existe" };
    const sal = randomBytes(16).toString("hex");
    const u = {
      nombre: usuario,
      hash: hashContrasena(contrasena, sal),
      sal,
      token: this.tokenNuevo(),
      creado: new Date().toISOString(),
    };
    this.porUsuario.set(clave, u);
    this.porToken.set(u.token, clave);
    try {
      await this.guardar(clave);
    } catch (e) {
      this.porUsuario.delete(clave);
      this.porToken.delete(u.token);
      throw e;
    }
    return { usuario: u };
  }

  entrar(usuario, contrasena) {
    if (typeof usuario !== "string" || typeof contrasena !== "string") return { error: "faltan datos" };
    const clave = usuario.toLowerCase();
    const u = this.porUsuario.get(clave);
    // Se calcula siempre el hash para no delatar por tiempo si el usuario existe.
    const hashDado = hashContrasena(contrasena, u ? u.sal : "0".repeat(32));
    const ok = u && iguales(hashDado, u.hash);
    if (!ok) return { error: "usuario o contrasena incorrectos" };
    return { usuario: u };
  }

  async cambiarContrasena(clave, actual, nueva) {
    const u = this.porUsuario.get(clave);
    if (!u) return { error: "no existe" };
    if (!iguales(hashContrasena(String(actual), u.sal), u.hash)) return { error: "la contrasena actual no es correcta" };
    const error = this.validarCredenciales(u.nombre, nueva);
    if (error) return { error };
    u.sal = randomBytes(16).toString("hex");
    u.hash = hashContrasena(nueva, u.sal);
    await this.guardar(clave);
    return { ok: true };
  }

  async regenerarToken(clave) {
    const u = this.porUsuario.get(clave);
    if (!u) return null;
    this.porToken.delete(u.token);
    u.token = this.tokenNuevo();
    this.porToken.set(u.token, clave);
    await this.guardar(clave);
    return u.token;
  }

  tokenNuevo() {
    let t;
    do t = randomBytes(16).toString("hex"); // 32 caracteres
    while (this.porToken.has(t));
    return t;
  }

  esAdmin(clave) {
    return Boolean(clave) && this.porUsuario.has(clave) && ADMINS.has(clave);
  }

  // Para la subida: devuelve el nombre del dueno del token o null.
  duenoDelToken(token) {
    if (typeof token !== "string") return null;
    const clave = this.porToken.get(token.trim());
    return clave ? this.porUsuario.get(clave).nombre : null;
  }

  publico(clave) {
    const u = this.porUsuario.get(clave);
    if (!u) return null;
    return { usuario: u.nombre, token: u.token, creado: u.creado, admin: ADMINS.has(clave) };
  }

  // ------------------------------------------------------------ sesion
  firmar(clave) {
    const caduca = Date.now() + DIAS_SESION * 86400_000;
    const cuerpo = `${Buffer.from(clave).toString("base64url")}.${caduca}`;
    return `${cuerpo}.${this.hmac(cuerpo)}`;
  }

  hmac(texto) {
    return createHmac("sha256", this.secreto).update(texto).digest("base64url");
  }

  // Devuelve la clave del usuario de la cookie, o null.
  deCookie(req) {
    const valor = leerCookie(req.get("cookie"), COOKIE);
    if (!valor) return null;
    const partes = valor.split(".");
    if (partes.length !== 3) return null;
    const cuerpo = `${partes[0]}.${partes[1]}`;
    if (!iguales(this.hmac(cuerpo), partes[2])) return null;
    if (Number(partes[1]) < Date.now()) return null;
    const clave = Buffer.from(partes[0], "base64url").toString();
    return this.porUsuario.has(clave) ? clave : null;
  }

  ponerCookie(req, res, clave) {
    const seguro = req.secure || req.get("x-forwarded-proto") === "https";
    res.append(
      "set-cookie",
      `${COOKIE}=${this.firmar(clave)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DIAS_SESION * 86400}${seguro ? "; Secure" : ""}`
    );
  }

  quitarCookie(res) {
    res.append("set-cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  }

  // ------------------------------------------------------------ freno a fuerza bruta
  // 15 intentos fallidos por IP cada 10 minutos en login/registro.
  frenado(ip) {
    const r = this.intentos.get(ip);
    if (!r) return false;
    if (r.hasta < Date.now()) {
      this.intentos.delete(ip);
      return false;
    }
    return r.n >= 15;
  }

  fallo(ip) {
    const r = this.intentos.get(ip);
    if (r && r.hasta > Date.now()) r.n++;
    else this.intentos.set(ip, { n: 1, hasta: Date.now() + 10 * 60_000 });
    if (this.intentos.size > 10000) this.intentos.clear();
  }
}

function hashContrasena(contrasena, sal) {
  return scryptSync(contrasena, sal, 32).toString("hex");
}

function iguales(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function leerCookie(cabecera, nombre) {
  if (!cabecera) return null;
  for (const trozo of cabecera.split(";")) {
    const i = trozo.indexOf("=");
    if (i < 0) continue;
    if (trozo.slice(0, i).trim() === nombre) return trozo.slice(i + 1).trim();
  }
  return null;
}

async function cargarSecreto(almacen) {
  const env = process.env.SESSION_SECRET;
  if (env && env.length >= 16) return env;
  const guardado = (await almacen.todos("config")).find(([clave]) => clave === "sesion");
  const viejo = guardado && guardado[1] && guardado[1].secreto;
  if (typeof viejo === "string" && viejo.length >= 32) return viejo;
  const secreto = randomBytes(32).toString("hex");
  await almacen.guardar("config", "sesion", { secreto });
  return secreto;
}
