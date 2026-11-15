/* El CookBook de la familia — edición de solo lectura.
   Las recetas vienen de datos/recetas.json, que genera Herramientas/familia/publicar.py
   desde el CookBook de casa. Aquí no se guarda ni se cambia nada. */
"use strict";

const app = document.getElementById("app");
let D = null;            // datos publicados
let porId = new Map();   // receta por su id

// ------------------------------------------------------------------ utilidades
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const enc = encodeURIComponent;
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/** Minúsculas y sin tildes, para que "habichuela" encuentre "Habichuelá". */
const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC").toLowerCase().trim();
const palabras = t => new Set(norm(t).split(/[^\p{L}\p{Nd}]+/u).filter(w => w.length > 0));
/** "huevo" encuentra "huevos", "pan" encuentra "panes", pero "sal" no encuentra "ensalada". */
const tienePalabra = (ws, q) => ws.has(q) || ws.has(q + "s") || ws.has(q + "es") ||
  (q.length > 3 && q.endsWith("s") && ws.has(q.slice(0, -1))) ||
  (q.length > 4 && q.endsWith("es") && ws.has(q.slice(0, -2)));
const tieneTodas = (ws, termino) => [...palabras(termino)].every(w => tienePalabra(ws, w));
const terminos = csv => (csv || "").split(/[,;]/).map(norm).filter(t => t.length > 0);
const cmpTitulo = (a, b) => norm(a.t) < norm(b.t) ? -1 : norm(a.t) > norm(b.t) ? 1 : 0;

// ------------------------------------------------------------------ iconos (igual que Iconos.cs)
function icono(grupo, opcion) {
  if (opcion === "Otros") return "🍽️";
  if (opcion && opcion.endsWith("(general)")) return icono(grupo);
  const clave = opcion ? `${grupo}/${opcion}` : grupo;
  return D.iconos[clave] ?? (opcion ?? grupo).charAt(0);
}
function dibujo(ic) {
  if (ic.startsWith("iconos/")) return `<image href="${esc(ic)}" x="10" y="10" width="80" height="80" />`;
  const img = D.iconos3d[ic];
  if (img) return `<image href="${esc(img)}" x="6" y="6" width="88" height="88" />`;
  return `<g><text x="50" y="54" text-anchor="middle" dominant-baseline="central" font-size="72">${esc(ic)}</text></g>`;
}

// ------------------------------------------------------------------ clasificación
const EJES = [
  { key: "tipo", titulo: "Por Tipo de Plato", img: "portada/tipo-de-plato.svg", q1: "tipo", q2: "subtipo", g: "tp", o: "stp", pregunta: "¿Qué tipo de plato?" },
  { key: "categoria", titulo: "Por Categoría", img: "portada/categoria.svg", q1: "categoria", q2: "subcategoria", g: "ca", o: "sca", pregunta: "¿De qué categoría?" },
  { key: "cocina", titulo: "Por Tipo de Cocina", img: "portada/tipo-de-cocina.svg", q1: "cocina", q2: "subcocina", g: "co", o: "sco", pregunta: "¿Qué tipo de cocina?" },
];
const grupos = eje => D.clasificacion[eje.key];

