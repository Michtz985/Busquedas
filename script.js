// ===================== LÓGICA (misma del código Java) =====================
const N = 28;
const POS = new Array(N + 1);
POS[1]=[567,632];POS[2]=[439,347];POS[3]=[588,288];POS[4]=[390,519];POS[5]=[158,232];POS[6]=[574,581];
POS[7]=[283,41];POS[8]=[325,282];POS[9]=[394,441];POS[10]=[532,382];POS[11]=[18,12];POS[12]=[481,385];
POS[13]=[336,540];POS[14]=[665,186];POS[15]=[237,318];POS[16]=[604,516];POS[17]=[496,490];POS[18]=[558,184];
POS[19]=[627,457];POS[20]=[657,519];POS[21]=[500,206];POS[22]=[506,316];POS[23]=[651,356];POS[24]=[310,408];
POS[25]=[669,502];POS[26]=[556,516];POS[27]=[408,193];POS[28]=[399,299];

const ARISTAS = [
  [11,7,696],[11,5,705],[7,27,475],[7,8,662],[5,15,220],[15,8,309],[15,24,286],
  [8,27,268],[27,21,262],[27,28,390],[21,28,380],[21,18,89],[21,22,449],[18,3,291],
  [14,3,317],[14,23,499],[3,23,235],[3,19,638],[28,22,190],[28,9,320],[22,2,171],
  [22,23,401],[2,12,137],[2,9,245],[12,10,54],[10,16,381],[23,19,391],[24,9,214],[24,13,446],
  [9,4,202],[9,17,321],[17,26,259],[26,16,66],[19,16,95],[16,20,123],
  [16,6,288],[6,1,117],[4,13,98],[4,1,701],[13,1,699]
];
const DIRIGIDAS = [[18,14,328],[28,8,310],[28,2,131],[16,25,118],[20,25,33]];

const vecinos = new Map();
const pesos = new Map();
for (let i = 1; i <= N; i++) vecinos.set(i, []);
for (const a of ARISTAS) {
  vecinos.get(a[0]).push(a[1]);
  vecinos.get(a[1]).push(a[0]);
  pesos.set(a[0] + "-" + a[1], a[2]);
  pesos.set(a[1] + "-" + a[0], a[2]);
}
for (const a of DIRIGIDAS) {
  vecinos.get(a[0]).push(a[1]);
  pesos.set(a[0] + "-" + a[1], a[2]);
}

// Registro de eventos para la animación (no altera el algoritmo)
let EV = [];

function anguloHorario(desde, hacia) {
  const dx = POS[hacia][0] - POS[desde][0];
  const dy = POS[hacia][1] - POS[desde][1];
  let ang = Math.atan2(dx, -dy);
  if (ang < 0) ang += 2 * Math.PI;
  return ang;
}

function vecinosOrdenados(nodo, horario) {
  const lista = [...vecinos.get(nodo)];
  lista.sort((a, b) => {
    const aa = anguloHorario(nodo, a);
    const ab = anguloHorario(nodo, b);
    return horario ? aa - ab : ab - aa;
  });
  return lista;
}

// ---------------------- DFS ----------------------
function dfs(actual, meta, horario, visitado, ruta, orden) {
  EV.push({ t: "v", n: actual, from: ruta.length ? ruta[ruta.length - 1] : null });
  visitado[actual] = true;
  orden.push(actual);
  ruta.push(actual);
  if (actual === meta) return true;
  for (const v of vecinosOrdenados(actual, horario)) {
    if (!visitado[v] && dfs(v, meta, horario, visitado, ruta, orden)) return true;
  }
  ruta.pop(); // retroceso
  EV.push({ t: "b", n: actual, to: ruta.length ? ruta[ruta.length - 1] : null });
  return false;
}

function busquedaProfunda(inicio, meta, horario, orden) {
  const ruta = [];
  const visitado = new Array(N + 1).fill(false);
  return dfs(inicio, meta, horario, visitado, ruta, orden) ? ruta : null;
}

