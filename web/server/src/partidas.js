// Calculo de resumenes, leaderboards y totales a partir de las partidas.
// Formato del JSON: ver mod/scripts/zm/bo2jodas_stats.gsc.

export function validar(p) {
  if (!p || typeof p !== "object") return "cuerpo vacio";
  if (!Array.isArray(p.jugadores) || p.jugadores.length === 0) return "sin jugadores";
  if (typeof p.ronda !== "number") return "sin ronda";
  for (const j of p.jugadores) {
    if (!j || typeof j.nombre !== "string" || !j.nombre.trim()) return "jugador sin nombre";
  }
  return null;
}

export function resumen(p) {
  return {
    id: p.id,
    fecha: p.fecha,
    mapa: p.mapa,
    sitio: p.sitio,
    ronda: p.ronda,
    duracion_s: p.duracion_s,
    version: p.version,
    subido_por: p.subido_por,
    jugadores: p.jugadores.map((j) => ({
      nombre: j.nombre,
      clase: j.clase,
      arquetipo: j.arquetipo,
      mitica: j.mitica,
      nivel: j.nivel,
      bajas: j.bajas,
      cabezas: j.cabezas,
      caidas: j.caidas,
      danio_total: j.danio_total,
      puntos_total: j.puntos_total,
      // Lo justo para pintar la build: id, valor acumulado y veces cogida.
      cartas: (j.cartas || []).map((c) => ({ id: c.id, valor: c.valor, veces: c.veces })),
    })),
    jefes_muertos: p.jefes_muertos,
  };
}

// Perfil de un jugador: sus partidas (resumen) y las cartas que mas usa.
export function jugador(partidas, nombre) {
  const suyas = partidas.filter((p) => p.jugadores.some((j) => j.nombre === nombre));
  if (!suyas.length) return null;
  const cartas = {};
  const clases = {};
  const arquetipos = {};
  const miticas = {};
  const t = { partidas: suyas.length, bajas: 0, cabezas: 0, caidas: 0, reanimaciones: 0, danio_total: 0, segundos: 0, mejorRonda: 0, mejorPartida: null, nivelMax: 0, comboMax: 0 };
  for (const p of suyas) {
    const j = p.jugadores.find((x) => x.nombre === nombre);
    t.bajas += j.bajas || 0;
    t.cabezas += j.cabezas || 0;
    t.caidas += j.caidas || 0;
    t.reanimaciones += j.reanimaciones || 0;
    t.danio_total += j.danio_total || 0;
    t.segundos += p.duracion_s || 0;
    t.nivelMax = Math.max(t.nivelMax, j.nivel || 0);
    t.comboMax = Math.max(t.comboMax, j.max_combo || 0);
    if (p.ronda > t.mejorRonda) {
      t.mejorRonda = p.ronda;
      t.mejorPartida = p.id;
    }
    if (j.clase) clases[j.clase] = (clases[j.clase] || 0) + 1;
    if (j.arquetipo) arquetipos[j.arquetipo] = (arquetipos[j.arquetipo] || 0) + 1;
    if (j.mitica) miticas[j.mitica] = (miticas[j.mitica] || 0) + 1;
    for (const c of j.cartas || []) {
      const x = cartas[c.id] || { id: c.id, partidas: 0, veces: 0, danio: 0 };
      x.partidas++;
      x.veces += c.veces || 0;
      x.danio += (j.danio_cartas && j.danio_cartas[c.id]) || 0;
      cartas[c.id] = x;
    }
  }
  return {
    nombre,
    totales: t,
    clases,
    arquetipos,
    miticas,
    cartas: Object.values(cartas).sort((a, b) => b.partidas - a.partidas || b.veces - a.veces),
    partidas: suyas.map(resumen).sort((a, b) => (b.fecha > a.fecha ? 1 : -1)),
  };
}

function mejor(lista, clave) {
  // Mejor entrada por clave: mayor ronda; a igual ronda, la mas antigua (fue la primera en lograrlo).
  const mapa = new Map();
  for (const e of lista) {
    const k = clave(e);
    if (!k) continue;
    const actual = mapa.get(k);
    if (!actual || e.ronda > actual.ronda || (e.ronda === actual.ronda && e.fecha < actual.fecha)) mapa.set(k, e);
  }
  return [...mapa.values()].sort((a, b) => b.ronda - a.ronda || (a.fecha < b.fecha ? -1 : 1));
}