// ------------------------------------------------------------------ cantidades (igual que RecipeScaler.cs)
const redondea = (v, paso) => Math.round(v / paso + 1e-9) * paso;
function escala(q, u, modo, fraccionable, factor) {
  if (q == null) return null;
  if (modo !== "proporcional" || factor === 1) return q;
  const v = q * factor;
  let r;
  switch (u) {
    case "g": case "ml":
      r = v < 10 ? redondea(v, 1) : v <= 100 ? redondea(v, 5) : redondea(v, 10);
      return Math.max(r, 1);
    case "cs": case "cc": case "tz": case "vaso":
      r = redondea(v, v < 0.75 ? 0.25 : 0.5);
      return Math.max(r, 0.25);
    default: {
      const paso = fraccionable ? 0.5 : 1;
      r = redondea(v, paso);
      return Math.max(r, paso);
    }
  }
}
const FRAC = [[0, ""], [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]];
function fraccionCercana(f) {
  let mejor = FRAC[0];
  for (const x of FRAC) if (Math.abs(x[0] - f) < Math.abs(mejor[0] - f)) mejor = x;
  return mejor;
}
function decimal(q, max) {
  const p = Math.pow(10, max);
  return String(Math.round(q * p + 1e-9) / p).replace(".", ",");
}
/** Enteros o fracciones de cocina (⅛ ¼ ⅓ ½ ⅔ ¾). */
function cantidad(q, snap = false) {
  let entero = Math.trunc(q);
  const f = q - entero;
  let m = fraccionCercana(f);
  if (snap || Math.abs(m[0] - f) < 0.02) {
    if (m[0] === 1) { entero += 1; m = FRAC[0]; }
    if (!m[1]) return String(entero);
    return (entero === 0 ? "" : String(entero)) + m[1];
  }
  return decimal(q, 1);
}
const ajustada = q => Math.trunc(q) + fraccionCercana(q - Math.trunc(q))[0];
function unidad(u, q) {
  const pl = q > 1;
  return { g: "g", ml: "ml", cs: pl ? "cucharadas soperas" : "cucharada sopera", cc: pl ? "cucharaditas de café" : "cucharadita de café",
    tz: pl ? "tazas" : "taza", vaso: pl ? "vasos" : "vaso" }[u] ?? "";
}
function importe(q, u) {
  switch (u) {
    case "g": return q >= 1000 ? decimal(q / 1000, 2) + " kg" : cantidad(q) + " g";
    case "ml": return q >= 1000 ? decimal(q / 1000, 2) + " l" : cantidad(q) + " ml";
    case "cs": case "cc": case "tz": case "vaso": return `${cantidad(q, true)} ${unidad(u, ajustada(q))}`;
    default: return cantidad(q, true);
  }
}
function lineaIngrediente(l, factor) {
  const q = escala(l.q, l.u, l.e, l.f, factor);
  const plural = q != null && ajustada(q) > 1;
  const nombre = plural && l.np ? l.np : l.n;
  let t;
  if (q == null) {
    if (l.qt) t = cap(l.qt) + " " + l.n;
    else {
      t = cap(l.n);
      if (l.e === "al_gusto" && !l.nota && !t.includes(" para ")) t += ", al gusto";
    }
  } else if (!l.u || l.u === "ud") t = `${cantidad(q, true)} ${nombre}`;
  else t = `${importe(q, l.u)} de ${l.n}`;
  const prep = plural && l.pp ? l.pp : l.p;
  if (prep) t += ", " + prep;
  return t;
}
const textoPaso = (t, factor) => t.replace(/\[\[([0-9.]+)\|([A-Za-z]+)\]\]/g, (_, q, u) => {
  const s = escala(parseFloat(q), u, "proporcional", true, factor) ?? parseFloat(q);
  return u === "ud" ? cantidad(s, true) : importe(s, u);
});
function duracion(d) {
  if (d <= 0) return "consumir en el día";
  if (d === 1) return "1 día";
  if (d < 14) return `${d} días`;
  if (d < 60) return d % 7 === 0 ? `${d / 7} semanas` : `${d} días`;
  return d % 30 === 0 ? (d === 30 ? "1 mes" : `${d / 30} meses`) : `${d} días`;
}
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function fecha(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${+m[3]} de ${MESES[+m[2] - 1]} de ${m[1]}` : "";
}

// ------------------------------------------------------------------ rutas (#/…)
function ruta() {
  const h = location.hash.replace(/^#/, "") || "/";
  const [camino, qs] = h.split("?");
  return { partes: camino.split("/").filter(Boolean).map(decodeURIComponent), q: new URLSearchParams(qs || "") };
}
function marcarNav(cual) {
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("active", a.dataset.nav === cual));
}
function pinta() {
  const { partes, q } = ruta();
  const principal = document.getElementById("principal");
  if (partes[0] === "receta" && partes[1]) { marcarNav(""); vistaReceta(partes[1]); }
  else if (partes[0] === "recetas") { marcarNav(q.get("buscar") ? "buscar" : "recetas"); vistaRecetas(q); }
  else if (partes[0] === "por" && partes[1]) { marcarNav(""); vistaEje(partes[1], partes[2]); }
  else { marcarNav("inicio"); vistaPortada(); }
  principal.scrollTop = 0;
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ portada
function vistaPortada() {
  document.title = "El CookBook de la familia";
  const n = D.recetas.length;
  const trucos = D.recetas.filter(r => r.truco).length;
  const ejemplos = eje => {
    const nombres = grupos(eje).filter(([g]) => D.recetas.some(r => r[eje.g] === g)).map(([g]) => g);
    return nombres.slice(0, 3).join(", ") + (nombres.length > 3 ? "…" : "");
  };
  app.innerHTML = `
    <section class="cb-hero">
      <h1>¿Qué te apetece cocinar?</h1>
      <p>Elige cómo quieres buscar entre las ${n} recetas de la familia.</p>
    </section>
    <div class="row row-cols-3 g-2 g-md-4">
      ${EJES.map(e => `<div class="col">
        <a class="cb-choice" href="#/por/${e.key}">
          <img src="${e.img}" alt="">
          <div class="cb-choice-body"><h2>${e.titulo}</h2><p>${esc(ejemplos(e))}</p></div>
        </a></div>`).join("")}
    </div>
    <div class="cb-home-actions cb-home-fam mt-4">
      <a class="btn btn-primary" href="#/recetas">📖 Ver todas las recetas (${n})</a>
      <a class="btn btn-outline-dark" href="#/recetas?tecnicas=1">🔪 Trucos (${trucos})</a>
      <a class="btn btn-outline-secondary" href="#/recetas?buscar=1">🔍 Buscar</a>
    </div>
    <p class="cb-pie-fam">Recetas actualizadas el ${fecha(D.generado)}.</p>`;
}

// ------------------------------------------------------------------ niveles 1 y 2 de un eje
function vistaEje(clave, nombreGrupo) {
  const eje = EJES.find(e => e.key === clave);
  if (!eje) return vistaPortada();
  const grupo = nombreGrupo ? grupos(eje).find(([g]) => g === nombreGrupo) : null;
  let titulo, todasHref, todasTxt, bloques;
  if (!grupo) {
    titulo = eje.pregunta;
    todasHref = "#/recetas";
    todasTxt = `Ver todas las recetas (${D.recetas.length})`;
    bloques = grupos(eje).map(([g, subs]) => ({
      valor: g, n: D.recetas.filter(r => r[eje.g] === g).length,
      href: subs.length === 0 ? `#/recetas?${eje.q1}=${enc(g)}` : `#/por/${eje.key}/${enc(g)}`,
      ic: icono(g),
    }));
  } else {
    const [g, subs] = grupo;
    const delGrupo = D.recetas.filter(r => r[eje.g] === g);
    titulo = `${g}: elige una opción`;
    todasHref = `#/recetas?${eje.q1}=${enc(g)}`;
    todasTxt = `Ver todas las recetas de ${g} (${delGrupo.length})`;
    bloques = subs.map(s => ({
      valor: s, n: delGrupo.filter(r => r[eje.o] === s).length,
      href: `#/recetas?${eje.q1}=${enc(g)}&${eje.q2}=${enc(s)}`, ic: icono(g, s),
    }));
  }
  bloques = bloques.filter(b => b.n > 0);
  document.title = (grupo ? grupo[0] : eje.titulo) + " · El CookBook de la familia";
  const filasAncho = Math.max(3, Math.ceil(bloques.length / 5));
  const filasAlto = Math.max(5, Math.ceil(bloques.length / 3));
  app.innerHTML = `<div class="cb-fit">
    <nav class="cb-crumbs" aria-label="Ruta">
      <a href="#/">Inicio</a><span>›</span>
      ${grupo ? `<a href="#/por/${eje.key}">${eje.titulo}</a><span>›</span><strong>${esc(grupo[0])}</strong>` : `<strong>${eje.titulo}</strong>`}
    </nav>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
      <h1 class="h4 mb-0">${esc(titulo)}</h1>
      <a class="btn btn-primary btn-sm" href="${todasHref}">${esc(todasTxt)}</a>
    </div>
    <div class="cb-fit-grid" style="--rows-wide:${filasAncho}; --rows-narrow:${filasAlto}">
      ${bloques.map(b => `<a class="cb-block" href="${b.href}">
        <div class="cb-block-ill-wrap"><svg class="cb-block-ill" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${dibujo(b.ic)}</svg></div>
        <div class="cb-block-label"><strong>${esc(b.valor)}</strong><span>${b.n === 1 ? "1 receta" : b.n + " recetas"}</span></div>
      </a>`).join("")}
    </div>
    ${bloques.length === 0 ? `<div class="alert alert-light border">Todavía no hay recetas clasificadas aquí.</div>` : ""}
  </div>`;
}