// ---------------------- BFS ----------------------
function busquedaAncho(inicio, meta, horario, orden) {
  const visitado = new Array(N + 1).fill(false);
  const padre = new Array(N + 1).fill(0);
  const cola = [];
  cola.push(inicio);
  visitado[inicio] = true;
  padre[inicio] = -1;
  while (cola.length) {
    const actual = cola.shift();
    orden.push(actual);
    EV.push({ t: "v", n: actual, from: padre[actual] === -1 ? null : padre[actual] });
    if (actual === meta) {
      const ruta = [];
      for (let n = meta; n !== -1; n = padre[n]) ruta.unshift(n);
      return ruta;
    }
    for (const v of vecinosOrdenados(actual, horario)) {
      if (!visitado[v]) {
        visitado[v] = true;
        padre[v] = actual;
        cola.push(v);
        EV.push({ t: "q", from: actual, to: v });
      }
    }
  }
  return null;
}

function costo(ruta) {
  let total = 0;
  for (let i = 0; i + 1 < ruta.length; i++) total += pesos.get(ruta[i] + "-" + ruta[i + 1]);
  return total;
}
function texto(lista) { return lista.join(" -> "); }

// ===================== MÉTODOS HEURÍSTICOS (nuevos) =====================
// h(n): distancia en línea recta (px) del nodo n a la meta
function h(n, meta) {
  return Math.hypot(POS[n][0] - POS[meta][0], POS[n][1] - POS[meta][1]);
}
// Factor K = menor relación peso/distancia de todas las aristas; con él K*h nunca
// sobreestima el costo real y A* queda bien fundamentado
const K = (() => {
  let k = Infinity;
  for (const [a, b, w] of [...ARISTAS, ...DIRIGIDAS]) {
    k = Math.min(k, w / Math.hypot(POS[a][0] - POS[b][0], POS[a][1] - POS[b][1]));
  }
  return k;
})();
let NOTA = "";

function camino(padre, meta) {
  const ruta = [];
  for (let n = meta; n !== -1; n = padre[n]) ruta.unshift(n);
  return ruta;
}

// ---------------------- ESCALADA (simple) ----------------------
// Avanza al primer vecino (en el sentido elegido) que mejora h. Sin retroceso.
function escalada(inicio, meta, horario, orden) {
  const ruta = [inicio];
  let actual = inicio;
  EV.push({ t: "v", n: inicio, from: null });
  orden.push(inicio);
  while (actual !== meta) {
    let sig = null;
    for (const v of vecinosOrdenados(actual, horario)) {
      if (ruta.includes(v)) continue;
      EV.push({ t: "q", from: actual, to: v });
      if (h(v, meta) < h(actual, meta)) { sig = v; break; }
    }
    if (sig === null) {
      NOTA = "Se detuvo en un máximo local (nodo " + actual + "): ningún vecino se acerca más a la meta.";
      return null;
    }
    EV.push({ t: "v", n: sig, from: actual });
    orden.push(sig);
    ruta.push(sig);
    actual = sig;
  }
  return ruta;
}

// ---------------------- ESCALADA PROFUNDA ----------------------
// DFS con retroceso que explora primero el vecino con menor h (empates: orden angular).
function dfsHeuristico(actual, meta, horario, visitado, ruta, orden) {
  EV.push({ t: "v", n: actual, from: ruta.length ? ruta[ruta.length - 1] : null });
  visitado[actual] = true;
  orden.push(actual);
  ruta.push(actual);
  if (actual === meta) return true;
  const vec = vecinosOrdenados(actual, horario).sort((a, b) => h(a, meta) - h(b, meta));
  for (const v of vec) {
    if (!visitado[v] && dfsHeuristico(v, meta, horario, visitado, ruta, orden)) return true;
  }
  ruta.pop();
  EV.push({ t: "b", n: actual, to: ruta.length ? ruta[ruta.length - 1] : null });
  return false;
}
function escaladaProfunda(inicio, meta, horario, orden) {
  const ruta = [];
  const visitado = new Array(N + 1).fill(false);
  return dfsHeuristico(inicio, meta, horario, visitado, ruta, orden) ? ruta : null;
}

// ---------------------- MEJOR PRIMERO (Best-First) ----------------------
// Lista abierta global: siempre expande el nodo con menor h.
function mejorPrimero(inicio, meta, horario, orden) {
  const padre = new Array(N + 1).fill(0);
  const enAbierta = new Array(N + 1).fill(false);
  const abierta = [inicio];
  enAbierta[inicio] = true;
  padre[inicio] = -1;
  while (abierta.length) {
    let mi = 0;
    for (let i = 1; i < abierta.length; i++) if (h(abierta[i], meta) < h(abierta[mi], meta)) mi = i;
    const actual = abierta.splice(mi, 1)[0];
    orden.push(actual);
    EV.push({ t: "v", n: actual, from: padre[actual] === -1 ? null : padre[actual] });
    if (actual === meta) return camino(padre, meta);
    for (const v of vecinosOrdenados(actual, horario)) {
      if (!enAbierta[v]) {
        enAbierta[v] = true;
        padre[v] = actual;
        abierta.push(v);
        EV.push({ t: "q", from: actual, to: v });
      }
    }
  }
  return null;
}

