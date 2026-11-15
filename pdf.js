/* El CookBook de la familia — PDF (fase 5).
   Una receta, un grupo de recetas, el menú completo (planificación, lista de la compra y recetas) y la lista de la compra.
   Se hacen en el propio móvil con pdf-lib (pdf-lib.min.js, licencia MIT), que solo se descarga la primera vez que se pide un PDF.
   Letra Helvetica, la estándar de los PDF: lleva tildes, ñ, «», ½, ¼ y ¾; las fracciones ⅓ ⅔ ⅛ se escriben 1/3, 2/3, 1/8. */
"use strict";

// ------------------------------------------------------------------ cargar pdf-lib cuando hace falta
let _libPdf = null;
function cargaPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (!_libPdf) _libPdf = new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = "pdf-lib.min.js?v=1";
    s.onload = () => window.PDFLib ? ok(window.PDFLib) : mal(new Error("pdf-lib"));
    s.onerror = () => { _libPdf = null; mal(new Error("pdf-lib")); };
    document.head.appendChild(s);
  });
  return _libPdf;
}

// ------------------------------------------------------------------ texto que cabe en la letra estándar (WinAnsi)
const WIN_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const cabe = c => { const n = c.codePointAt(0); return (n >= 32 && n <= 126) || (n >= 160 && n <= 255) || WIN_EXTRA.includes(c); };
const CAMBIOS = { "⅓": "1/3", "⅔": "2/3", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8", "⅕": "1/5", "⅙": "1/6",
  "→": "->", "←": "<-", "≈": "aprox. ", "−": "-", "‐": "-", "‑": "-", "′": "'", "″": "\"", "℃": "°C", " ": " ", " ": " ", " ": " ",
  "★": "*", "☆": "*", "✓": "", "✔": "" };
function limpio(t, recorta = true) {
  let s = String(t ?? "").replace(/(\d)([⅓⅔⅛⅜⅝⅞⅕⅙])/g, "$1 $2");
  let r = "";
  for (const c of s) {
    if (c === "\n" || c === "\t") { r += " "; continue; }
    if (cabe(c)) { r += c; continue; }
    if (CAMBIOS[c] !== undefined) { r += CAMBIOS[c]; continue; }
    const sin = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (sin && [...sin].every(cabe)) r += sin;
    // lo demás (emojis, letras de otros alfabetos) se quita
  }
  r = r.replace(/ {2,}/g, " ");
  return recorta ? r.trim() : r;
}