// ------------------------------------------------------------------ lista, buscador y filtros
const F = {};   // filtro actual
function filtroVacio() {
  Object.assign(F, { texto: "", con: "", sin: "", max: null, trucos: false,
    tp: new Set(), stp: new Set(), ca: new Set(), sca: new Set(), co: new Set(), sco: new Set(),
    dif: new Set(), die: new Set(), tem: new Set(), oca: new Set() });
}
const FACETAS = [
  ["dif", "Dificultad", r => [r.dif]],
  ["tp", "Tipo de plato", r => [r.tp]],
  ["ca", "Categoría", r => [r.ca]],
  ["sca", "Subcategoría", r => [r.sca]],
  ["co", "Tipo de cocina", r => [r.co]],
  ["sco", "País o región", r => [r.sco]],
  ["die", "Dieta (orientativa)", r => r.die],
  ["tem", "Temporada", r => r.tem],
  ["oca", "Ocasión", r => r.oca],
];
const enTitulo = (r, texto) => {
  const ws = [...palabras(texto)];
  if (ws.length === 0) return false;
  const t = palabras(r.t + " " + r.st);
  return ws.every(w => tienePalabra(t, w));
};
function cumple(r, sin) {
  const ok = (k, vals) => k === sin || F[k].size === 0 || vals.some(v => F[k].has(v));
  // Grupo y opción se cumplen en el mismo sitio de la clasificación (subtipo solo se usa desde la portada)
  if (F.trucos && !r.truco) return false;
  if (!ok("tp", [r.tp]) || (F.stp.size && !F.stp.has(r.stp))) return false;
  if (!ok("ca", [r.ca]) || !ok("sca", [r.sca])) return false;
  if (!ok("co", [r.co]) || !ok("sco", [r.sco])) return false;
  if (!ok("dif", [r.dif]) || !ok("die", r.die) || !ok("tem", r.tem) || !ok("oca", r.oca)) return false;
  if (F.max && (r.min == null || r.min > F.max)) return false;
  const con = terminos(F.con), no = terminos(F.sin);
  if (con.length || no.length) {
    const nombres = r.ni.map(palabras);
    if (con.some(t => !nombres.some(n => tieneTodas(n, t)))) return false;
    if (no.some(t => nombres.some(n => tieneTodas(n, t)))) return false;
  }
  const ws = [...palabras(F.texto)];
  if (ws.length) {
    const pajar = palabras([r.t, r.st, ...r.ip, ...r.ni].join(" "));
    if (ws.some(w => !tienePalabra(pajar, w))) return false;
  }
  return true;
}
function resultados() {
  return D.recetas.filter(r => cumple(r)).sort((a, b) =>
    (enTitulo(a, F.texto) ? 0 : 1) - (enTitulo(b, F.texto) ? 0 : 1) || cmpTitulo(a, b));
}
function opciones(k, sel) {
  const base = D.recetas.filter(r => cumple(r, k));
  const cuenta = new Map();
  for (const r of base) for (const v of new Set(sel(r).filter(v => v && v.trim()))) cuenta.set(v, (cuenta.get(v) || 0) + 1);
  for (const v of F[k]) if (!cuenta.has(v)) cuenta.set(v, 0);
  return [...cuenta.entries()].sort((a, b) => norm(a[0]) < norm(b[0]) ? -1 : 1);
}