// ---------------------- HEURÍSTICA (A*) ----------------------
// f(n) = g(n) + K*h(n): costo recorrido + estimación al final.
function aEstrella(inicio, meta, horario, orden) {
  const g = new Array(N + 1).fill(Infinity);
  const padre = new Array(N + 1).fill(0);
  const cerrado = new Array(N + 1).fill(false);
  const f = n => g[n] + K * h(n, meta);
  g[inicio] = 0;
  padre[inicio] = -1;
  const abierta = [inicio];
  while (abierta.length) {
    let mi = 0;
    for (let i = 1; i < abierta.length; i++) if (f(abierta[i]) < f(abierta[mi])) mi = i;
    const actual = abierta.splice(mi, 1)[0];
    cerrado[actual] = true;
    orden.push(actual);
    EV.push({ t: "v", n: actual, from: padre[actual] === -1 ? null : padre[actual] });
    if (actual === meta) return camino(padre, meta);
    for (const v of vecinosOrdenados(actual, horario)) {
      const ng = g[actual] + pesos.get(actual + "-" + v);
      if (ng < g[v]) {
        g[v] = ng;
        padre[v] = actual;
        cerrado[v] = false;
        if (!abierta.includes(v)) abierta.push(v);
        EV.push({ t: "q", from: actual, to: v });
      }
    }
  }
  return null;
}

const ALG = {
  1: ["profunda", busquedaProfunda],
  2: ["a lo ancho", busquedaAncho],
  3: ["heurística (A*)", aEstrella],
  4: ["por escalada", escalada],
  5: ["por escalada profunda", escaladaProfunda],
  6: ["mejor primero", mejorPrimero]
};

// ===================== VISUALIZADOR =====================
const NS = "http://www.w3.org/2000/svg", R = 15;
const svg = document.getElementById("g");
const edgeEl = new Map(), nodeEl = new Map();
const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };

