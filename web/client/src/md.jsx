// Markdown minimo para los textos que salen del README (wiki): titulos,
// parrafos, listas, tablas y en linea negrita, cursiva y codigo. Los enlaces
// se quedan en texto (apuntan a anclas del README, no de la web).

const EN_LINEA = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

export function enLinea(texto) {
  const partes = [];
  let ultimo = 0;
  let m;
  const re = new RegExp(EN_LINEA); // copia: enLinea se llama a si misma
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const t = m[0];
    const k = m.index;
    if (t.startsWith("**")) partes.push(<b key={k}>{enLinea(t.slice(2, -2))}</b>);
    else if (t.startsWith("`")) partes.push(<code key={k}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) partes.push(t.slice(1, t.indexOf("]")));
    else partes.push(<i key={k}>{t.slice(1, -1)}</i>);
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

const ES_TITULO = /^(#{2,6})\s+(.*)/;
const ES_ITEM = /^\s*(-|\d+\.)\s+/;
const celdas = (f) => f.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function Markdown({ texto }) {
  const lineas = texto.split("\n");
  const bloques = [];
  let i = 0;
  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    const t = l.match(ES_TITULO);
    if (t) {
      bloques.push(<h3 key={i} className="md-titulo">{enLinea(t[2])}</h3>);
      i++;
      continue;
    }
    if (l.startsWith("|")) {
      const inicio = i;
      const filas = [];
      while (i < lineas.length && lineas[i].startsWith("|")) filas.push(lineas[i++]);
      const cab = celdas(filas[0]);
      const cuerpo = filas.slice(2).map(celdas);
      bloques.push(
        <div className="tabla-env md-tabla" key={inicio}>
          <table className="tabla">
            {cab.some(Boolean) && <thead><tr>{cab.map((c, j) => <th key={j}>{enLinea(c)}</th>)}</tr></thead>}
            <tbody>{cuerpo.map((f, r) => <tr key={r}>{f.map((c, j) => <td key={j}>{enLinea(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (ES_ITEM.test(l)) {
      const inicio = i;
      const numerada = /^\s*\d+\./.test(l);
      const items = [];
      while (i < lineas.length && ES_ITEM.test(lineas[i])) items.push(lineas[i++].replace(ES_ITEM, ""));
      const Lista = numerada ? "ol" : "ul";
      bloques.push(<Lista key={inicio} className="md-lista">{items.map((x, j) => <li key={j}>{enLinea(x)}</li>)}</Lista>);
      continue;
    }
    const inicio = i;
    const p = [];
    while (i < lineas.length && lineas[i].trim() && !ES_TITULO.test(lineas[i]) && !lineas[i].startsWith("|") && !ES_ITEM.test(lineas[i])) p.push(lineas[i++].trim());
    bloques.push(<p key={inicio} className="md-p">{enLinea(p.join(" "))}</p>);
  }
  return <div className="md">{bloques}</div>;
}