function vistaRecetas(q) {
  document.title = "Recetas · El CookBook de la familia";
  filtroVacio();
  const desdeUrl = { tipo: "tp", subtipo: "stp", categoria: "ca", subcategoria: "sca", cocina: "co", subcocina: "sco",
    dificultad: "dif", dieta: "die", temporada: "tem", ocasion: "oca" };
  for (const [p, k] of Object.entries(desdeUrl)) if (q.get(p)) F[k].add(q.get(p));
  F.trucos = !!q.get("tecnicas");
  F.texto = q.get("q") || "";
  const abiertoFiltros = window.matchMedia("(min-width: 992px)").matches;
  app.innerHTML = `<div class="row g-4">
    <aside class="col-lg-3">
      <div class="cb-panel">
        <div class="small text-muted mb-1">Palabra en el nombre de la receta o en sus ingredientes</div>
        <input id="txt" class="form-control mb-2" type="search" placeholder="🔍 huevo, tarta, bacalao…" value="${esc(F.texto)}" autocomplete="off">
        <details class="cb-filtros-fam" ${abiertoFiltros ? "open" : ""}>
          <summary>Más filtros&nbsp;<span id="nfil"></span></summary>
          <div class="pt-2">
            <div class="small text-muted mb-1">Ingredientes <span class="fst-italic">(separados por comas)</span></div>
            <input id="con" class="form-control form-control-sm mb-1" placeholder="✅ Quiero usar: patata, bacalao…">
            <input id="sin" class="form-control form-control-sm mb-2" placeholder="🚫 No quiero: nata, frutos secos…">
            <div class="d-flex align-items-center gap-2 mb-2">
              <label class="small text-nowrap" for="max">Tiempo máx. (min)</label>
              <input id="max" type="number" min="5" step="5" inputmode="numeric" class="form-control form-control-sm">
            </div>
            <label class="form-check small mb-2">
              <input id="tru" class="form-check-input" type="checkbox" ${F.trucos ? "checked" : ""}>
              <span class="form-check-label">Solo trucos 🔪</span>
            </label>
            <div id="facetas"></div>
            <button id="limpiar" class="btn btn-outline-secondary btn-sm w-100 mt-2" type="button">Quitar todos los filtros</button>
          </div>
        </details>
      </div>
    </aside>
    <section class="col-lg-9" id="res"></section>
  </div>`;
  const $ = id => document.getElementById(id);
  $("txt").addEventListener("input", e => { F.texto = e.target.value; refresca(); });
  $("con").addEventListener("input", e => { F.con = e.target.value; refresca(); });
  $("sin").addEventListener("input", e => { F.sin = e.target.value; refresca(); });
  $("max").addEventListener("input", e => { F.max = parseInt(e.target.value, 10) || null; refresca(); });
  $("tru").addEventListener("change", e => { F.trucos = e.target.checked; refresca(); });
  $("limpiar").addEventListener("click", () => { filtroVacio(); ["txt", "con", "sin", "max"].forEach(id => $(id).value = ""); $("tru").checked = false; refresca(); });
  $("facetas").addEventListener("change", e => {
    const c = e.target.closest("input[data-k]");
    if (!c) return;
    F[c.dataset.k][c.checked ? "add" : "delete"](c.value);
    refresca();
  });
  if (q.get("buscar")) setTimeout(() => $("txt").focus(), 50);
  refresca();
}