const defs = mk("defs", {}, svg);
const mkr = mk("marker", { id: "ar", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, defs);
mk("path", { d: "M0 0L10 5L0 10z", fill: "#9aa0aa" }, mkr);

function drawEdge(a, b, w, dir) {
  const [x1, y1] = POS[a], [x2, y2] = POS[b];
  const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d;
  const ex = dir ? x2 - ux * (R + 4) : x2, ey = dir ? y2 - uy * (R + 4) : y2;
  const l = mk("line", { x1, y1, x2: ex, y2: ey, class: "edge" }, svg);
  if (dir) l.setAttribute("marker-end", "url(#ar)");
  const t = mk("text", { x: (x1 + x2) / 2, y: (y1 + y2) / 2, class: "w", "text-anchor": "middle", "dominant-baseline": "central" }, svg);
  t.textContent = w;
  return l;
}
const keyU = (a, b) => a < b ? a + "-" + b : b + "-" + a;
ARISTAS.forEach(([a, b, w]) => edgeEl.set(keyU(a, b), drawEdge(a, b, w, false)));
DIRIGIDAS.forEach(([a, b, w]) => edgeEl.set(a + ">" + b, drawEdge(a, b, w, true)));
for (let i = 1; i <= N; i++) {
  const g = mk("g", { class: "n" }, svg);
  mk("circle", { cx: POS[i][0], cy: POS[i][1], r: R }, g);
  mk("text", { x: POS[i][0], y: POS[i][1] }, g).textContent = i;
  nodeEl.set(i, g);
}
// Arista usada para ir de a hacia b (dirigida si existe, si no la bidireccional)
const edgeOf = (a, b) => edgeEl.get(a + ">" + b) || edgeEl.get(keyU(a, b));
const setN = (n, c) => { const e = nodeEl.get(n); e.setAttribute("class", "n " + c + (e.dataset.mark ? " " + e.dataset.mark : "")); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const $ = id => document.getElementById(id);
let token = 0;

function reset() {
  nodeEl.forEach(e => { e.setAttribute("class", "n"); e.dataset.mark = ""; });
  edgeEl.forEach(e => e.setAttribute("class", "edge"));
}
function setOut(h) { $("out").innerHTML = h; }
$("dly").oninput = () => $("dv").textContent = $("dly").value;
$("stop").onclick = () => { token++; $("go").disabled = false; $("stop").disabled = true; };

$("go").onclick = async () => {
  const ini = parseInt($("ini").value, 10), fin = parseInt($("fin").value, 10);
  if (!(ini >= 1 && ini <= N) || !(fin >= 1 && fin <= N)) { setOut("Nodo inválido. Escribe un número entre 1 y " + N + "."); return; }
  const tipo = +$("tipo").value, horario = $("sent").value === "1";
  reset(); EV = []; NOTA = "";
  const orden = [];
  const ruta = ALG[tipo][1](ini, fin, horario, orden);
  const me = ++token;
  $("go").disabled = true; $("stop").disabled = false;
  nodeEl.get(ini).dataset.mark = "s"; nodeEl.get(fin).dataset.mark = "f";
  setN(ini, ""); setN(fin, "");
  const titulo = "Búsqueda " + ALG[tipo][0] + " " + (horario ? "horaria" : "antihoraria");
  const vis = []; let cur = null;
  const render = extra => setOut("<b>" + titulo + "</b><b>Orden de nodos visitados</b><span>" + (vis.join(" -> ") || "—") + "</span>" + (extra || ""));
  render();

  for (const ev of EV) {
    if (me !== token) return;
    const dl = +$("dly").value;
    if (ev.t === "q") {
      edgeOf(ev.from, ev.to).setAttribute("class", "edge q");
      const e = nodeEl.get(ev.to); if (!/ [vkc]/.test(" " + e.getAttribute("class"))) setN(ev.to, "q");
    } else if (ev.t === "v") {
      if (cur !== null) setN(cur, "v");
      cur = ev.n; vis.push(ev.n);
      if (ev.from !== null) edgeOf(ev.from, ev.n).setAttribute("class", "edge t");
      setN(ev.n, "c"); render();
    } else if (ev.t === "b") {
      setN(ev.n, "k");
      const e1 = ev.to !== null ? edgeOf(ev.to, ev.n) : null;
      if (e1) e1.setAttribute("class", "edge b");
      if (ev.to !== null) { cur = ev.to; setN(cur, "c"); } else cur = null;
    }
    await sleep(dl);
  }
  if (me !== token) return;
  if (cur !== null) setN(cur, "v");
  if (ruta === null) { render("<b>Resultado</b>" + (NOTA || "No existe ruta entre " + ini + " y " + fin + ".")); }
  else {
    for (let i = 0; i < ruta.length; i++) {
      if (me !== token) return;
      setN(ruta[i], "p");
      if (i > 0) edgeOf(ruta[i - 1], ruta[i]).setAttribute("class", "edge p");
      await sleep(Math.max(150, +$("dly").value / 2));
    }
    render("<b>Ruta encontrada</b><span>" + texto(ruta) + "</span><b>Resumen</b>Nodos en la ruta: " + ruta.length + " | Costo total: " + costo(ruta));
  }
  $("go").disabled = false; $("stop").disabled = true;
};

// ===================== PWA: botón "Descargar" =====================
// El botón empieza oculto. Solo aparece si el navegador permite instalar la app,
// y se oculta al instalarla, al abrirla ya instalada o al aceptar la instalación.
let evInstalar = null;
const btnInst = $("instalar"), ayudaIos = $("ayuda-ios");
const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const esIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

if (!instalada()) {
  if (esIos) btnInst.hidden = false; // iOS no avisa: se muestra la guía manual
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    evInstalar = e;
    btnInst.hidden = false;
  });
}

btnInst.onclick = async () => {
  if (evInstalar) {
    evInstalar.prompt();
    const r = await evInstalar.userChoice;
    evInstalar = null;
    if (r.outcome === "accepted") btnInst.hidden = true;
  } else if (esIos) {
    ayudaIos.hidden = !ayudaIos.hidden;
  }
};

window.addEventListener("appinstalled", () => {
  evInstalar = null;
  btnInst.hidden = true;
  ayudaIos.hidden = true;
});
matchMedia("(display-mode: standalone)").addEventListener("change", e => { if (e.matches) btnInst.hidden = true; });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