// ------------------------------------------------------------------ maquetación sencilla
const A4 = [595.28, 841.89], M_IZQ = 50, M_DER = 50, M_ARR = 52, M_ABA = 58;
class Hoja {
  constructor(L, pdf, fuentes, titulo) {
    this.L = L; this.pdf = pdf; this.f = fuentes; this.titulo = titulo;
    this.color = { tinta: L.rgb(0.16, 0.13, 0.11), gris: L.rgb(0.42, 0.38, 0.35), acento: L.rgb(0.71, 0.33, 0.17), linea: L.rgb(0.85, 0.80, 0.75) };
    this.ancho = A4[0] - M_IZQ - M_DER;
    this.nueva();
  }
  nueva() { this.p = this.pdf.addPage(A4); this.y = A4[1] - M_ARR; }
  cabeOno(h) { if (this.y - h < M_ABA) this.nueva(); }
  hueco(h) { this.y -= h; }
  /** Párrafo con trozos de distinta letra: [[texto, "n"|"b"|"i"], …]. */
  parrafo(trozos, o = {}) {
    const size = o.size ?? 10.5, alto = size * (o.interlinea ?? 1.38), sangria = o.sangria ?? 0, color = o.color ?? this.color.tinta;
    const ancho = this.ancho - sangria - (o.derecha ?? 0);
    if (typeof trozos === "string") trozos = [[trozos, o.letra ?? "n"]];
    const palabras = [];
    for (const [t, l] of trozos) {
      const txt = limpio(t, false);
      if (!txt) continue;
      txt.split(/(\s+)/).forEach(w => { if (w) palabras.push([w, l]); });
    }
    const lineas = [];
    let linea = [], w = 0;
    const mide = (t, l) => this.f[l].widthOfTextAtSize(t, size);
    for (const [t, l] of palabras) {
      const esp = /^\s+$/.test(t);
      const tw = mide(esp ? " " : t, l);
      if (!esp && w + tw > ancho && linea.length) {
        while (linea.length && /^\s+$/.test(linea[linea.length - 1][0])) linea.pop();
        lineas.push(linea); linea = []; w = 0;
      }
      if (esp && !linea.length) continue;
      linea.push([esp ? " " : t, l]); w += tw;
    }
    if (linea.length) lineas.push(linea);
    lineas.forEach((ln, i) => {
      this.cabeOno(alto);
      if (i === 0 && o.marca) this.p.drawText(limpio(o.marca), { x: M_IZQ + sangria - (o.anchoMarca ?? 12), y: this.y - size, size, font: this.f[o.letraMarca ?? "n"], color: o.colorMarca ?? color });
      let x = M_IZQ + sangria;
      for (const [t, l] of ln) { this.p.drawText(t, { x, y: this.y - size, size, font: this.f[l], color }); x += mide(t, l); }
      this.y -= alto;
    });
    if (o.despues) this.y -= o.despues;
  }
  titular(t, size = 20) { this.cabeOno(size * 2.2); this.parrafo(t, { size, letra: "b", interlinea: 1.2, despues: 2 }); }
  seccion(t) {
    this.cabeOno(46); this.hueco(8);
    this.parrafo(t, { size: 13, letra: "b", color: this.color.acento, interlinea: 1.2 });
    this.p.drawLine({ start: { x: M_IZQ, y: this.y + 0.5 }, end: { x: M_IZQ + this.ancho, y: this.y + 0.5 }, thickness: 0.8, color: this.color.acento });
    this.hueco(7);
  }
  subseccion(t) { this.cabeOno(34); this.hueco(3); this.parrafo(t, { size: 11, letra: "b", despues: 1 }); }
  /** Casilla de la compra: nombre a la izquierda, cantidad a la derecha. */
  casilla(nombre, cant) {
    const size = 10.5, alto = 17;
    this.cabeOno(alto);
    this.p.drawRectangle({ x: M_IZQ, y: this.y - size, width: 8.5, height: 8.5, borderColor: this.color.gris, borderWidth: 0.8 });
    const c = limpio(cant), wc = c ? this.f.b.widthOfTextAtSize(c, size) : 0;
    let n = limpio(nombre);
    const max = this.ancho - 16 - wc - 10;
    while (n.length > 3 && this.f.n.widthOfTextAtSize(n, size) > max) n = n.slice(0, -2) + "…";
    this.p.drawText(n, { x: M_IZQ + 16, y: this.y - size + 0.5, size, font: this.f.n, color: this.color.tinta });
    if (c) this.p.drawText(c, { x: M_IZQ + this.ancho - wc, y: this.y - size + 0.5, size, font: this.f.b, color: this.color.tinta });
    this.p.drawLine({ start: { x: M_IZQ + 16, y: this.y - size - 4.5 }, end: { x: M_IZQ + this.ancho, y: this.y - size - 4.5 }, thickness: 0.4, color: this.color.linea });
    this.y -= alto;
  }
  imagen(img, maxAncho, maxAlto) {
    const e = Math.min(maxAncho / img.width, maxAlto / img.height, 1);
    const w = img.width * e, h = img.height * e;
    this.cabeOno(h + 8);
    this.p.drawImage(img, { x: M_IZQ, y: this.y - h, width: w, height: h });
    this.y -= h + 10;
  }
  pies() {
    const ps = this.pdf.getPages(), size = 8;
    ps.forEach((p, i) => {
      const t = limpio(`El CookBook de la familia · ${this.titulo} · página ${i + 1} de ${ps.length}`);
      const w = this.f.n.widthOfTextAtSize(t, size);
      p.drawText(t, { x: (A4[0] - w) / 2, y: 28, size, font: this.f.n, color: this.color.gris });
    });
  }
}