function refresca() {
  const abiertas = new Set([...document.querySelectorAll("#facetas details[open]")].map(d => d.dataset.k));
  document.getElementById("facetas").innerHTML = FACETAS.map(([k, titulo, sel]) => {
    const ops = opciones(k, sel);
    if (ops.length === 0) return "";
    const abierta = abiertas.has(k) || F[k].size > 0;
    return `<details class="cb-facet" data-k="${k}" ${abierta ? "open" : ""}>
      <summary>${titulo}${F[k].size ? ` (${F[k].size})` : ""}</summary>
      <div class="cb-facet-body">${ops.map(([v, n]) => `<label class="form-check small mb-1">
        <input class="form-check-input" type="checkbox" data-k="${k}" value="${esc(v)}" ${F[k].has(v) ? "checked" : ""}>
        <span class="form-check-label">${esc(v)} <span class="text-muted">(${n})</span></span></label>`).join("")}</div>
    </details>`;
  }).join("");
  const nf = FACETAS.reduce((s, [k]) => s + F[k].size, 0) + F.stp.size + (F.trucos ? 1 : 0) + (F.max ? 1 : 0) +
    (terminos(F.con).length ? 1 : 0) + (terminos(F.sin).length ? 1 : 0);
  document.getElementById("nfil").textContent = nf ? `(${nf})` : "";

  const res = resultados();
  const total = D.recetas.length;
  const cabecera = `<h1 class="h3 mb-3">${res.length} ${res.length === 1 ? "receta" : "recetas"}${res.length !== total ? ` <span class="text-muted fs-6">de ${total}</span>` : ""}</h1>`;
  let cuerpo;
  if (res.length === 0) cuerpo = `<div class="alert alert-light border">Ninguna receta cumple todos los criterios. Prueba a quitar algún filtro.</div>`;
  else if (!palabras(F.texto).size) cuerpo = rejilla(res);
  else {
    const t = res.filter(r => enTitulo(r, F.texto)), resto = res.filter(r => !enTitulo(r, F.texto));
    cuerpo = (t.length ? `<h2 class="cb-results-title">“${esc(F.texto)}” en el título <span>(${t.length})</span></h2>${rejilla(t, "mb-4")}` : "") +
      (resto.length ? `<h2 class="cb-results-title">“${esc(F.texto)}” en los ingredientes <span>(${resto.length})</span></h2>${rejilla(resto)}` : "");
  }
  document.getElementById("res").innerHTML = cabecera + cuerpo;
}

