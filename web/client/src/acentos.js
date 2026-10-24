// El mod escribe los textos en ASCII (el juego no pinta tildes). En la web se
// muestran bien escritos: palabra a palabra, respetando mayusculas.
const PALABRAS = {
  fosforo: "fósforo", polvora: "pólvora", halcon: "halcón", critico: "crítico", reaccion: "reacción", botin: "botín",
  corazon: "corazón", iman: "imán", trebol: "trébol", punteria: "puntería", ultimas: "últimas", ultimo: "último",
  pirotecnico: "pirotécnico", elites: "élites", interes: "interés", plutocrata: "plutócrata", economica: "económica",
  ciclon: "ciclón", fria: "fría", medico: "médico", magico: "mágico", rapidas: "rápidas", regeneracion: "regeneración",
  fenix: "fénix", automaticas: "automáticas", baston: "bastón", mitica: "mítica", miticas: "míticas", dano: "daño",
  municion: "munición", maxima: "máxima", maximo: "máximo", mas: "más", rafaga: "ráfaga",
  camara: "cámara", proposito: "propósito", rapido: "rápido", rapida: "rápida", tambien: "también",
  energia: "energía", explosion: "explosión", cinturon: "cinturón", pulsacion: "pulsación",
  angel: "ángel", leon: "león", jabali: "jabalí", balistico: "balístico", mecanico: "mecánico", electrico: "eléctrico",
  segun: "según", dificil: "difícil", facil: "fácil", puas: "púas", danas: "dañas", vacio: "vacío", tipico: "típico",
};

export function acentuar(texto) {
  if (!texto) return texto;
  return texto.replace(/[A-Za-z]+/g, (p) => {
    const t = PALABRAS[p.toLowerCase()];
    if (!t) return p;
    if (p === p.toUpperCase() && p.length > 1) return t.toUpperCase();
    if (p[0] === p[0].toUpperCase()) return t[0].toUpperCase() + t.slice(1);
    return t;
  });
}
