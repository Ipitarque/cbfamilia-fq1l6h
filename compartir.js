/* El CookBook de la familia — compartir por enlace (fase 4).
   Una receta, un grupo de recetas, el menú semanal, una propuesta de menú o la lista de la compra se mandan
   como un enlace a esta misma web. Las recetas van por su código corto (c426, 001, 013g…), que no cambia
   aunque se añadan recetas nuevas. Quien abre el enlace lo ve en su móvil sin que se toque nada suyo,
   y decide si lo añade a su menú. */
"use strict";

const codigo = r => r.id.split("-")[0];
let _porCodigo = null;
const porCodigo = c => {
  if (!_porCodigo) _porCodigo = new Map(D.recetas.map(r => [codigo(r), r]));
  return _porCodigo.get(c) || null;
};
const MAX_GRUPO = 150;

// ------------------------------------------------------------------ enviar
function enlaceCompleto(hash) { return location.href.split("#")[0] + hash; }

function compartir({ titulo, texto, hash }) {
  const url = enlaceCompleto(hash);
  if (navigator.share) {
    navigator.share({ title: titulo, text: texto, url }).catch(e => {
      if (!e || e.name !== "AbortError") ventanaCompartir(titulo, texto, url);
    });
  } else ventanaCompartir(titulo, texto, url);
}

/** Si el navegador no tiene la hoja de compartir (algunos ordenadores): WhatsApp, correo o copiar. */
function ventanaCompartir(titulo, texto, url) {
  cierraVentana();
  const msg = (texto ? texto + "\n\n" : "") + url;
  const v = document.createElement("div");
  v.className = "cb-modal-fondo";
  v.innerHTML = `<div class="cb-modal" role="dialog" aria-modal="true" aria-label="Compartir">
    <h2 class="h5 mb-1">📤 Compartir</h2>
    <p class="small text-muted mb-3">${esc(titulo)}</p>
    <div class="d-grid gap-2">
      <a class="btn btn-success" href="https://wa.me/?text=${enc(msg)}" target="_blank" rel="noopener">WhatsApp</a>
      <a class="btn cb-btn-fam" href="mailto:?subject=${enc(titulo)}&body=${enc(msg)}">Correo</a>
      <button class="btn cb-btn-fam" type="button" data-copiar>📋 Copiar el enlace</button>
      <button class="btn btn-link" type="button" data-cerrar>Cerrar</button>
    </div>
  </div>`;
  v.addEventListener("click", e => {
    if (e.target === v || e.target.closest("[data-cerrar]")) cierraVentana();
    const c = e.target.closest("[data-copiar]");
    if (c) {
      const ok = () => { c.textContent = "✓ Enlace copiado"; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, () => copiaVieja(url, ok)); else copiaVieja(url, ok);
    }
  });
  document.body.appendChild(v);
}
function ventanaAviso(texto) {
  cierraVentana();
  const v = document.createElement("div");
  v.className = "cb-modal-fondo";
  v.innerHTML = `<div class="cb-modal" role="dialog" aria-modal="true"><p class="mb-3">${esc(texto)}</p>
    <button class="btn btn-primary w-100" type="button" data-cerrar>Entendido</button></div>`;
  v.addEventListener("click", e => { if (e.target === v || e.target.closest("[data-cerrar]")) cierraVentana(); });
  document.body.appendChild(v);
}
function cierraVentana() { document.querySelectorAll(".cb-modal-fondo").forEach(x => x.remove()); }
window.addEventListener("hashchange", cierraVentana);

const menuEnTexto = () => recetasDelMenu().map(r => `${codigo(r)}.${G.menu[r.id]}`).join(",");