const rejilla = (lista, extra = "") => `<div class="row row-cols-1 row-cols-md-2 g-3 ${extra}">${lista.map(tarjeta).join("")}</div>`;
function etiquetasNutri(n, conPor) {
  if (!n || !n.k) return "";
  const por = conPor && n.por && n.por !== "ración" ? "/" + n.por : "";
  return `<span class="badge cb-badge-nutri" title="Aproximado, por ${esc(n.por || "ración")}">🔥 ${n.k} kcal${esc(por)}</span>` +
    (n.p != null ? `<span class="badge cb-badge-nutri" title="Proteínas">Prot. ${n.p} g</span>` : "") +
    (n.h != null ? `<span class="badge cb-badge-nutri" title="Hidratos de carbono">Hidr. ${n.h} g</span>` : "") +
    (n.g != null ? `<span class="badge cb-badge-nutri" title="Grasas">Gr. ${n.g} g</span>` : "") +
    (n.f != null ? `<span class="badge cb-badge-nutri" title="Fibra">Fb. ${n.f} g</span>` : "");
}
function tarjeta(r) {
  const b = (t, cls = "cb-badge") => t ? `<span class="badge ${cls}">${esc(t)}</span>` : "";
  return `<div class="col"><div class="cb-card position-relative">
    ${r.foto && !r.truco ? `<img class="cb-card-photo" src="fotos/${enc(r.foto)}" alt="${esc(r.t)}" loading="lazy">` : ""}
    <h2 class="h5 mb-1"><a class="stretched-link cb-card-link" href="#/receta/${enc(r.id)}">${esc(r.t)}</a></h2>
    ${r.st ? `<p class="text-muted small cb-subtitulo">${esc(r.st)}</p>` : ""}
    <div class="d-flex flex-wrap gap-1">
      ${b(r.tp, "cb-badge-main")}${b(r.co ? (r.sco || r.co) : "")}${b(r.ca)}${b(r.dif)}
      ${r.min ? `<span class="badge cb-badge">⏱ ${r.min} min</span>` : ""}
      ${etiquetasNutri(r.nut, true)}
      ${r.truco ? `<span class="badge cb-badge-main">🔪 Truco</span>` : ""}
    </div>
  </div></div>`;
}