function entradas(partidas) {
  // Una entrada por jugador y partida.
  const out = [];
  for (const p of partidas) {
    for (const j of p.jugadores) {
      out.push({
        partida: p.id,
        fecha: p.fecha,
        mapa: p.mapa,
        ronda: p.ronda,
        duracion_s: p.duracion_s,
        jugadores_n: p.jugadores.length,
        nombre: j.nombre,
        clase: j.clase || "",
        arquetipo: j.arquetipo || "",
        mitica: j.mitica || "",
        nivel: j.nivel || 0,
        bajas: j.bajas || 0,
        cabezas: j.cabezas || 0,
        caidas: j.caidas || 0,
        reanimaciones: j.reanimaciones || 0,
        danio_total: j.danio_total || 0,
        puntos_total: j.puntos_total || 0,
        max_combo: j.max_combo || 0,
        cartas: (j.cartas || []).map((c) => c.id),
      });
    }
  }
  return out;
}

function historiaRecord(lista) {
  // Como fue cayendo el record de ronda del grupo: cada vez que una partida supero
  // la mejor ronda hasta entonces, quien la hizo y a quien le quito el record.
  const porFecha = [...lista].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const historia = [];
  let record = 0;
  let poseedores = [];
  for (const e of porFecha) {
    if (e.ronda > record) {
      historia.push({ fecha: e.fecha, partida: e.partida, ronda: e.ronda, anterior: record, anteriores: poseedores, nuevos: [e.nombre] });
      record = e.ronda;
      poseedores = [e.nombre];
    } else if (e.ronda === record && record > 0 && !poseedores.includes(e.nombre)) {
      poseedores.push(e.nombre);
      historia[historia.length - 1].nuevos = [...poseedores];
    }
  }
  return historia.reverse();
}

function top(lista, clave, n = 10) {
  return [...lista].sort((a, b) => b[clave] - a[clave]).slice(0, n);
}

export function leaderboards(partidas) {
  const lista = entradas(partidas);
  return {
    mejorRonda: mejor(lista, (e) => e.nombre),
    porClase: mejor(lista, (e) => (e.clase ? `${e.clase}|${e.nombre}` : null)),
    porArquetipo: mejor(lista, (e) => (e.arquetipo ? `${e.arquetipo}|${e.nombre}` : null)),
    mejorPartida: mejor(partidas.map((p) => ({ ...resumen(p), partida: p.id })), (e) => "unica").slice(0, 1),
    records: {
      danio: top(lista, "danio_total", 5),
      bajas: top(lista, "bajas", 5),
      nivel: top(lista, "nivel", 5),
      combo: top(lista, "max_combo", 5),
      cabezas: top(lista, "cabezas", 5),
      puntos: top(lista, "puntos_total", 5),
      reanimaciones: top(lista, "reanimaciones", 5),
    },
    historia: historiaRecord(lista),
    partidasMasLargas: [...partidas].map(resumen).sort((a, b) => b.ronda - a.ronda || b.duracion_s - a.duracion_s).slice(0, 10),
  };
}

export function totales(partidas) {
  const lista = entradas(partidas);
  const jugadores = new Map();
  for (const e of lista) {
    const j = jugadores.get(e.nombre) || { nombre: e.nombre, partidas: 0, bajas: 0, caidas: 0, reanimaciones: 0, danio_total: 0, mejorRonda: 0, clases: {}, arquetipos: {} };
    j.partidas++;
    j.bajas += e.bajas;
    j.caidas += e.caidas;
    j.reanimaciones += e.reanimaciones;
    j.danio_total += e.danio_total;
    j.mejorRonda = Math.max(j.mejorRonda, e.ronda);
    if (e.clase) j.clases[e.clase] = (j.clases[e.clase] || 0) + 1;
    if (e.arquetipo) j.arquetipos[e.arquetipo] = (j.arquetipos[e.arquetipo] || 0) + 1;
    jugadores.set(e.nombre, j);
  }
  const cartas = {};
  for (const p of partidas) {
    for (const j of p.jugadores) {
      for (const c of j.cartas || []) {
        const x = cartas[c.id] || { id: c.id, nombre: c.nombre, arquetipo: c.arquetipo, veces: 0, partidas: 0, danio: 0 };
        x.veces += c.veces || 0;
        x.partidas++;
        x.danio += (j.danio_cartas && j.danio_cartas[c.id]) || 0;
        cartas[c.id] = x;
      }
    }
  }
  return {
    partidas: partidas.length,
    jugadores: [...jugadores.values()].sort((a, b) => b.mejorRonda - a.mejorRonda),
    cartas: Object.values(cartas).sort((a, b) => b.partidas - a.partidas),
  };
}
