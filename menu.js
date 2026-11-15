/* El CookBook de la familia — favoritas, menú semanal, lista de la compra y «Proponer un menú».
   Todo se guarda solo en este navegador (localStorage): el menú de cada persona es suyo y no toca el de nadie.
   Las reglas son las mismas que en el CookBook de casa (ShoppingList.cs, MenuPlanner.cs, Menu.razor, Compra.razor,
   ProponerMenu.razor). */
"use strict";

// ------------------------------------------------------------------ lo guardado en este navegador
const CLAVE = "cbfamilia.v1";
const G = (() => {
  let g = {};
  try { g = JSON.parse(localStorage.getItem(CLAVE) || "{}") || {}; } catch { g = {}; }
  return Object.assign({ menu: {}, fav: [], hecho: { firma: "", claves: [] }, propuesta: null }, g);
})();
function guarda() {
  try { localStorage.setItem(CLAVE, JSON.stringify(G)); } catch { /* modo privado o sin espacio: se sigue sin guardar */ }
  contadorMenu();
}
const enMenu = id => Object.prototype.hasOwnProperty.call(G.menu, id);
const esFavorita = id => G.fav.includes(id);
function ponEnMenu(id, si, personas) {
  if (si) G.menu[id] = Math.min(100, Math.max(1, personas || 4));
  else delete G.menu[id];
  guarda();
}
function cambiaFavorita(id) {
  G.fav = esFavorita(id) ? G.fav.filter(x => x !== id) : [...G.fav, id];
  guarda();
}
function contadorMenu() {
  const n = Object.keys(G.menu).filter(id => !D || porId.has(id)).length;
  document.querySelectorAll("[data-menu-n]").forEach(e => e.textContent = n ? `(${n})` : "");
}
const recetasDelMenu = () => Object.keys(G.menu).map(id => porId.get(id)).filter(Boolean).sort(cmpTitulo);

/** Botón «Menú» de las tarjetas y de la hoja de receta: se cambia sin recargar la página. */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-menu-id]");
  if (b) {
    e.preventDefault(); e.stopPropagation();
    const id = b.dataset.menuId;
    ponEnMenu(id, !enMenu(id), parseInt(b.dataset.personas || (document.getElementById("rac") || {}).value || "4", 10));
    pintaBotonMenu(b);
    return;
  }
  const f = e.target.closest("[data-fav-id]");
  if (f) {
    e.preventDefault(); e.stopPropagation();
    cambiaFavorita(f.dataset.favId);
    pintaBotonFav(f);
  }
});
function pintaBotonMenu(b) {
  const id = b.dataset.menuId, si = enMenu(id), corto = b.dataset.corto === "1";
  b.classList.toggle("btn-success", si);
  b.classList.toggle("btn-outline-success", !si);
  b.textContent = corto ? (si ? "✓ Menú" : "🗓 Menú") : (si ? `✓ En el menú (${G.menu[id]})` : "🗓 Al menú");
  b.title = si ? "Está en el menú de la semana. Pulsa para quitarla." : "Añadir al menú de la semana";
}
function pintaBotonFav(b) {
  const si = esFavorita(b.dataset.favId), corto = b.dataset.corto === "1";
  b.textContent = corto ? (si ? "★" : "☆") : (si ? "★ Favorita" : "☆ Favorita");
  b.title = si ? "Es favorita. Pulsa para quitarla." : "Marcar como favorita";
  b.classList.toggle("cb-fav-si", si);
}
const botonMenu = (r, corto, personas) =>
  `<button type="button" class="btn btn-sm" data-menu-id="${esc(r.id)}" data-corto="${corto ? 1 : 0}"${personas ? ` data-personas="${personas}"` : ""}></button>`;
const botonFav = (r, corto) => `<button type="button" class="btn btn-sm cb-fav" data-fav-id="${esc(r.id)}" data-corto="${corto ? 1 : 0}"></button>`;
function pintaBotones(raiz) {
  raiz.querySelectorAll("[data-menu-id]").forEach(pintaBotonMenu);
  raiz.querySelectorAll("[data-fav-id]").forEach(pintaBotonFav);
}