// ------------------------------------------------------------------ hoja de receta
function vistaReceta(id) {
  const r = porId.get(id);
  if (!r) {
    document.title = "No encontrada";
    app.innerHTML = `<h1>Receta no encontrada</h1><p><a href="#/">Volver a la portada</a></p>`;
    return;
  }
  document.title = r.t;
  const par = (g, o) => !o || o === "Otros" ? g : `${g} · ${o}`;
  const b = (t, main) => t ? `<span class="badge ${main ? "cb-badge-main" : "cb-badge"}">${esc(t)}</span>` : "";
  const sinIngredientes = r.truco && r.ing.reduce((s, g) => s + g.l.length, 0) === 0;
  const trucoConFoto = r.truco && r.foto;
  const n = r.nut;
  const por = n && n.por ? n.por : "ración";

  app.innerHTML = `<article class="cb-recipe">
    <div class="d-flex justify-content-between align-items-start gap-3">
      <h1 class="mb-1">${esc(r.t)}</h1>
      <div class="d-flex gap-2 no-print"><button class="btn btn-outline-secondary btn-sm text-nowrap" type="button" onclick="print()">🖨 Imprimir</button></div>
    </div>
    ${r.st ? `<p class="text-muted cb-subtitulo">${esc(r.st)}</p>` : ""}
    ${r.foto && !r.truco ? `<img class="cb-photo" src="fotos/${enc(r.foto)}" alt="${esc(r.t)}">` : ""}
    <div class="d-flex flex-wrap gap-1 mb-3 cb-etiquetas">
      ${r.truco ? `<span class="badge cb-badge-main">🔪 Truco</span>` : ""}
      ${r.tp ? b(par(r.tp, r.stp), true) : ""}${r.ca ? b(par(r.ca, r.sca)) : ""}${r.co ? b(par(r.co, r.sco)) : ""}
      ${b(r.or)}${b(r.dif)}${r.min ? `<span class="badge cb-badge">⏱ ${r.min} min</span>` : ""}
      ${[...r.ip, ...r.die, ...r.tec, ...r.tem, ...r.oca].map(x => b(x)).join("")}
    </div>
    ${sinIngredientes ? "" : `<section class="cb-servings no-print">
      <span>Para</span>
      <button class="btn btn-outline-secondary" type="button" data-d="-1" aria-label="Menos raciones">−</button>
      <input id="rac" type="number" min="1" max="100" inputmode="numeric" class="form-control" value="${r.rac.def}">
      <button class="btn btn-outline-secondary" type="button" data-d="1" aria-label="Más raciones">+</button>
      <span>${esc(r.rac.u)}</span>
      <button id="volver" class="btn btn-link btn-sm" type="button" hidden>volver a ${r.rac.def}</button>
      ${n ? `<span class="cb-nutri ms-2" title="Valores aproximados por ${esc(por)}, calculados con valores de referencia; no cuentan lo que va «al gusto».">
        ${etiquetasNutri(n, false)}<span class="small text-muted">por ${esc(por)} (aprox.)</span></span>` : ""}
    </section>
    <p class="small text-muted" id="explica"></p>`}
    <div class="row g-4">
      ${sinIngredientes ? "" : `<section class="col-md-5"><h2 class="h4">Ingredientes</h2><div id="ing"></div></section>`}
      <section class="${sinIngredientes ? "col-12" : "col-md-7"}">
        <h2 class="h4">Elaboración</h2>
        ${trucoConFoto ? `<div class="row g-3 align-items-start"><div class="col-lg-7" id="pas"></div>
          <div class="col-lg-5"><img class="cb-photo-truco" src="fotos/${enc(r.foto)}" alt="${esc(r.t)}"></div></div>` : `<div id="pas"></div>`}
      </section>
    </div>
    ${r.cons.length ? `<section class="cb-tips"><h2 class="h5">Consejos</h2><ul>${r.cons.map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}
    ${conservacion(r.conv)}
    ${r.hist ? `<section class="cb-history"><h2 class="h6">Historia</h2><p class="mb-0">${esc(r.hist)}</p></section>` : ""}
    <p class="small text-muted mt-4">${fuente(r)}</p>
  </article>`;

  const cantidades = racs => {
    const factor = r.rac.base > 0 ? racs / r.rac.base : 1;
    const ing = document.getElementById("ing");
    if (ing) ing.innerHTML = r.ing.map(g => `${g.t ? `<h3 class="h6 mt-2 mb-1">${esc(g.t)}</h3>` : ""}<ul class="cb-ingredients">${g.l.map(l =>
      `<li>${esc(lineaIngrediente(l, factor))}${l.prop ? ` <span class="badge cb-badge-warn" title="Cantidad propuesta: no venía en el original">propuesto</span>` : ""}
       ${l.nota ? `<div class="cb-ing-note">${esc(l.nota)}</div>` : ""}</li>`).join("")}</ul>`).join("");
    document.getElementById("pas").innerHTML = pasos(r, factor);
    const ex = document.getElementById("explica");
    if (ex) ex.innerHTML = `Cantidades calculadas para <strong>${racs} ${esc(r.rac.u)}</strong> a partir de la receta original
      ${(t => t.startsWith("(") ? esc(t) : "(" + esc(t) + ")")(r.rac.txt || cantidad(r.rac.base) + " " + r.rac.u)}.${!r.rac.norm && r.rac.mot ? " " + esc(r.rac.mot) : ""}`;
    const v = document.getElementById("volver");
    if (v) v.hidden = racs === r.rac.def;
  };
  const caja = document.getElementById("rac");
  const fija = v => { const x = Math.min(100, Math.max(1, v || r.rac.def)); if (caja) caja.value = x; cantidades(x); };
  if (caja) {
    caja.addEventListener("change", () => fija(parseInt(caja.value, 10)));
    app.querySelectorAll("[data-d]").forEach(bt => bt.addEventListener("click", () => fija(parseInt(caja.value, 10) + parseInt(bt.dataset.d, 10))));
    document.getElementById("volver").addEventListener("click", () => fija(r.rac.def));
  }
  cantidades(r.rac.def);
}

/** «Langostino mediano: 1-2 min…» → «Langostino mediano»; si no empieza por un nombre corto con dos puntos, es una nota. */
function nombreDeLinea(t) {
  const i = t.indexOf(":");
  return i > 0 && i <= 40 ? t.slice(0, i) : null;
}
function pasos(r, factor) {
  return r.pas.map(g => {
    let titulo = g.t || "";
    const sinNumeros = r.truco && titulo.startsWith("•");
    if (sinNumeros) titulo = titulo.replace(/^[•\s]+/, "");
    let h = titulo ? `<h3 class="h6 mt-3">${esc(titulo)}</h3>` : "";
    if (sinNumeros) {
      h += g.p.filter(s => nombreDeLinea(s.t) === null).map(s => `<p class="cb-nota-truco">${esc(textoPaso(s.t, factor))}</p>`).join("");
      h += `<ul class="cb-lista-truco">${g.p.filter(s => nombreDeLinea(s.t) !== null).map(s => {
        const nm = nombreDeLinea(s.t);
        return `<li><strong>${esc(nm)}</strong>:${esc(textoPaso(s.t.slice(nm.length + 1), factor))}</li>`;
      }).join("")}</ul>`;
    } else {
      h += `<ol class="cb-steps" start="${g.p.length ? g.p[0].o : 1}">${g.p.map(s =>
        `<li>${esc(textoPaso(s.t, factor))}${s.prop ? ` <span class="badge cb-badge-warn">paso propuesto</span>` : ""}</li>`).join("")}</ol>`;
    }
    return h;
  }).join("");
}
function conservacion(c) {
  if (!c || (c.nev == null && c.cong == null)) return "";
  let items = "";
  if (c.nev != null) items += `<span class="cb-storage-item">🧊 Frigorífico: <strong>${duracion(c.nev)}</strong></span>`;
  if (c.cong === true) items += `<span class="cb-storage-item">❄️ Se puede congelar${c.congd != null ? `: hasta <strong>${duracion(c.congd)}</strong>` : ""}</span>`;
  else if (c.cong === false) items += `<span class="cb-storage-item">🚫 No se puede congelar</span>`;
  return `<section class="cb-storage"><h2 class="h6">Conservación</h2><div class="d-flex flex-wrap gap-2">${items}</div>
    ${c.nota ? `<p class="small text-muted mb-0 mt-1">${esc(c.nota)}</p>` : ""}</section>`;
}
function fuente(r) {
  const f = r.fu;
  let t = `Fuente: ${esc(f.nombre || f.tipo || "—")}`;
  if (f.autor) t += ` · Cocinero: ${esc(f.autor)}`;
  if (/^https?:\/\//i.test(f.url)) t += ` · <a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">enlace original</a>`;
  if (r.alta) t += ` · incluida en el libro el ${fecha(r.alta)}`;
  return t;
}

// ------------------------------------------------------------------ arranque
fetch("datos/recetas.json", { cache: "no-cache" })
  .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); })
  .then(d => {
    D = d;
    porId = new Map(D.recetas.map(r => [r.id, r]));
    window.addEventListener("hashchange", pinta);
    pinta();
  })
  .catch(() => {
    app.innerHTML = `<div class="alert alert-warning">No se han podido cargar las recetas. Comprueba la conexión a internet y vuelve a abrir la página.</div>`;
  });