/** Qué se comparte según el botón pulsado (data-compartir). */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-compartir]");
  if (!b) return;
  e.preventDefault();
  const tipo = b.dataset.compartir;
  if (tipo === "receta") {
    const r = porId.get(b.dataset.id);
    const caja = document.getElementById("rac");
    const racs = caja ? parseInt(caja.value, 10) : r.rac.def;
    compartir({ titulo: r.t, texto: `${r.t}${racs !== r.rac.def ? ` (para ${racs} ${r.rac.u})` : ""}, del CookBook de la familia:`,
      hash: `#/receta/${enc(r.id)}${racs !== r.rac.def ? `?r=${racs}` : ""}` });
  } else if (tipo === "grupo") {
    const lista = resultados();
    if (lista.length > MAX_GRUPO) {
      ventanaAviso(`Son ${lista.length} recetas: demasiadas para un enlace (como mucho ${MAX_GRUPO}). Usa la búsqueda o los filtros para quedarte con menos.`);
      return;
    }
    const titulo = describeFiltro();
    compartir({ titulo, texto: `${lista.length === 1 ? "1 receta" : lista.length + " recetas"} del CookBook de la familia: ${titulo}`,
      hash: `#/compartido?t=${enc(titulo)}&r=${lista.map(codigo).join(",")}` });
  } else if (tipo === "menu") {
    const n = recetasDelMenu().length;
    compartir({ titulo: "Menú de la semana", texto: `Mi menú de la semana (${n} ${n === 1 ? "receta" : "recetas"}), del CookBook de la familia:`,
      hash: `#/compartido?m=${menuEnTexto()}` });
  } else if (tipo === "compra") {
    const menu = recetasDelMenu().map(r => ({ r, personas: G.menu[r.id] }));
    const texto = "🛒 Lista de la compra\n\n" + textoCompra(listaCompra(menu), new Set()) + "\n\nLa lista y sus recetas:";
    compartir({ titulo: "Lista de la compra", texto, hash: `#/compartido?m=${menuEnTexto()}&ver=compra` });
  } else if (tipo === "propuesta") {
    const P = G.propuesta;
    if (!P || !P.plan || !P.q) return;
    compartir({ titulo: "Propuesta de menú", texto: `Propuesta de menú para ${P.q.dias} ${P.q.dias === 1 ? "día" : "días"}, del CookBook de la familia:`,
      hash: `#/compartido?n=${P.q.comensales}&p=${planEnTexto(P.plan)}` });
  }
});

function describeFiltro() {
  const partes = [];
  if (F.favs) partes.push("Favoritas");
  if (F.trucos) partes.push("Trucos");
  for (const k of ["tp", "stp", "ca", "sca", "co", "sco", "dif", "die", "tem", "oca"]) for (const v of F[k]) partes.push(v);
  if (palabras(F.texto).size) partes.push(`«${F.texto.trim()}»`);
  if (terminos(F.con).length) partes.push("con " + F.con.trim());
  if (terminos(F.sin).length) partes.push("sin " + F.sin.trim());
  if (F.max) partes.push(`hasta ${F.max} min`);
  return partes.join(" · ") || "Recetas";
}

// Propuesta en el enlace: «día.comida.papel.receta», separadas por comas.
// Comida: D desayuno, C comida, N cena. Papel: D desayuno, 1 primero, 2 segundo, N cena, x complemento (su número).
const COMIDA_A = { [C_DES]: "D", [C_COM]: "C", [C_CENA]: "N" }, A_COMIDA = { D: C_DES, C: C_COM, N: C_CENA };
const PAPEL_A = { [P_DESAYUNO]: "D", [P_PRIMERO]: "1", [P_SEGUNDO]: "2", [P_CENA]: "N", Complemento: "x" };
const A_PAPEL = { D: P_DESAYUNO, 1: P_PRIMERO, 2: P_SEGUNDO, N: P_CENA, x: "Complemento" };
function planEnTexto(plan) {
  return plan.map(s => {
    const x = s.extra ? String(COMPLEMENTOS.findIndex(c => c.nombre === s.extra)) : s.receta ? codigo(porId.get(s.receta) || { id: s.receta }) : "";
    return `${s.dia}.${COMIDA_A[s.comida]}.${PAPEL_A[s.papel] || "x"}.${x}`;
  }).join(",");
}
function planDeTexto(t) {
  const plan = [];
  let faltan = 0;
  for (const trozo of (t || "").split(",")) {
    const [d, c, p, x] = trozo.split(".");
    const dia = parseInt(d, 10), comida = A_COMIDA[c], papel = A_PAPEL[p];
    if (!dia || !comida || !papel) continue;
    if (papel === "Complemento") {
      const co = COMPLEMENTOS[parseInt(x, 10)];
      if (co) plan.push({ dia, comida, papel, extra: co.nombre });
    } else {
      const r = x ? porCodigo(x) : null;
      if (x && !r) faltan++;
      plan.push({ dia, comida, papel, receta: r });
    }
  }
  return { plan, faltan };
}
function menuDeTexto(t) {
  const menu = [];
  let faltan = 0;
  for (const trozo of (t || "").split(",")) {
    const [c, n] = trozo.split(".");
    if (!c) continue;
    const r = porCodigo(c);
    if (!r) { faltan++; continue; }
    if (!menu.some(m => m.r === r)) menu.push({ r, personas: Math.min(100, Math.max(1, parseInt(n, 10) || r.rac.def)) });
  }
  menu.sort((a, b) => cmpTitulo(a.r, b.r));
  return { menu, faltan };
}