// ------------------------------------------------------------------ menú semanal (Menu.razor)
function vistaMenu() {
  document.title = "Menú de la semana · El CookBook de la familia";
  const menu = recetasDelMenu();
  const cab = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <h1 class="h3 mb-0">🗓 Menú de la semana</h1>
    <a class="btn btn-outline-primary btn-sm" href="#/proponer">✨ Proponer un menú</a>
    ${menu.length ? `<button class="btn btn-outline-secondary btn-sm" type="button" data-compartir="menu">📤 Compartir el menú</button>` : ""}
    ${menu.length ? `<span id="vaciar"><button class="btn btn-outline-secondary btn-sm" type="button" data-accion="pregunta">Vaciar el menú</button></span>` : ""}
  </div>`;
  if (!menu.length) {
    app.innerHTML = cab + `<div class="cb-empty">
      <p class="fs-5">Todavía no has elegido recetas para esta semana.</p>
      <p>Abre una receta y pulsa <strong>🗓 Al menú</strong>, o usa el botón <strong>🗓 Menú</strong> de cada tarjeta en la lista.</p>
      <a class="btn btn-primary" href="#/recetas">Buscar recetas</a> <a class="btn btn-outline-primary" href="#/proponer">✨ Proponer un menú</a>
    </div>`;
    return;
  }
  app.innerHTML = cab + `
    <p class="text-muted">${menu.length} ${menu.length === 1 ? "receta" : "recetas"} en el menú.
      Indica para cuántas personas vas a cocinar cada una: con eso se calculará la lista de la compra.</p>
    <ul class="cb-menu-list">${menu.map(r => `<li class="cb-menu-item" data-id="${esc(r.id)}">
      ${r.foto && !r.truco ? `<img src="fotos/${enc(r.foto)}" alt="">` : `<div class="cb-menu-ph">🍽️</div>`}
      <div class="flex-grow-1 cb-menu-nombre">
        <a href="#/receta/${enc(r.id)}" class="fw-semibold">${esc(r.t)}</a>
        <div class="small text-muted">${esc([r.tp, r.ca, r.co].filter(Boolean).join(" · "))}</div>
      </div>
      <div class="cb-servings m-0">
        <button class="btn btn-sm btn-outline-secondary" type="button" data-pers="-1" aria-label="Menos personas">−</button>
        <span class="cb-menu-servings">${G.menu[r.id]}</span>
        <button class="btn btn-sm btn-outline-secondary" type="button" data-pers="1" aria-label="Más personas">+</button>
        <span class="small">pers.</span>
      </div>
      <button class="btn btn-sm btn-outline-danger" type="button" data-quitar title="Quitar del menú">Quitar</button>
    </li>`).join("")}</ul>
    <div class="mt-4">
      <a class="btn btn-primary btn-lg" href="#/compra">🛒 Ver la lista de la compra</a>
      <div class="small text-muted mt-1">Suma los ingredientes de estas recetas para las personas que hayas puesto en cada una.</div>
    </div>`;
  app.querySelector(".cb-menu-list").addEventListener("click", e => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;
    const id = li.dataset.id;
    const p = e.target.closest("[data-pers]");
    if (p) {
      ponEnMenu(id, true, G.menu[id] + parseInt(p.dataset.pers, 10));
      li.querySelector(".cb-menu-servings").textContent = G.menu[id];
    } else if (e.target.closest("[data-quitar]")) {
      ponEnMenu(id, false);
      vistaMenu();
    }
  });
  const v = document.getElementById("vaciar");
  if (v) v.addEventListener("click", e => {
    const a = e.target.closest("[data-accion]");
    if (!a) return;
    if (a.dataset.accion === "pregunta") v.innerHTML = `<span class="d-inline-flex align-items-center gap-2">
      <span class="small">¿Quitar todas las recetas del menú?</span>
      <button class="btn btn-sm btn-danger" type="button" data-accion="si">Sí, vaciar</button>
      <button class="btn btn-sm btn-outline-secondary" type="button" data-accion="no">No</button></span>`;
    else if (a.dataset.accion === "no") v.innerHTML = `<button class="btn btn-outline-secondary btn-sm" type="button" data-accion="pregunta">Vaciar el menú</button>`;
    else { G.menu = {}; guarda(); vistaMenu(); }
  });
}

// ------------------------------------------------------------------ lista de la compra (ShoppingList.cs)
const EN_CASA = "Tener en casa", SIN_SECCION = "Otros";
const SECCIONES = ["Frutería", "Carnicería", "Pescadería", "Lácteos y huevos", "Panadería", "Despensa",
  "Especias y condimentos", "Congelados", "Bebidas", SIN_SECCION, EN_CASA];
const POCO_PESO = 50, POCO_VOLUMEN = 100;
const mlDe = u => ({ tz: 240, vaso: 200, cs: 15, cc: 5 }[u] ?? 1);
const techo = x => Math.ceil(x - 1e-9);
const coma = x => String(x).replace(".", ",");

function listaCompra(menu) {
  const acc = new Map();
  const get = (nombre, seccion, receta) => {
    const k = norm(nombre) + "|" + seccion;
    let a = acc.get(k);
    if (!a) acc.set(k, a = { nombre, seccion, g: 0, ml: 0, ud: 0, hierbas: 0, piezas: new Map(), cond: false, casa: false, recetas: [] });
    if (!a.recetas.includes(receta)) a.recetas.push(receta);
    return a;
  };
  const sumaUds = (a, n, pieza) => { if (!pieza) a.ud += n; else a.piezas.set(pieza, (a.piezas.get(pieza) || 0) + n); };

  for (const { r, personas } of menu) {
    const factor = r.rac.base > 0 ? personas / r.rac.base : 1;
    for (const l of r.ing.flatMap(g => g.l)) {
      const c = l.c;
      if (c === 0) continue;                                    // no se compra
      for (const [n, s, casa] of (c && c.t) || []) {            // «sal y pimienta»: lo demás, solo el nombre
        if (n) { const x = get(n, s || SIN_SECCION, r.t); if (casa) x.casa = true; }
      }
      const a = get((c && c.n) || cap(l.n), (c && c.s) || SIN_SECCION, r.t);
      if (c && c.cd) a.cond = true;
      if (c && c.h) a.casa = true;
      const q = l.q == null || l.e === "al_gusto" ? null : l.e === "fija" ? l.q : l.q * factor;
      const u = l.u || "ud";
      if (c && c.hb) {   // hierbas frescas: una taza picada es más o menos un manojo
        a.hierbas += q == null ? 0.25 : ({ tz: q, cs: q / 16, cc: q / 48, g: q / 30, ud: q / 10 }[u] ?? 0.25);
        continue;
      }
      if ((c && c.sq) || q == null) continue;
      if (c && c.pm > 0 && u !== "ud" && u !== "g") { sumaUds(a, q * mlDe(u) / c.pm, c.pz); continue; }
      if (u === "g") a.g += q;
      else if (u === "ml") a.ml += q;
      else if (u === "ud") sumaUds(a, q, c && c.pz);
      else {   // tz, cs, cc, vaso
        const tazas = q * mlDe(u) / 240;
        if (c && c.pt > 0) { if (c.md === "ml") a.ml += tazas * c.pt; else a.g += tazas * c.pt; }
        else a.ml += tazas * 240;
      }
    }
  }
  for (const a of acc.values())
    if ((a.casa || a.cond) && a.g <= POCO_PESO && a.ml <= POCO_VOLUMEN && a.ud === 0 && a.piezas.size === 0 && a.hierbas === 0)
      a.seccion = EN_CASA;

  const orden = s => { const i = SECCIONES.indexOf(s); return i < 0 ? SECCIONES.length - 2 : i; };
  const secciones = new Map();
  for (const a of acc.values()) {
    if (!secciones.has(a.seccion)) secciones.set(a.seccion, []);
    secciones.get(a.seccion).push(a);
  }
  return [...secciones.entries()].sort((x, y) => orden(x[0]) - orden(y[0])).map(([nombre, items]) => ({
    nombre,
    items: items.sort((x, y) => norm(x.nombre) < norm(y.nombre) ? -1 : norm(x.nombre) > norm(y.nombre) ? 1 : 0)
      .map(a => ({ nombre: a.nombre, seccion: a.seccion, cant: cantidades(a), recetas: a.recetas })),
  }));
}
function cantidades(a) {
  if (a.seccion === EN_CASA) return [];
  const l = [];
  if (a.g > 0) l.push(peso(a.g));
  if (a.ml > 0) l.push(volumen(a.ml));
  if (a.ud > 0) l.push(unidades(a.ud, "", ""));
  for (const [pieza, n] of a.piezas) l.push(unidades(n, singular(pieza), pieza));
  if (a.hierbas > 0) l.push(unidades(a.hierbas, "manojo", "manojos"));
  return l;
}
function peso(g) {
  if (g >= 1000) return coma(techo(g / 100) / 10) + " kg";
  const paso = g < 10 ? 1 : g <= 100 ? 5 : g <= 500 ? 10 : 50;
  return techo(g / paso) * paso + " g";
}
function volumen(ml) {
  if (ml >= 1000) return coma(techo(ml / 100) / 10) + " l";
  let cl = Math.max(techo(ml / 10), 1);
  if (cl > 10) cl = techo(cl / 5) * 5;
  return cl + " cl";
}
function unidades(n, singular, plural) {
  const k = Math.max(Math.ceil(n - 0.0001), 1);
  const w = k === 1 ? singular : plural;
  return w ? `${k} ${w}` : (k === 1 ? "1 unidad" : `${k} unidades`);
}
const singular = p => ({ dientes: "diente", cabezas: "cabeza", ramas: "rama", lonchas: "loncha", "láminas": "lámina", manojos: "manojo" }[p] ?? p);
const claveItem = i => i.seccion + "|" + i.nombre;
function textoCompra(secs, hecho) {
  let t = "";
  for (const s of secs.filter(s => s.nombre !== EN_CASA)) {
    const items = s.items.filter(i => !hecho.has(claveItem(i)));
    if (!items.length) continue;
    t += s.nombre.toUpperCase() + "\n";
    for (const i of items) t += "- " + i.nombre + (i.cant.length ? ": " + i.cant.join(" + ") : "") + "\n";
    t += "\n";
  }
  const casa = secs.find(s => s.nombre === EN_CASA);
  if (casa) t += "Mira si tienes en casa: " + [...new Set(casa.items.map(i => i.nombre))].join(", ");
  return t.trim();
}

/** Lista de la compra del menú propio o, si se pasa «compartido», de un menú que ha llegado por enlace (sin tocar el propio). */
function vistaCompra(compartido) {
  document.title = "Lista de la compra · El CookBook de la familia";
  const menu = compartido ? compartido.menu : recetasDelMenu().map(r => ({ r, personas: G.menu[r.id] }));
  const volver = compartido ? `<a class="btn btn-outline-secondary btn-sm" href="${compartido.volver}">← Volver al menú compartido</a>`
    : `<a class="btn btn-outline-secondary btn-sm" href="#/menu">← Volver al menú</a>`;
  const cab = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 cb-noprint">
    <h1 class="h3 mb-0">🛒 Lista de la compra${compartido ? " compartida" : ""}</h1>
    <div class="d-flex flex-wrap gap-2">
      ${volver}
      ${menu.length && !compartido ? `<button class="btn btn-outline-secondary btn-sm" type="button" data-compartir="compra">📤 Compartir</button>` : ""}
      ${menu.length ? `<button class="btn btn-outline-secondary btn-sm" type="button" id="copiar">📋 Copiar</button>
      <button class="btn btn-primary btn-sm cb-imprimir" type="button" onclick="imprimir()">🖨 Imprimir</button>` : ""}
    </div></div>
    <h1 class="h4 cb-onlyprint">Lista de la compra</h1>`;
  if (!menu.length) {
    app.innerHTML = cab + `<div class="cb-empty"><p class="fs-5">El menú de la semana está vacío.</p>
      <p>Añade recetas al menú y aquí aparecerá todo lo que tienes que comprar.</p>
      <a class="btn btn-primary" href="#/recetas">Buscar recetas</a></div>`;
    return;
  }
  const secs = listaCompra(menu);
  // Lo tachado se recuerda mientras el menú no cambie (en una lista compartida, solo mientras está abierta)
  const firma = JSON.stringify(Object.entries(G.menu).sort());
  if (!compartido && G.hecho.firma !== firma) { G.hecho = { firma, claves: [] }; guarda(); }
  const hecho = new Set(compartido ? [] : G.hecho.claves);
  const item = i => `<li class="cb-compra-item ${hecho.has(claveItem(i)) ? "hecho" : ""}" data-k="${esc(claveItem(i))}" title="${esc(i.recetas.join(", "))}">
    <span class="cb-check">${hecho.has(claveItem(i)) ? "☑" : "☐"}</span>
    <span class="cb-compra-nombre">${esc(i.nombre)}</span>
    ${i.cant.length ? `<span class="cb-compra-cant">${esc(i.cant.join(" + "))}</span>` : ""}
    ${i.recetas.length > 1 ? `<span class="cb-compra-rec cb-noprint">${i.recetas.length} recetas</span>` : ""}
  </li>`;
  const casa = secs.find(s => s.nombre === EN_CASA);
  app.innerHTML = cab + `
    <p class="text-muted small mb-3">Para: ${esc(menu.map(m => `${m.r.t} (${m.personas} pers.)`).join(" · "))}.
      <span class="cb-noprint">Toca un artículo para tacharlo cuando ya lo tengas.</span></p>
    <div class="cb-compra">${secs.filter(s => s.nombre !== EN_CASA).map(s =>
      `<section class="cb-compra-sec"><h2 class="h6">${esc(s.nombre)}</h2><ul>${s.items.map(item).join("")}</ul></section>`).join("")}</div>
    ${casa ? `<div class="cb-compra-casa mt-3"><div>🏠 <strong>Mira si tienes en casa</strong> <span class="small text-muted">(se usa poca cantidad):</span></div>
      <div>${esc([...new Set(casa.items.map(i => i.nombre))].join(" · "))}</div></div>` : ""}
    <p class="small text-muted mt-3 cb-noprint">Las cucharadas, tazas y vasos se han pasado a peso o volumen, y los zumos a piezas de fruta.
      Lo que suele haber en casa (sal, pimienta, aceite, azúcar, harina, vinagres, especias, salsas…) solo se recuerda, salvo que haga falta más de 50 g o 100 ml. Las hierbas frescas van en manojos.</p>`;
  app.querySelector(".cb-compra").addEventListener("click", e => {
    const li = e.target.closest("li[data-k]");
    if (!li) return;
    const k = li.dataset.k;
    if (hecho.has(k)) hecho.delete(k); else hecho.add(k);
    if (!compartido) { G.hecho.claves = [...hecho]; guarda(); }
    li.classList.toggle("hecho", hecho.has(k));
    li.querySelector(".cb-check").textContent = hecho.has(k) ? "☑" : "☐";
  });
  document.getElementById("copiar").addEventListener("click", ev => {
    const b = ev.currentTarget, t = textoCompra(secs, hecho);
    const ok = () => { b.textContent = "✓ Copiada"; setTimeout(() => b.textContent = "📋 Copiar", 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, () => copiaVieja(t, ok));
    else copiaVieja(t, ok);
  });
}
function copiaVieja(t, ok) {
  const a = document.createElement("textarea");
  a.value = t; a.setAttribute("readonly", ""); a.style.position = "fixed"; a.style.opacity = "0";
  document.body.appendChild(a); a.select();
  try { document.execCommand("copy"); ok(); } catch { /* sin portapapeles */ }
  a.remove();
}

// ------------------------------------------------------------------ Proponer un menú (MenuPlanner.cs)
const P_DESAYUNO = "Desayuno", P_PRIMERO = "Primer plato", P_SEGUNDO = "Segundo plato", P_CENA = "Cena";
const C_DES = "Desayuno", C_COM = "Comida", C_CENA = "Cena";
const MARGEN = 0.10;
const nutri = (k = 0, p = 0, h = 0, g = 0, f = 0) => ({ k, p, h, g, f });
const suma = (a, b) => nutri(a.k + b.k, a.p + b.p, a.h + b.h, a.g + b.g, a.f + b.f);
const CERO = nutri();
/** Valores por ración; null si la receta no los tiene o no se reparte en raciones (tanda, tarro…). */
const nutriDe = r => r && r.nut && r.nut.k > 0 && (!r.nut.por || r.nut.por === "ración")
  ? nutri(r.nut.k, r.nut.p ?? 0, r.nut.h ?? 0, r.nut.g ?? 0, r.nut.f ?? 0) : null;

const deTemporada = (r, t) => !t || !r.tem.length || r.tem.includes(t) || r.tem.includes("Todo el año");
const ligero = r => r.oca.includes("Ligero");
const deVerdura = r => (r.tp === "Platos Principales" && r.stp === "Verduras") ||
  (r.tp === "Guarniciones" && (r.stp === "Verduras" || r.stp === "Hortalizas"));
function candidatas(papel, t) {
  return D.recetas.filter(r => !r.truco && deTemporada(r, t)).filter(r => {
    switch (papel) {
      case P_DESAYUNO: return r.tp === "Desayunos y Brunch" || r.oca.includes("Desayuno y merienda");
      case P_PRIMERO: return r.tp === "Entrantes" || r.tp === "Ensaladas";
      case P_SEGUNDO: return r.tp === "Platos Principales";
      case P_CENA: return r.tp === "Entrantes" || r.tp === "Ensaladas" || deVerdura(r) || (r.tp === "Platos Principales" && ligero(r));
      default: return false;
    }
  });
}
const grado = d => ({ "Fácil": 0, "Media": 1, "Difícil": 2 }[d] ?? -1);
function porDificultad(pool, h) {
  if (!h.nivel) return pool;
  const permitidas = pool.filter(r => grado(r.dif) <= grado(h.nivel));
  if (!permitidas.length) return pool;
  if (h.principal) { const ex = permitidas.filter(r => r.dif === h.nivel); if (ex.length) return ex; }
  return permitidas;
}
const azar = n => Math.floor(Math.random() * n);
const baraja = l => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = azar(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function huecos(q) {
  let niveles = [...Array(q.faciles).fill("Fácil"), ...Array(q.medias).fill("Media"), ...Array(q.dificiles).fill("Difícil")].slice(0, q.dias);
  while (niveles.length < q.dias) niveles.push(null);
  niveles = baraja(niveles);
  const diasPan = q.pan ? Math.min(Math.max(q.diasPan, 0), q.dias) : 0;
  const conPan = baraja([...Array(q.dias)].map((_, i) => i < diasPan));
  const l = [];
  for (let d = 1; d <= q.dias; d++) {
    const nivel = niveles[d - 1], pan = conPan[d - 1];
    if (q.desayunos) l.push({ dia: d, comida: C_DES, papel: P_DESAYUNO, nivel, pan, principal: !q.comidas && !q.cenas });
    if (q.comidas) {
      l.push({ dia: d, comida: C_COM, papel: P_PRIMERO, nivel, pan, principal: false });
      l.push({ dia: d, comida: C_COM, papel: P_SEGUNDO, nivel, pan, principal: true });
    }
    if (q.cenas) l.push({ dia: d, comida: C_CENA, papel: P_CENA, nivel, pan, principal: !q.comidas });
  }
  return l;
}

const TIPOS_BASE = [
  ["pollo", ["pollo", "pavo", "gallina"]],
  ["ternera", ["ternera", "buey", "vaca", "res"]],
  ["cerdo", ["cerdo", "panceta", "beicon", "guanciale", "chorizo", "costilla", "solomillo de cerdo"]],
  ["cordero", ["cordero"]],
  ["bacalao", ["bacalao"]],
  ["atún", ["atun", "bonito"]],
  ["pescado", ["corvina", "merluza", "salmon", "dorada", "lubina", "rape", "sardina", "pescado"]],
  ["marisco", ["gamba", "langostino", "mejillon", "calamar", "pulpo", "almeja", "marisco"]],
  ["pasta", ["pasta", "spaghetti", "espagueti", "orzo", "penne", "orecchiette", "macarron", "fideo", "tallarin", "lasana", "concha"]],
  ["arroz", ["arroz", "basmati", "risotto", "tahdig"]],
  ["patata", ["patata"]],
  ["legumbres", ["lenteja", "garbanzo", "alubia", "judion"]],
  ["cuscús", ["cuscus"]],
];
const cacheTipos = new Map();
/** Tipos de proteína e hidrato de un plato (pollo, pasta…), del título, la categoría y los ingredientes principales. */
function tipos(r) {
  if (!r) return [];
  if (cacheTipos.has(r.id)) return cacheTipos.get(r.id);
  const ws = palabras([r.t, r.ca, r.sca, ...r.ip].join(" "));
  const t = TIPOS_BASE.filter(([, ps]) => ps.some(p => [...palabras(p)].every(w => tienePalabra(ws, w)))).map(([k]) => k);
  cacheTipos.set(r.id, t);
  return t;
}

function elegir(menu, i, temporada, usadas) {
  const h = menu[i];
  const enUso = usadas ?? new Set(menu.filter((m, k) => k !== i && m.receta).map(m => m.receta.id));
  const mismoDia = menu.filter((m, k) => k !== i && m.dia === h.dia && m.receta).map(m => m.receta);
  const cercanas = new Set(menu.filter((m, k) => k !== i && Math.abs(m.dia - h.dia) <= 1).flatMap(m => tipos(m.receta)));
  const semana = menu.filter((m, k) => k !== i).flatMap(m => tipos(m.receta));
  let pool = candidatas(h.papel, temporada).filter(r => r.id !== h.receta?.id);
  if (!pool.length) pool = candidatas(h.papel, temporada);
  if (!pool.length) return null;
  pool = porDificultad(pool, h);
  const n1 = pool.filter(r => !enUso.has(r.id) && !mismoDia.some(o => o.ca === r.ca && r.ca) && !tipos(r).some(t => cercanas.has(t)));
  const n2 = pool.filter(r => !enUso.has(r.id) && !tipos(r).some(t => cercanas.has(t)));
  const n3 = pool.filter(r => !enUso.has(r.id));
  let el = n1.length ? n1 : n2.length ? n2 : n3.length ? n3 : pool;
  const veces = r => tipos(r).reduce((s, k) => s + semana.filter(x => x === k).length, 0);
  const minimo = Math.min(...el.map(veces));
  el = el.filter(r => veces(r) === minimo);
  const r = el[azar(el.length)];
  if (usadas) usadas.add(r.id);
  return r;
}

const parte = c => c === C_DES ? 0.20 : c === C_COM ? 0.45 : 0.35;
const factorDe = q => (q.desayunos ? parte(C_DES) : 0) + (q.comidas ? parte(C_COM) : 0) + (q.cenas ? parte(C_CENA) : 0);
const PAN = { nombre: "Pan (40 g)", v: nutri(105, 3.6, 21, 0.6, 1.1), donde: [C_COM, C_CENA] };
const TOSTADA = "Tostada de pan integral (40 g)", ENSALADA_VERDE = "Ensalada verde con aceite de oliva";
const COMPLEMENTOS = [
  { nombre: "Vaso de leche semidesnatada (200 ml)", v: nutri(92, 6.4, 9.4, 3.2, 0), donde: [C_DES] },
  { nombre: TOSTADA, v: nutri(100, 4, 17, 1.4, 2.8), donde: [C_DES] },
  { nombre: "Chorrito de aceite de oliva para la tostada", v: nutri(45, 0, 0, 5, 0), donde: [C_DES] },
  { nombre: "Puñado de frutos secos (25 g)", v: nutri(155, 5, 5, 13, 2.5), donde: [C_DES] },
  { nombre: "Huevo cocido", v: nutri(78, 6.3, 0.6, 5.3, 0), donde: [C_DES, C_CENA] },
  { nombre: "Queso fresco (60 g)", v: nutri(105, 7.5, 2, 7.5, 0), donde: [C_DES, C_CENA] },
  PAN,
  { nombre: ENSALADA_VERDE, v: nutri(130, 1.5, 5, 11, 2), donde: [C_CENA] },
  { nombre: "Yogur natural", v: nutri(76, 4.4, 5.9, 4.1, 0), donde: [C_DES, C_COM, C_CENA] },
  { nombre: "Yogur griego", v: nutri(144, 7.5, 5, 11, 0), donde: [C_DES, C_COM, C_CENA] },
  { nombre: "Pieza de fruta de temporada", v: nutri(75, 0.8, 18, 0.3, 3), donde: [C_DES, C_COM, C_CENA] },
];
const complemento = nombre => COMPLEMENTOS.find(c => c.nombre === nombre);

function metas(o, factor) {
  const l = [];
  if (o.k > 0) l.push({ nombre: "Calorías", unidad: "kcal", valor: o.k * factor, leer: n => n.k });
  if (o.p > 0) l.push({ nombre: "Proteínas", unidad: "g", valor: o.p * factor, leer: n => n.p });
  if (o.h > 0) l.push({ nombre: "Hidratos", unidad: "g", valor: o.h * factor, leer: n => n.h });
  if (o.g > 0) l.push({ nombre: "Grasas", unidad: "g", valor: o.g * factor, leer: n => n.g });
  if (o.f > 0) l.push({ nombre: "Fibra", unidad: "g", valor: o.f * factor, leer: n => n.f });
  return l;
}
const objetivoActivo = o => o && (o.k > 0 || o.p > 0 || o.h > 0 || o.g > 0 || o.f > 0);
const error = (n, ms) => ms.reduce((s, m) => { const e = (m.leer(n) - m.valor) / m.valor; const f = Math.max(0, Math.abs(e) - MARGEN); return s + e * e + 4 * f * f; }, 0);
const panDelDia = (menu, dia) => menu.some(m => m.dia === dia && m.pan)
  ? [...new Set(menu.filter(m => m.dia === dia && !m.extra && m.comida !== C_DES).map(m => m.comida))] : [];
function poner(menu, dia, comida, extra) {
  let ultimo = -1;
  menu.forEach((m, k) => { if (m.dia === dia && m.comida === comida) ultimo = k; });
  menu.splice(ultimo + 1, 0, { dia, comida, papel: "Complemento", extra: extra.nombre });
}
function variedad(eleccion, menu, dia) {
  const claves = eleccion.flatMap(tipos);
  if (!claves.length) return 0;
  const vecinos = new Set(menu.filter(m => Math.abs(m.dia - dia) === 1).flatMap(m => tipos(m.receta)));
  const otros = menu.filter(m => Math.abs(m.dia - dia) > 1).flatMap(m => tipos(m.receta));
  return claves.filter(k => vecinos.has(k)).length * 1.0 + (claves.length - new Set(claves).size) * 0.4 +
    claves.reduce((s, k) => s + otros.filter(o => o === k).length, 0) * 0.08;
}
const valorHueco = s => s.extra ? complemento(s.extra).v : (nutriDe(s.receta) || CERO);
const totalDe = slots => slots.reduce((a, s) => suma(a, valorHueco(s)), CERO);

function completar(total, comidas, ms, prohibidos, conEnsalada) {
  const puestos = [];
  while (puestos.length < 4) {
    const actual = error(total, ms);
    let mejor = null, mejorError = actual - 0.002;
    for (const c of COMPLEMENTOS)
      for (const co of c.donde.filter(x => comidas.includes(x))) {
        if (c.nombre === ENSALADA_VERDE && conEnsalada.has(co)) continue;
        if (prohibidos.has(c.nombre) || puestos.filter(p => p[0] === co).length >= 2 || puestos.some(p => p[1] === c)) continue;
        const e = error(suma(total, c.v), ms);
        if (e < mejorError) { mejorError = e; mejor = [co, c]; }
      }
    if (!mejor) break;
    puestos.push(mejor); total = suma(total, mejor[1].v);
  }
  return puestos;
}

function ajustarDia(menu, dia, q, usos, cambiar) {
  const ms = metas(q.objetivo, factorDe(q));
  for (let k = menu.length - 1; k >= 0; k--) if (menu[k].dia === dia && menu[k].extra) menu.splice(k, 1);
  const idx = menu.map((m, k) => [m, k]).filter(([m]) => m.dia === dia).map(([, k]) => k);
  if (!idx.length) return;
  if (!usos) {
    usos = new Map();
    for (const m of menu) if (m.dia !== dia && m.receta) usos.set(m.receta.id, (usos.get(m.receta.id) || 0) + 1);
  }
  const comidas = [...new Set(idx.map(k => menu[k].comida))];
  const panObligado = panDelDia(menu, dia);
  const diaConPan = menu.some(m => m.dia === dia && m.pan);
  const prohibidos = new Set([PAN.nombre]);
  if (!diaConPan) prohibidos.add(TOSTADA);

  const opciones = idx.map(k => {
    const h = menu[k];
    if (cambiar && h !== cambiar) return [h.receta];
    const todas = porDificultad(candidatas(h.papel, q.temporada), h);
    const conDatos = todas.filter(r => nutriDe(r));
    const pool = conDatos.length ? [...conDatos] : [...todas];
    if (cambiar && pool.length > 1) { const j = pool.findIndex(r => r.id === h.receta?.id); if (j >= 0) pool.splice(j, 1); }
    if (h.papel === P_PRIMERO || h.papel === P_DESAYUNO || !pool.length) pool.push(null);
    return pool;
  });

  let mejor = Infinity, mejorEleccion = null, mejoresExtras = null;
  const intentos = cambiar ? Math.max(60, Math.max(...opciones.map(o => o.length)) * 3) : 600;
  for (let n = 0; n < intentos; n++) {
    const eleccion = opciones.map(o => o[azar(o.length)]);
    const ids = eleccion.filter(Boolean).map(r => r.id);
    if (ids.length !== new Set(ids).size) continue;
    let total = eleccion.reduce((a, r) => suma(a, nutriDe(r) || CERO), CERO);
    for (const _ of panObligado) total = suma(total, PAN.v);
    const conEnsalada = new Set(idx.filter((k, j) => eleccion[j] && eleccion[j].tp === "Ensaladas").map(k => menu[k].comida));
    const extras = completar(total, comidas, ms, prohibidos, conEnsalada);
    for (const [, c] of extras) total = suma(total, c.v);
    const coste = error(total, ms) +
      eleccion.reduce((s, r) => s + (r == null ? 0.02 : (usos.get(r.id) ? 0.15 * usos.get(r.id) : 0)), 0) +
      extras.length * 0.01 + variedad(eleccion, menu, dia);
    if (coste < mejor) { mejor = coste; mejorEleccion = eleccion; mejoresExtras = extras; }
  }
  if (!mejorEleccion) return;
  idx.forEach((k, j) => {
    const r = mejorEleccion[j];
    menu[k] = { ...menu[k], receta: r };
    if (r) usos.set(r.id, (usos.get(r.id) || 0) + 1);
  });
  for (const co of panObligado) poner(menu, dia, co, PAN);
  for (const [co, c] of mejoresExtras) poner(menu, dia, co, c);
}

function proponer(q) {
  const menu = huecos(q);
  if (objetivoActivo(q.objetivo)) {
    const usos = new Map();
    for (let d = 1; d <= q.dias; d++) ajustarDia(menu, d, q, usos, null);
    return menu;
  }
  const usadas = new Set();
  for (let i = 0; i < menu.length; i++) menu[i] = { ...menu[i], receta: elegir(menu, i, q.temporada, usadas) };
  for (let d = 1; d <= q.dias; d++) for (const co of panDelDia(menu, d)) poner(menu, d, co, PAN);
  return menu;
}

function temporadaDe(f) {
  const m = f.getMonth() + 1, d = f.getDate();
  if ((m === 3 && d >= 21) || m === 4 || m === 5 || (m === 6 && d < 21)) return "Primavera";
  if (m === 6 || m === 7 || m === 8 || (m === 9 && d < 23)) return "Verano";
  if (m === 9 || m === 10 || m === 11 || (m === 12 && d < 21)) return "Otoño";
  return "Invierno";
}

// La propuesta se guarda (con las recetas por su id) para no perderla al ir a mirar una receta y volver
const planAGuardar = plan => plan.map(s => ({ ...s, receta: s.receta ? s.receta.id : null }));
const planGuardado = plan => plan.map(s => ({ ...s, receta: s.receta ? porId.get(s.receta) || null : null }));
const miles = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function vistaProponer() {
  document.title = "Proponer un menú · El CookBook de la familia";
  const P = G.propuesta || {};
  const f = Object.assign({ dias: 7, comensales: 4, temporada: temporadaDe(new Date()), desayunos: false, comidas: true, cenas: true,
    pan: true, diasPan: 7, faciles: 0, medias: 0, dificiles: 0, objetivo: { k: null, p: null, h: null, g: null, f: null }, vaciar: false }, P.form || {});
  let plan = P.plan ? planGuardado(P.plan) : null;
  let q = P.q || null;
  let anadido = !!P.anadido;
  const guardaPropuesta = () => { G.propuesta = { form: f, q, plan: plan ? planAGuardar(plan) : null, anadido }; guarda(); };
  const num = (id, v, attrs = "") => `<input id="${id}" type="number" inputmode="numeric" class="form-control form-control-sm" value="${v ?? ""}" ${attrs}>`;
  const sel = (v, x) => v === x ? "selected" : "";

  app.innerHTML = `
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <h1 class="h3 mb-0">✨ Proponer un menú</h1>
    <a class="btn btn-outline-secondary btn-sm" href="#/menu">← Menú semanal</a>
  </div>
  <section class="cb-panel cb-plan-form mb-4">
    <div class="row g-3">
      <div class="col-6 col-md-3"><label class="form-label" for="f-dias">Días</label>${num("f-dias", f.dias, 'min="1" max="14"')}</div>
      <div class="col-6 col-md-3"><label class="form-label" for="f-com">Comensales</label>${num("f-com", f.comensales, 'min="1" max="20"')}</div>
      <div class="col-12 col-md-6"><label class="form-label" for="f-tem">Temporada</label>
        <select id="f-tem" class="form-select form-select-sm">${["Primavera", "Verano", "Otoño", "Invierno"].map(t => `<option ${sel(f.temporada, t)}>${t}</option>`).join("")}
          <option value="" ${sel(f.temporada, "")}>Cualquiera</option></select></div>
      <div class="col-12"><span class="form-label d-block">¿Qué comidas?</span>
        <div class="d-flex flex-wrap gap-3">
          <label class="form-check"><input id="f-des" type="checkbox" class="form-check-input" ${f.desayunos ? "checked" : ""}> Desayunos</label>
          <label class="form-check"><input id="f-comi" type="checkbox" class="form-check-input" ${f.comidas ? "checked" : ""}> Comidas <span class="small text-muted">(primer y segundo plato)</span></label>
          <label class="form-check"><input id="f-cen" type="checkbox" class="form-check-input" ${f.cenas ? "checked" : ""}> Cenas</label>
        </div></div>
      <div class="col-12"><span class="form-label d-block">Pan</span>
        <div class="d-flex flex-wrap gap-3 align-items-center">
          <label class="form-check mb-0"><input type="radio" name="f-pan" value="1" class="form-check-input" ${f.pan ? "checked" : ""}> Sí</label>
          <label class="form-check mb-0"><input type="radio" name="f-pan" value="0" class="form-check-input" ${f.pan ? "" : "checked"}> No</label>
          <span id="f-pan-dias" class="d-flex flex-wrap align-items-center gap-2" ${f.pan ? "" : "hidden"}>
            <label class="small d-flex align-items-center gap-2 mb-0">¿Cuántos días? <input id="f-dpan" type="number" min="1" max="14" inputmode="numeric" class="form-control form-control-sm" style="width:5rem" value="${f.diasPan}"></label>
            <span class="small text-muted">Esos días lleva pan la comida y la cena. Los días sin pan tampoco hay tostada en el desayuno.</span>
          </span>
        </div></div>
      <div class="col-12"><span class="form-label d-block">Dificultad <span class="small text-muted">(cuántos días de cada; los que no indiques, cualquiera)</span></span>
        <div class="row g-2">
          <div class="col-4 col-md-2"><label class="small" for="f-fac">Días fáciles</label>${num("f-fac", f.faciles, 'min="0" max="14"')}</div>
          <div class="col-4 col-md-2"><label class="small" for="f-med">Días medios</label>${num("f-med", f.medias, 'min="0" max="14"')}</div>
          <div class="col-4 col-md-2"><label class="small" for="f-dif">Días difíciles</label>${num("f-dif", f.dificiles, 'min="0" max="14"')}</div>
        </div>
        <div class="small text-danger mt-1" id="f-aviso-dif" hidden></div>
        <div class="small text-muted mt-1">En un día difícil, el plato principal es difícil y el resto puede ser más sencillo; en un día fácil, todo es fácil.</div></div>
      <div class="col-12"><span class="form-label d-block">Objetivo diario por persona <span class="small text-muted">(opcional: deja vacío lo que no quieras controlar)</span></span>
        <div class="row g-2">
          <div class="col-6 col-md"><label class="small" for="o-k">Calorías (kcal)</label>${num("o-k", f.objetivo.k, 'min="0" step="50"')}</div>
          <div class="col-6 col-md"><label class="small" for="o-p">Proteínas (g)</label>${num("o-p", f.objetivo.p, 'min="0"')}</div>
          <div class="col-6 col-md"><label class="small" for="o-h">Hidratos (g)</label>${num("o-h", f.objetivo.h, 'min="0"')}</div>
          <div class="col-6 col-md"><label class="small" for="o-g">Grasas (g)</label>${num("o-g", f.objetivo.g, 'min="0"')}</div>
          <div class="col-6 col-md"><label class="small" for="o-f">Fibra (g)</label>${num("o-f", f.objetivo.f, 'min="0"')}</div>
        </div>
        <div class="d-flex flex-wrap gap-2 align-items-center mt-2">
          <button class="btn btn-sm btn-outline-secondary" type="button" id="o-hab">Poner valores habituales de un adulto</button>
          <button class="btn btn-sm btn-link" type="button" id="o-quitar">Quitar objetivo</button>
        </div>
        <div class="small text-muted mt-1">Si una casilla se deja vacía, ese valor no se busca (no significa cero).
          Se buscan platos que sumen esos valores con un margen de ±10 %, y se completan con fruta, yogur, pan… si hace falta.
          Si no planificas todas las comidas, el objetivo se reparte: desayuno 20 %, comida 45 %, cena 35 %. Las cifras son aproximadas.</div></div>
    </div>
    <div class="mt-3 d-flex flex-wrap gap-2 align-items-center">
      <button class="btn btn-primary" type="button" id="b-proponer">✨ Proponer menú</button>
      <button class="btn btn-outline-primary" type="button" id="b-otra" hidden>🔄 Otra propuesta</button>
      <span class="small text-danger" id="f-aviso-com" hidden>Elige al menos una comida.</span>
    </div>
  </section>
  <div id="plan"></div>`;

  const $ = id => document.getElementById(id);
  const leeNum = id => { const v = parseInt($(id).value, 10); return Number.isFinite(v) ? v : null; };
  const leeForm = () => {
    Object.assign(f, {
      dias: leeNum("f-dias") ?? 7, comensales: leeNum("f-com") ?? 4, temporada: $("f-tem").value,
      desayunos: $("f-des").checked, comidas: $("f-comi").checked, cenas: $("f-cen").checked,
      pan: app.querySelector('input[name="f-pan"]:checked').value === "1", diasPan: leeNum("f-dpan") ?? 0,
      faciles: leeNum("f-fac") ?? 0, medias: leeNum("f-med") ?? 0, dificiles: leeNum("f-dif") ?? 0,
      objetivo: { k: leeNum("o-k"), p: leeNum("o-p"), h: leeNum("o-h"), g: leeNum("o-g"), f: leeNum("o-f") },
    });
    const ninguna = !f.desayunos && !f.comidas && !f.cenas;
    $("b-proponer").disabled = ninguna;
    $("f-aviso-com").hidden = !ninguna;
    $("f-pan-dias").hidden = !f.pan;
    const sobran = f.faciles + f.medias + f.dificiles > f.dias;
    $("f-aviso-dif").hidden = !sobran;
    $("f-aviso-dif").textContent = sobran ? `Suman más días de los que tiene el menú (${f.dias}): se usarán los primeros.` : "";
  };
  app.querySelector(".cb-plan-form").addEventListener("input", leeForm);
  app.querySelector(".cb-plan-form").addEventListener("change", () => { leeForm(); guardaPropuesta(); });
  $("o-hab").addEventListener("click", () => { [["o-k", 2000], ["o-p", 75], ["o-h", 250], ["o-g", 70], ["o-f", 25]].forEach(([id, v]) => $(id).value = v); leeForm(); guardaPropuesta(); });
  $("o-quitar").addEventListener("click", () => { ["o-k", "o-p", "o-h", "o-g", "o-f"].forEach(id => $(id).value = ""); leeForm(); guardaPropuesta(); });

  const haz = () => {
    leeForm();
    f.dias = Math.min(14, Math.max(1, f.dias)); f.comensales = Math.min(20, Math.max(1, f.comensales));
    $("f-dias").value = f.dias; $("f-com").value = f.comensales;
    q = { dias: f.dias, comensales: f.comensales, desayunos: f.desayunos, comidas: f.comidas, cenas: f.cenas, temporada: f.temporada || null,
      objetivo: objetivoActivo(f.objetivo) ? { ...f.objetivo } : null,
      faciles: Math.max(0, f.faciles), medias: Math.max(0, f.medias), dificiles: Math.max(0, f.dificiles),
      pan: f.pan, diasPan: Math.min(Math.max(f.diasPan, 0), f.dias) };
    plan = proponer(q);
    anadido = false;
    guardaPropuesta();
    pintaPlan();
  };
  $("b-proponer").addEventListener("click", haz);
  $("b-otra").addEventListener("click", haz);

  function pintaPlan() {
    const zona = $("plan");
    $("b-otra").hidden = !plan;
    if (!plan || !q) { zona.innerHTML = ""; return; }
    const factor = factorDe(q);
    const faltan = [...new Set(plan.filter(s => !s.extra).map(s => s.papel))]
      .filter(p => candidatas(p, q.temporada).length < plan.filter(s => !s.extra && s.papel === p).length).map(p => p.toLowerCase());
    const resto = [[!q.desayunos, "el desayuno"], [!q.comidas, "la comida"], [!q.cenas, "la cena"]].filter(x => x[0]).map(x => x[1]).join(" y ");
    const nombreComida = c => c === C_DES ? "☕ Desayuno" : c === C_COM ? "🍽 Comida" : "🌙 Cena";
    let h = faltan.length ? `<div class="alert alert-warning small">Todavía hay pocas recetas para: ${esc(faltan.join(", "))}. Alguna se repite o queda vacía.</div>` : "";
    h += `<div class="cb-plan">`;
    for (let d = 1; d <= q.dias; d++) {
      const delDia = plan.filter(s => s.dia === d);
      const nivel = delDia[0] && delDia[0].nivel;
      h += `<div class="cb-plan-dia"><h2 class="h6">Día ${d}${nivel ? ` <span class="badge cb-badge ms-1">${nivel}</span>` : ""}</h2>`;
      for (const comida of [...new Set(delDia.map(s => s.comida))]) {
        h += `<div class="cb-plan-comida"><div class="cb-plan-titulo">${nombreComida(comida)}</div>`;
        for (const s of delDia.filter(x => x.comida === comida)) {
          const i = plan.indexOf(s);
          h += `<div class="cb-plan-plato">`;
          if (comida === C_COM) h += `<span class="cb-plan-papel">${s.papel === P_PRIMERO ? "1º" : s.papel === P_SEGUNDO ? "2º" : ""}</span>`;
          if (s.extra) h += `<span class="flex-grow-1 text-muted">+ ${esc(s.extra)}</span>`;
          else if (!s.receta) h += `<span class="text-muted fst-italic flex-grow-1">${q.objetivo ? "Sin plato del libro" : "Sin recetas de este tipo"}</span>`;
          else {
            h += `<a class="flex-grow-1" href="#/receta/${enc(s.receta.id)}">${esc(s.receta.t)}</a>`;
            const nr = nutriDe(s.receta);
            if (q.objetivo && nr) h += `<span class="small text-muted text-nowrap">${Math.round(nr.k)} kcal</span>`;
          }
          if (!s.extra) h += `<button class="btn btn-sm btn-link p-0" type="button" title="Cambiar este plato" data-cambiar="${i}">🔄</button>`;
          h += `</div>`;
        }
        h += `</div>`;
      }
      if (q.objetivo) {
        const total = totalDe(delDia);
        h += `<div class="cb-plan-nutri small mt-2">`;
        if (factor < 0.999) h += `<div class="text-muted mb-1">Objetivo de las comidas planificadas: el ${Math.round(factor * 100)} % del diario (lo demás queda para ${resto}).</div>`;
        for (const m of metas(q.objetivo, factor)) {
          const v = m.leer(total), ok = Math.abs(v - m.valor) <= m.valor * MARGEN;
          const min = m.valor * (1 - MARGEN), max = m.valor * (1 + MARGEN);
          h += `<div class="${ok ? "text-success" : "text-danger"}">${ok ? "✓" : v < min ? "↓" : "↑"} ${m.nombre}: <strong>${miles(v)} ${m.unidad}</strong>
            <span class="text-muted">(buscado entre ${miles(min)} y ${miles(max)}${factor < 0.999 ? `; diario ${miles(m.valor / factor)}` : ""})</span></div>`;
        }
        h += `</div>`;
      }
      h += `</div>`;
    }
    h += `</div>
    <section class="cb-panel mt-3">
      <div class="d-flex flex-wrap gap-3 align-items-center">
        <label class="form-check mb-0"><input type="checkbox" class="form-check-input" id="p-vaciar" ${f.vaciar ? "checked" : ""}> Vaciar antes el menú semanal</label>
        <button class="btn btn-success" type="button" id="p-anadir">🗓 Añadir al menú semanal (${q.comensales} pers.)</button>
        <button class="btn btn-outline-secondary" type="button" data-compartir="propuesta">📤 Compartir esta propuesta</button>
        <span class="text-success" id="p-ok" ${anadido ? "" : "hidden"}>✓ Añadido. <a href="#/menu">Ver el menú y la lista de la compra</a></span>
      </div>
      <div class="small text-muted mt-1">Cada receta se añade para ${q.comensales} personas. Si un plato sale dos veces, se suma una sola vez con esas personas.
        ${plan.some(s => s.extra) ? "Los complementos (fruta, yogur, pan…) no son recetas: no se añaden al menú ni a la lista de la compra." : ""}</div>
    </section>`;
    zona.innerHTML = h;
    zona.querySelectorAll("[data-cambiar]").forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.dataset.cambiar, 10);
      if (q.objetivo) ajustarDia(plan, plan[i].dia, q, null, plan[i]);
      else plan[i] = { ...plan[i], receta: elegir(plan, i, q.temporada, null) };
      anadido = false;
      guardaPropuesta();
      pintaPlan();
    }));
    $("p-vaciar").addEventListener("change", e => { f.vaciar = e.target.checked; guardaPropuesta(); });
    $("p-anadir").addEventListener("click", () => {
      if (f.vaciar) G.menu = {};
      for (const id of new Set(plan.filter(s => s.receta).map(s => s.receta.id))) G.menu[id] = q.comensales;
      anadido = true;
      guardaPropuesta();
      $("p-ok").hidden = false;
    });
  }
  leeForm();
  pintaPlan();
}