async function nuevoPdf(titulo) {
  const L = await cargaPdfLib();
  const pdf = await L.PDFDocument.create();
  pdf.setTitle(limpio(titulo)); pdf.setAuthor("El CookBook de la familia"); pdf.setCreator("El CookBook de la familia");
  pdf.setLanguage("es-ES");
  const f = {
    n: await pdf.embedFont(L.StandardFonts.Helvetica),
    b: await pdf.embedFont(L.StandardFonts.HelveticaBold),
    i: await pdf.embedFont(L.StandardFonts.HelveticaOblique),
  };
  return new Hoja(L, pdf, f, titulo);
}

async function fotoPdf(h, nombre) {
  try {
    const res = await fetch("fotos/" + encodeURIComponent(nombre));
    if (!res.ok) return null;
    const b = await res.arrayBuffer();
    return /\.png$/i.test(nombre) ? await h.pdf.embedPng(b) : await h.pdf.embedJpg(b);
  } catch { return null; }
}

// ------------------------------------------------------------------ contenidos
const parDe = (g, o) => !o || o === "Otros" ? g : `${g} · ${o}`;
async function recetaEnPdf(h, r, racs, primera) {
  if (!primera) h.nueva();
  h.titular(r.t);
  if (r.st) h.parrafo(r.st, { size: 11.5, letra: "i", color: h.color.gris, despues: 3 });
  const meta = [r.truco ? "Truco" : "", r.tp ? parDe(r.tp, r.stp) : "", r.ca ? parDe(r.ca, r.sca) : "", r.co ? parDe(r.co, r.sco) : "",
    r.dif, r.min ? `${r.min} min` : ""].filter(Boolean).join("  ·  ");
  if (meta) h.parrafo(meta, { size: 9.5, color: h.color.gris, despues: 4 });
  const sinIngredientes = r.truco && r.ing.reduce((s, g) => s + g.l.length, 0) === 0;
  const factor = r.rac.base > 0 ? racs / r.rac.base : 1;
  if (!sinIngredientes) {
    const orig = r.rac.txt || `${cantidad(r.rac.base)} ${r.rac.u}`;
    h.parrafo([["Para ", "n"], [`${racs} ${r.rac.u}`, "b"], [`   (receta original: ${orig.replace(/^\((.*)\)$/, "$1")})`, "n"]], { size: 10.5, despues: 2 });
    const n = r.nut;
    if (n && n.k) {
      const t = [`${n.k} kcal`, n.p != null ? `proteínas ${n.p} g` : "", n.h != null ? `hidratos ${n.h} g` : "", n.g != null ? `grasas ${n.g} g` : "", n.f != null ? `fibra ${n.f} g` : ""].filter(Boolean).join(" · ");
      h.parrafo(`Aproximado por ${n.por || "ración"}: ${t}`, { size: 9.5, color: h.color.gris, despues: 2 });
    }
  }
  if (r.foto && !r.truco) { const img = await fotoPdf(h, r.foto); if (img) { h.hueco(4); h.imagen(img, h.ancho, 200); } }

  if (!sinIngredientes) {
    h.seccion("Ingredientes");
    for (const g of r.ing) {
      if (g.t) h.subseccion(g.t);
      for (const l of g.l) {
        h.parrafo([[lineaIngrediente(l, factor), "n"], [l.prop ? "  (propuesto)" : "", "i"]], { sangria: 14, marca: "•", anchoMarca: 11, colorMarca: h.color.acento, despues: 1.5 });
        if (l.nota) h.parrafo(l.nota, { sangria: 14, size: 9, color: h.color.gris, despues: 1.5 });
      }
    }
  }
  h.seccion("Elaboración");
  for (const g of r.pas) {
    let titulo = g.t || "";
    const sinNumeros = r.truco && titulo.startsWith("•");
    if (sinNumeros) titulo = titulo.replace(/^[•\s]+/, "");
    if (titulo) h.subseccion(titulo);
    if (sinNumeros) {
      for (const s of g.p.filter(s => nombreDeLinea(s.t) === null)) h.parrafo(textoPaso(s.t, factor), { size: 10, color: h.color.gris, despues: 3 });
      for (const s of g.p.filter(s => nombreDeLinea(s.t) !== null)) {
        const nm = nombreDeLinea(s.t);
        h.parrafo([[nm + ":", "b"], [textoPaso(s.t.slice(nm.length + 1), factor), "n"]], { sangria: 14, marca: "•", anchoMarca: 11, colorMarca: h.color.acento, despues: 2 });
      }
    } else {
      for (const s of g.p) h.parrafo([[textoPaso(s.t, factor), "n"], [s.prop ? "  (paso propuesto)" : "", "i"]],
        { sangria: 20, marca: `${s.o}.`, anchoMarca: 18, letraMarca: "b", colorMarca: h.color.acento, despues: 4 });
    }
  }
  if (r.foto && r.truco) { const img = await fotoPdf(h, r.foto); if (img) { h.hueco(6); h.imagen(img, h.ancho, 360); } }
  if (r.cons.length) {
    h.seccion("Consejos");
    for (const c of r.cons) h.parrafo(c, { sangria: 14, marca: "•", anchoMarca: 11, colorMarca: h.color.acento, despues: 2 });
  }
  const c = r.conv;
  if (c && (c.nev != null || c.cong != null)) {
    h.seccion("Conservación");
    if (c.nev != null) h.parrafo([["Frigorífico: ", "n"], [duracion(c.nev), "b"]], { despues: 1 });
    if (c.cong === true) h.parrafo([["Se puede congelar", "n"], [c.congd != null ? `: hasta ${duracion(c.congd)}` : "", "b"]], { despues: 1 });
    else if (c.cong === false) h.parrafo("No se puede congelar", { despues: 1 });
    if (c.nota) h.parrafo(c.nota, { size: 9.5, color: h.color.gris });
  }
  if (r.hist) { h.seccion("Historia"); h.parrafo(r.hist); }
  const f = r.fu;
  let pie = `Fuente: ${f.nombre || f.tipo || "—"}`;
  if (f.autor) pie += ` · Cocinero: ${f.autor}`;
  if (/^https?:\/\//i.test(f.url)) pie += ` · ${f.url}`;
  if (r.alta) pie += ` · Incluida en el libro el ${fecha(r.alta)}`;
  h.hueco(10);
  h.parrafo(pie, { size: 8.5, color: h.color.gris });
}

function compraEnPdf(h, menu) {
  const secs = listaCompra(menu);
  h.parrafo("Para: " + menu.map(m => `${m.r.t} (${m.personas} pers.)`).join(" · "), { size: 9.5, color: h.color.gris, despues: 2 });
  for (const s of secs.filter(s => s.nombre !== EN_CASA)) {
    h.seccion(s.nombre);
    for (const i of s.items) h.casilla(i.nombre, i.cant.join(" + "));
  }
  const casa = secs.find(s => s.nombre === EN_CASA);
  if (casa) {
    h.seccion("Mira si tienes en casa");
    h.parrafo([...new Set(casa.items.map(i => i.nombre))].join(" · "), { despues: 2 });
    h.parrafo("Se usa poca cantidad: solo hay que comprarlo si se ha acabado.", { size: 9, color: h.color.gris });
  }
}

function planEnPdf(h, plan) {
  const dias = Math.max(0, ...plan.map(s => s.dia));
  const nombreComida = c => c === C_DES ? "Desayuno" : c === C_COM ? "Comida" : "Cena";
  for (let d = 1; d <= dias; d++) {
    const delDia = plan.filter(s => s.dia === d);
    if (!delDia.length) continue;
    h.subseccion(`Día ${d}${delDia[0].nivel ? ` (${delDia[0].nivel.toLowerCase()})` : ""}`);
    for (const comida of [...new Set(delDia.map(s => s.comida))]) {
      const platos = delDia.filter(s => s.comida === comida).map(s => {
        const pre = comida === C_COM && s.papel === P_PRIMERO ? "1º " : comida === C_COM && s.papel === P_SEGUNDO ? "2º " : "";
        return s.extra ? `+ ${s.extra}` : s.receta ? pre + s.receta.t : pre + "(sin plato del libro)";
      });
      h.parrafo([[nombreComida(comida) + ": ", "b"], [platos.join("; "), "n"]], { sangria: 10, despues: 1.5 });
    }
    h.hueco(3);
  }
}

// ------------------------------------------------------------------ los cuatro PDF
async function pdfReceta(r, racs) {
  const h = await nuevoPdf(r.t);
  await recetaEnPdf(h, r, racs, true);
  return h;
}
async function pdfGrupo(titulo, lista) {
  const h = await nuevoPdf(titulo);
  h.titular(titulo, 22);
  h.parrafo(`${lista.length} ${lista.length === 1 ? "receta" : "recetas"} del CookBook de la familia · ${fecha(new Date().toISOString().slice(0, 10))}`, { size: 10, color: h.color.gris, despues: 6 });
  h.seccion("Índice");
  lista.forEach((r, i) => h.parrafo([[r.t, "n"], [r.st ? "  —  " + r.st : "", "i"]], { sangria: 22, marca: `${i + 1}.`, anchoMarca: 22, letraMarca: "b", colorMarca: h.color.acento, size: 10, despues: 1 }));
  for (const r of lista) await recetaEnPdf(h, r, r.rac.def, false);
  return h;
}
/** Menú completo: planificación (si es una propuesta por días), lista de la compra y todas las recetas. */
async function pdfMenu(titulo, menu, plan) {
  const h = await nuevoPdf(titulo);
  h.titular(titulo, 22);
  h.parrafo(`${menu.length} ${menu.length === 1 ? "receta" : "recetas"} · ${fecha(new Date().toISOString().slice(0, 10))}`, { size: 10, color: h.color.gris, despues: 4 });
  h.seccion(plan ? "Planificación" : "Recetas del menú");
  if (plan) planEnPdf(h, plan);
  else menu.forEach((m, i) => h.parrafo([[m.r.t, "n"], [`  —  ${m.personas} ${m.personas === 1 ? "persona" : "personas"}`, "b"]],
    { sangria: 22, marca: `${i + 1}.`, anchoMarca: 22, letraMarca: "b", colorMarca: h.color.acento, despues: 1.5 }));
  h.nueva();
  h.titular("Lista de la compra", 18);
  compraEnPdf(h, menu);
  for (const m of menu) await recetaEnPdf(h, m.r, m.personas, false);
  return h;
}
async function pdfCompra(menu) {
  const h = await nuevoPdf("Lista de la compra");
  h.titular("Lista de la compra", 20);
  compraEnPdf(h, menu);
  return h;
}

// ------------------------------------------------------------------ botones «📄 PDF»
const botonPdf = (tipo, texto = "📄 PDF", extra = "") =>
  `<button class="btn btn-outline-secondary btn-sm text-nowrap" type="button" data-pdf="${tipo}" ${extra}>${texto}</button>`;
let ultimaCompra = null;        // el menú cuya lista de la compra se está viendo (propio o compartido)
let ultimoCompartido = null;    // lo que se está viendo en #/compartido

document.addEventListener("click", e => {
  const b = e.target.closest("[data-pdf]");
  if (!b) return;
  e.preventDefault();
  const tipo = b.dataset.pdf;
  const menuPropio = () => recetasDelMenu().map(r => ({ r, personas: G.menu[r.id] }));
  let trabajo, nombre;
  if (tipo === "receta") {
    const r = porId.get(b.dataset.id);
    const caja = document.getElementById("rac");
    const racs = caja ? Math.min(100, Math.max(1, parseInt(caja.value, 10) || r.rac.def)) : r.rac.def;
    nombre = `Receta - ${r.t}`; trabajo = () => pdfReceta(r, racs);
  } else if (tipo === "grupo" || tipo === "comp-grupo") {
    const lista = tipo === "grupo" ? resultados() : ultimoCompartido.lista;
    if (lista.length > MAX_GRUPO) { ventanaAviso(`Son ${lista.length} recetas: demasiadas para un PDF (como mucho ${MAX_GRUPO}). Usa la búsqueda o los filtros para quedarte con menos.`); return; }
    const titulo = tipo === "grupo" ? describeFiltro() : ultimoCompartido.titulo;
    nombre = `Recetas - ${titulo}`; trabajo = () => pdfGrupo(titulo, lista);
  } else if (tipo === "menu") {
    nombre = "Menú de la semana"; trabajo = () => pdfMenu("Menú de la semana", menuPropio(), null);
  } else if (tipo === "propuesta") {
    const P = G.propuesta;
    if (!P || !P.plan || !P.q) return;
    const plan = planGuardado(P.plan);
    const vistos = new Set();
    const menu = plan.filter(s => s.receta && !vistos.has(s.receta.id) && vistos.add(s.receta.id)).map(s => ({ r: s.receta, personas: P.q.comensales }));
    menu.sort((a, b) => cmpTitulo(a.r, b.r));
    nombre = "Propuesta de menú"; trabajo = () => pdfMenu("Propuesta de menú", menu, plan);
  } else if (tipo === "comp-menu") {
    const c = ultimoCompartido;
    nombre = c.plan ? "Propuesta de menú" : "Menú de la semana"; trabajo = () => pdfMenu(nombre, c.menu, c.plan);
  } else if (tipo === "compra") {
    const menu = ultimaCompra || menuPropio();
    nombre = "Lista de la compra"; trabajo = () => pdfCompra(menu);
  } else return;
  entregaPdf(nombre, trabajo);
});

/** Hace el PDF y, cuando está listo, ofrece guardarlo o enviarlo (hoja de compartir del iPhone) o abrirlo. */
async function entregaPdf(nombre, trabajo) {
  cierraVentana();
  const v = document.createElement("div");
  v.className = "cb-modal-fondo";
  v.innerHTML = `<div class="cb-modal" role="dialog" aria-modal="true" aria-label="PDF">
    <h2 class="h5 mb-2">📄 ${esc(nombre)}</h2><p class="mb-0" data-estado>Preparando el PDF…</p></div>`;
  document.body.appendChild(v);
  const caja = v.querySelector(".cb-modal");
  try {
    const h = await trabajo();
    h.pies();
    const bytes = await h.pdf.save();
    const archivo = nombre.replace(/[\\/:*?"<>|«»]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) + ".pdf";
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    let fichero = null;
    try { fichero = new File([blob], archivo, { type: "application/pdf" }); } catch { /* navegador antiguo */ }
    const puedeCompartir = !!(fichero && navigator.canShare && navigator.canShare({ files: [fichero] }));
    const paginas = h.pdf.getPageCount();
    caja.innerHTML = `<h2 class="h5 mb-1">📄 PDF listo</h2>
      <p class="small text-muted mb-3">${esc(archivo)} · ${paginas} ${paginas === 1 ? "página" : "páginas"}</p>
      <div class="d-grid gap-2">
        ${puedeCompartir ? `<button class="btn btn-primary" type="button" data-guardar>📤 Guardar, enviar o imprimir</button>` : ""}
        <a class="btn ${puedeCompartir ? "cb-btn-fam" : "btn-primary"}" href="${url}" download="${esc(archivo)}" target="_blank" rel="noopener">${puedeCompartir ? "Abrir el PDF" : "⬇️ Descargar el PDF"}</a>
        <button class="btn btn-link" type="button" data-cerrar>Cerrar</button>
      </div>
      ${puedeCompartir ? `<p class="small text-muted mt-2 mb-0">En el iPhone, «Guardar en Archivos» lo deja en tu móvil; desde ahí también se puede imprimir.</p>` : ""}`;
    v.addEventListener("click", ev => {
      if (ev.target === v || ev.target.closest("[data-cerrar]")) { cierraVentana(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
      if (ev.target.closest("[data-guardar]")) navigator.share({ files: [fichero], title: nombre }).catch(() => {});
    });
  } catch (err) {
    caja.innerHTML = `<h2 class="h5 mb-2">📄 No se ha podido hacer el PDF</h2>
      <p>Comprueba la conexión a internet (la primera vez hay que descargar el programa de PDF) y vuelve a intentarlo.</p>
      <button class="btn btn-primary w-100" type="button" data-cerrar>Cerrar</button>`;
    v.addEventListener("click", ev => { if (ev.target === v || ev.target.closest("[data-cerrar]")) cierraVentana(); });
    console.error(err);
  }
}