// ------------------------------------------------------------------ recibir (#/compartido?…)
function vistaCompartido(q) {
  const aviso = n => n ? `<div class="alert alert-light border small">${n === 1 ? "Una receta del enlace ya no está" : `${n} recetas del enlace ya no están`} en el libro.</div>` : "";
  const cab = (titulo, sub) => `<div class="cb-compartido-cab mb-3"><div class="small text-muted">📤 Te han compartido</div>
    <h1 class="h3 mb-0">${esc(titulo)}</h1>${sub ? `<p class="text-muted mb-0">${esc(sub)}</p>` : ""}</div>`;

  if (q.get("r") != null) {   // grupo de recetas
    const codigos = q.get("r").split(",").filter(Boolean);
    const lista = codigos.map(porCodigo).filter(Boolean);
    const titulo = q.get("t") || "Recetas";
    document.title = titulo + " · El CookBook de la familia";
    ultimoCompartido = { lista, titulo };
    app.innerHTML = cab(titulo, `${lista.length} ${lista.length === 1 ? "receta" : "recetas"}`) + aviso(codigos.length - lista.length) +
      (lista.length ? `<div class="mb-3">${botonPdf("comp-grupo", "📄 PDF de estas recetas")}</div>` : "") +
      (lista.length ? rejilla(lista) : `<div class="cb-empty">No hay recetas que mostrar.</div>`);
    pintaBotones(app);
    return;
  }

  let menu, faltan, plan = null, personas = null;
  const mismo = location.hash;
  if (q.get("p") != null) {   // propuesta de menú por días
    const x = planDeTexto(q.get("p"));
    plan = x.plan; faltan = x.faltan;
    personas = Math.min(20, Math.max(1, parseInt(q.get("n"), 10) || 4));
    const vistos = new Set();
    menu = plan.filter(s => s.receta && !vistos.has(s.receta.id) && vistos.add(s.receta.id)).map(s => ({ r: s.receta, personas }));
    menu.sort((a, b) => cmpTitulo(a.r, b.r));
  } else {
    const x = menuDeTexto(q.get("m"));
    menu = x.menu; faltan = x.faltan;
  }
  if (q.get("ver") === "compra") {
    vistaCompra({ menu, volver: mismo.replace(/&ver=compra/, "") });
    return;
  }
  document.title = (plan ? "Propuesta de menú" : "Menú compartido") + " · El CookBook de la familia";
  ultimoCompartido = { menu, plan };
  const hashCompra = mismo + (mismo.includes("?") ? "&" : "?") + "ver=compra";
  let cuerpo = "";
  if (plan) {
    const dias = Math.max(0, ...plan.map(s => s.dia));
    const nombreComida = c => c === C_DES ? "☕ Desayuno" : c === C_COM ? "🍽 Comida" : "🌙 Cena";
    cuerpo += `<div class="cb-plan mb-3">`;
    for (let d = 1; d <= dias; d++) {
      const delDia = plan.filter(s => s.dia === d);
      if (!delDia.length) continue;
      cuerpo += `<div class="cb-plan-dia"><h2 class="h6">Día ${d}</h2>`;
      for (const comida of [...new Set(delDia.map(s => s.comida))]) {
        cuerpo += `<div class="cb-plan-comida"><div class="cb-plan-titulo">${nombreComida(comida)}</div>`;
        for (const s of delDia.filter(x => x.comida === comida)) {
          cuerpo += `<div class="cb-plan-plato">`;
          if (comida === C_COM) cuerpo += `<span class="cb-plan-papel">${s.papel === P_PRIMERO ? "1º" : s.papel === P_SEGUNDO ? "2º" : ""}</span>`;
          if (s.extra) cuerpo += `<span class="flex-grow-1 text-muted">+ ${esc(s.extra)}</span>`;
          else if (!s.receta) cuerpo += `<span class="text-muted fst-italic flex-grow-1">Sin plato del libro</span>`;
          else cuerpo += `<a class="flex-grow-1" href="#/receta/${enc(s.receta.id)}">${esc(s.receta.t)}</a>`;
          cuerpo += `</div>`;
        }
        cuerpo += `</div>`;
      }
      cuerpo += `</div>`;
    }
    cuerpo += `</div>`;
  } else {
    cuerpo += `<ul class="cb-menu-list mb-3">${menu.map(m => `<li class="cb-menu-item">
      ${m.r.foto && !m.r.truco ? `<img src="fotos/${enc(m.r.foto)}" alt="">` : `<div class="cb-menu-ph">🍽️</div>`}
      <div class="flex-grow-1 cb-menu-nombre"><a href="#/receta/${enc(m.r.id)}" class="fw-semibold">${esc(m.r.t)}</a>
        <div class="small text-muted">${esc([m.r.tp, m.r.ca, m.r.co].filter(Boolean).join(" · "))}</div></div>
      <div class="small text-nowrap"><strong>${m.personas}</strong> pers.</div></li>`).join("")}</ul>`;
  }
  const n = menu.length;
  app.innerHTML = cab(plan ? "Una propuesta de menú" : "Un menú de la semana",
    plan ? `${Math.max(0, ...plan.map(s => s.dia))} días · ${n} ${n === 1 ? "receta" : "recetas"} · para ${personas} personas`
      : `${n} ${n === 1 ? "receta" : "recetas"}`) + aviso(faltan) + cuerpo + (n ? `
    <section class="cb-panel">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <a class="btn btn-primary" href="${esc(hashCompra)}">🛒 Ver su lista de la compra</a>
        <button class="btn btn-success" type="button" id="c-anadir">🗓 Añadir a mi menú semanal</button>
        ${plan ? `<button class="btn cb-btn-fam" type="button" id="c-proponer">✨ Abrir en Proponer un menú</button>` : ""}
        <button class="btn btn-outline-secondary" type="button" data-pdf="comp-menu">📄 PDF del menú completo</button>
      </div>
      <label class="form-check mt-2 mb-0"><input type="checkbox" class="form-check-input" id="c-vaciar"> Vaciar antes mi menú semanal</label>
      <div class="text-success mt-2" id="c-ok" hidden>✓ Añadido a tu menú. <a href="#/menu">Ver mi menú</a></div>
      <div class="small text-muted mt-1">Mirarlo no cambia nada tuyo: solo se añade a tu menú si pulsas el botón.</div>
    </section>` : "");
  const b = document.getElementById("c-anadir");
  if (b) b.addEventListener("click", () => {
    if (document.getElementById("c-vaciar").checked) G.menu = {};
    for (const m of menu) G.menu[m.r.id] = m.personas;
    guarda();
    document.getElementById("c-ok").hidden = false;
  });
  const pr = document.getElementById("c-proponer");
  if (pr) pr.addEventListener("click", () => {
    const dias = Math.max(1, ...plan.map(s => s.dia));
    const tiene = c => plan.some(s => s.comida === c);
    const qq = { dias, comensales: personas, desayunos: tiene(C_DES), comidas: tiene(C_COM), cenas: tiene(C_CENA), temporada: null,
      objetivo: null, faciles: 0, medias: 0, dificiles: 0, pan: plan.some(s => s.extra === PAN.nombre), diasPan: 0 };
    G.propuesta = { form: Object.assign({}, (G.propuesta || {}).form, { dias, comensales: personas, desayunos: qq.desayunos, comidas: qq.comidas, cenas: qq.cenas }),
      q: qq, plan: planAGuardar(plan), anadido: false };
    guarda();
    location.hash = "#/proponer";
  });
}
