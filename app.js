"use strict";

/* Flujos conocidos. La ruta de derivación solo se completa donde el material
   del área la define de forma explícita; si no, queda en null y se avisa. */
const FLUJOS = {
  "list_omnichannel": {
    nombre: "Publicar individual", cat: "publicar",
    ejemplo: "142643856-list_omnichannel-db80555a48e5",
    ruta: "CEM Errores vender → Errores generales al publicar", confirmado: true
  },
  "list_equals-omni": {
    nombre: "Publicar uno igual", cat: "publicar",
    ejemplo: "285100796-list_equals-omni-cfd32162b798",
    ruta: "CEM Errores vender → Errores generales al publicar", confirmado: true
  },
  "list_similar-omni": {
    nombre: "Publicar similar", cat: "publicar",
    ejemplo: "1451814384-list_similar-omni-1e44b9028b9a",
    ruta: "CEM Errores vender → Errores generales al publicar", confirmado: true
  },
  "update_omni": {
    nombre: "Modificar publicación", cat: "modificar",
    ejemplo: "123456789-update_omni-db9068be283e",
    ruta: null, confirmado: true
  },
  "listmot": {
    nombre: "Publicar vehículos", cat: "clasificados",
    ejemplo: "usuario-listmot-token12chars",
    ruta: "Errores vender → Clasificados (vehículos, inmuebles y servicios)", confirmado: false
  },
  "listres": {
    nombre: "Publicar inmuebles", cat: "clasificados",
    ejemplo: "usuario-listres-token12chars",
    ruta: "Errores vender → Clasificados (vehículos, inmuebles y servicios)", confirmado: false
  },
  "listsrv": {
    nombre: "Publicar servicios", cat: "clasificados",
    ejemplo: "usuario-listsrv-token12chars",
    ruta: "Errores vender → Clasificados (vehículos, inmuebles y servicios)", confirmado: false
  }
};

/* Cómo aparece el flujo en la URL frente a cómo lo pide el equipo de bugs.
   Si aparece a la izquierda, la app devuelve el ID corregido. */
const VARIANTES = {
  "updateomni": "update_omni"
};

const PAISES = {
  "com.ar": "Argentina", "com.mx": "México", "com.co": "Colombia",
  "com.pe": "Perú", "com.uy": "Uruguay", "com.ec": "Ecuador",
  "com.ve": "Venezuela", "com.bo": "Bolivia", "com.py": "Paraguay",
  "com.do": "Rep. Dominicana", "com.gt": "Guatemala", "com.hn": "Honduras",
  "com.ni": "Nicaragua", "com.pa": "Panamá", "com.sv": "El Salvador",
  "com.br": "Brasil", "co.cr": "Costa Rica", "cl": "Chile"
};

const PASOS = {
  "variation": "Variación",
  "sales_condition_form": "Condiciones de venta",
  "modificar": "Modificación"
};

const RE_ESTRICTA    = /(\d{1,10})-([A-Za-z][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*?)-([0-9a-fA-F]{12})(?![0-9a-zA-Z])/;
const RE_LAXA        = /(\d{1,10})-([A-Za-z][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*?)-([A-Za-z0-9]+)(?![A-Za-z0-9])/;
const RE_TOKEN_SOLO  = /^[0-9a-fA-F]{8,20}$/;
const RE_CAUSE       = /\((\d{2,6})\)/;
const RE_PUBLICACION = /\b(ML[A-Z]{1,2}\d{6,})\b/i;
const RE_DOMINIO     = /mercadoli[bv]re\.(com\.[a-z]{2}|co\.cr|cl)\b/i;

/* ---------- Análisis ---------- */

function analizar(texto) {
  const limpio = String(texto || "").trim().replace(/^["'<]+|[">']+$/g, "");
  const r = { entrada: limpio, estado: "bad", titulo: "", detalle: "",
              partes: null, datos: [], aviso: null, sessionId: null };

  if (!limpio) {
    r.titulo = "No hay nada para validar";
    r.detalle = "Pegá la URL del flujo o el texto del mensaje de error.";
    return r;
  }

  const causeId     = (limpio.match(RE_CAUSE) || [])[1] || null;
  const dominio     = (limpio.match(RE_DOMINIO) || [])[1] || null;
  const publicacion = (limpio.match(RE_PUBLICACION) || [])[1] || null;

  let paso = null;
  for (const clave of Object.keys(PASOS)) {
    if (new RegExp("/" + clave + "(/|$|\\?)").test(limpio)) { paso = PASOS[clave]; break; }
  }

  if (RE_TOKEN_SOLO.test(limpio)) {
    r.titulo = "Esto es solo el token, no el ID de sesión";
    r.detalle = "Le falta el usuario y el flujo adelante. El ID completo se ve así: 123456789-update_omni-"
              + limpio.toLowerCase() + ". Volvé a la URL y copiala entera.";
    return r;
  }

  const estricta = limpio.match(RE_ESTRICTA);
  const laxa = estricta ? null : limpio.match(RE_LAXA);
  const m = estricta || laxa;

  if (!m) {
    r.titulo = "No se encontró ningún ID de sesión";
    r.detalle = "Copiá la URL completa desde la barra de direcciones mientras el usuario está en la pantalla del error.";
    return r;
  }

  const [completo, usuario, flujo, token] = m;
  const variante = Object.prototype.hasOwnProperty.call(VARIANTES, flujo) ? VARIANTES[flujo] : null;
  const canonico = variante || flujo;
  const conocido = Object.prototype.hasOwnProperty.call(FLUJOS, canonico);
  const tokenOk = /^[0-9a-fA-F]{12}$/.test(token);

  r.sessionId = completo;
  r.corregido = variante ? usuario + "-" + variante + "-" + token : null;
  r.partes = {
    usuario: { valor: usuario, ok: usuario.length <= 10 },
    flujo:   { valor: flujo,   ok: conocido && !variante },
    token:   { valor: token,   ok: tokenOk }
  };

  if (variante) {
    r.estado = "warn";
    r.titulo = "Hay que corregirle el guion bajo";
    r.detalle = "En la URL el flujo viene como \"" + flujo + "\", pero el equipo de bugs lo pide como \""
              + variante + "\". Abajo está el ID ya corregido.";
    if (!tokenOk) {
      r.detalle += " Ojo que además el token tiene " + token.length + " caracteres en vez de 12.";
    }
  } else if (tokenOk && conocido) {
    r.estado = "ok";
    r.titulo = "ID de sesión válido";
    r.detalle = "Estructura correcta. Podés derivarlo.";
  } else if (!tokenOk) {
    r.estado = "warn";
    r.titulo = "El token no tiene 12 caracteres";
    r.detalle = "Tiene " + token.length + ". Puede estar cortado, o ser un flujo que todavía no conocemos. "
              + "Confirmá contra la URL antes de derivar.";
  } else {
    r.estado = "warn";
    r.titulo = "Flujo no reconocido";
    r.detalle = "El formato es correcto pero \"" + flujo + "\" no está en la lista de flujos conocidos.";
  }

  const info = FLUJOS[canonico];
  r.datos.push(["Flujo", info ? info.nombre : flujo]);
  if (dominio) r.datos.push(["País", PAISES[dominio.toLowerCase()] || dominio]);
  if (publicacion) r.datos.push(["Publicación", publicacion]);
  if (paso) r.datos.push(["Paso", paso]);
  r.datos.push(["Cause id", causeId || "falta, copialo del mensaje de error"]);

  if (info && info.ruta) {
    r.datos.push(["Derivar a", info.ruta]);
  } else if (info) {
    r.aviso = r.aviso || "El material del área no define ruta de derivación para este flujo. Confirmala antes de enviar.";
  }

  return r;
}

function idFinal(r) {
  return r.corregido || r.sessionId;
}

function armarBloque(r) {
  const lineas = ["ID de sesión: " + (idFinal(r) || "—")];
  if (r.corregido) lineas.push("Venía en la URL como: " + r.sessionId);
  for (const [k, v] of r.datos) lineas.push(k + ": " + v);
  if (/^https?:\/\//i.test(r.entrada)) lineas.push("URL: " + r.entrada);
  return lineas.join("\n");
}

if (typeof module !== "undefined") module.exports = { analizar, armarBloque, idFinal, FLUJOS, VARIANTES };

/* ---------- Utilidades de interfaz ---------- */

const $ = sel => document.querySelector(sel);

function avisarEnBoton(boton, texto) {
  const antes = boton.textContent;
  boton.textContent = texto;
  setTimeout(() => { boton.textContent = antes; }, 1400);
}

async function copiar(texto, boton) {
  try {
    await navigator.clipboard.writeText(texto);
    avisarEnBoton(boton, "Copiado");
  } catch (e) {
    const tmp = document.createElement("textarea");
    tmp.value = texto;
    document.body.appendChild(tmp);
    tmp.select();
    try { document.execCommand("copy"); avisarEnBoton(boton, "Copiado"); }
    catch (e2) { avisarEnBoton(boton, "No se pudo copiar"); }
    tmp.remove();
  }
}

/* ---------- Render del resultado ---------- */

let ultimo = null;

function pintar(r) {
  ultimo = r;
  $("#salida").style.display = "block";

  const v = $("#veredicto");
  v.className = "vidrio veredicto v-" + r.estado;
  v.innerHTML = "";
  const t = document.createElement("strong"); t.textContent = r.titulo;
  const d = document.createElement("p");      d.textContent = r.detalle;
  v.append(t, d);

  const anat = $("#anatomia");
  anat.innerHTML = "";
  if (r.partes) {
    ["usuario", "flujo", "token"].forEach((clave, i) => {
      if (i > 0) {
        const u = document.createElement("div");
        u.className = "union"; u.textContent = "—";
        anat.appendChild(u);
      }
      const p = r.partes[clave];
      const caja = document.createElement("div");
      caja.className = "seg seg-" + clave + " " + (p.ok ? "bien" : "mal");

      const nom = document.createElement("div"); nom.className = "seg-nombre"; nom.textContent = clave;
      const val = document.createElement("div"); val.className = "seg-valor";  val.textContent = p.valor;
      caja.append(nom, val);

      if (clave === "token") {
        const med = document.createElement("div");
        med.className = "medidor";
        const total = Math.max(12, p.valor.length);
        for (let n = 0; n < total; n++) {
          const pt = document.createElement("div");
          pt.className = "punto";
          if (n < p.valor.length) pt.classList.add(n < 12 ? "lleno" : "sobra");
          med.appendChild(pt);
        }
        caja.appendChild(med);
      }

      const med2 = document.createElement("div");
      med2.className = "seg-medida";
      med2.textContent = clave === "token"
        ? p.valor.length + " de 12 caracteres"
        : p.valor.length + " caracteres";
      caja.appendChild(med2);
      anat.appendChild(caja);
    });
  }

  const datos = $("#datos");
  datos.innerHTML = "";
  datos.hidden = !r.datos.length;
  for (const [k, val] of r.datos) {
    const fila = document.createElement("div"); fila.className = "dato";
    const a = document.createElement("span"); a.textContent = k;
    const b = document.createElement("span"); b.textContent = val;
    fila.append(a, b); datos.appendChild(fila);
  }

  const aviso = $("#aviso");
  aviso.className = "vidrio aviso";
  aviso.hidden = !r.aviso;
  aviso.textContent = r.aviso || "";

  $("#bloque").textContent = armarBloque(r);
  $("#salida").scrollIntoView({ behavior: "smooth", block: "nearest" });

  $("#btn-solo-id").hidden = !idFinal(r);
  $("#btn-solo-id").textContent = r.corregido ? "Copiar el ID corregido" : "Copiar solo el ID";

  if (r.entrada) registrar(r);
  if ((r.estado === "ok" || r.corregido) && idFinal(r) && autoAbrir()) abrirVentana(r);
}

/* ---------- Referencia de flujos ---------- */

function pintarFlujos(cat) {
  const cont = $("#lista-flujos");
  cont.innerHTML = "";
  Object.entries(FLUJOS).filter(([, f]) => f.cat === cat).forEach(([, f]) => {
    const ficha = document.createElement("div");
    ficha.className = "flujo";

    const h = document.createElement("h3");   h.textContent = f.nombre;
    const c = document.createElement("code"); c.textContent = f.ejemplo;
    const ruta = document.createElement("div");
    ruta.className = "ruta" + (f.ruta ? "" : " sin");
    ruta.textContent = f.ruta || "Sin ruta definida en el material del área.";

    ficha.append(h, c, ruta);

    if (!f.confirmado) {
      const nota = document.createElement("div");
      nota.className = "ruta sin";
      nota.textContent = "Formato esperado, todavía sin un caso real confirmado.";
      ficha.appendChild(nota);
    }
    cont.appendChild(ficha);
  });
}

function activarCategoria(boton) {
  const botones = [...document.querySelectorAll(".segmentado button")];
  botones.forEach(b => b.setAttribute("aria-selected", String(b === boton)));
  $("#indicador").style.transform = "translateX(" + (botones.indexOf(boton) * 100) + "%)";
  pintarFlujos(boton.dataset.cat);
}

/* ---------- Historial ---------- */

const CLAVE = "validador-historial";
let memoria = [];
let historial = [];

function leerHistorial() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? JSON.parse(crudo) : [];
  } catch (e) { return memoria; }
}

function guardarHistorial(lista) {
  memoria = lista;
  try { localStorage.setItem(CLAVE, JSON.stringify(lista)); } catch (e) { /* modo privado */ }
}

function registrar(r) {
  const entrada = {
    id: idFinal(r) || r.entrada.slice(0, 44) || "sin contenido",
    estado: r.estado,
    bloque: armarBloque(r),
    hora: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
  };
  if (historial[0] && historial[0].id === entrada.id) historial.shift();
  historial.unshift(entrada);
  historial = historial.slice(0, 20);
  guardarHistorial(historial);
  pintarHistorial();
}

function pintarHistorial() {
  const cont = $("#lista-historial");
  const globo = $("#globo");
  cont.innerHTML = "";

  const revisar = historial.filter(h => h.estado !== "ok").length;
  globo.hidden = revisar === 0;
  globo.textContent = revisar || "";

  if (!historial.length) {
    const vacio = document.createElement("div");
    vacio.className = "vacio";
    vacio.textContent = "Todavía no validaste ningún caso.";
    cont.appendChild(vacio);
    $("#fila-limpiar").hidden = true;
    return;
  }

  historial.forEach(h => {
    const fila = document.createElement("div");
    fila.className = "caso";

    const pip = document.createElement("div"); pip.className = "pip " + h.estado;

    const cuerpo = document.createElement("div"); cuerpo.className = "cuerpo";
    const id  = document.createElement("div"); id.className = "id";   id.textContent = h.id;
    const hor = document.createElement("div"); hor.className = "hora"; hor.textContent = h.hora;
    cuerpo.append(id, hor);

    const btn = document.createElement("button"); btn.textContent = "Copiar";
    btn.addEventListener("click", e => copiar(h.bloque, e.currentTarget));

    fila.append(pip, cuerpo, btn);
    cont.appendChild(fila);
  });

  $("#fila-limpiar").hidden = false;
}

/* ---------- Navegación ---------- */

function irA(nombre) {
  document.querySelectorAll(".vista").forEach(v => {
    v.classList.toggle("activa", v.id === "vista-" + nombre);
  });
  document.querySelectorAll(".tab").forEach(t => {
    if (t.dataset.vista === nombre) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (location.hash !== "#" + nombre) history.replaceState(null, "", "#" + nombre);
}

/* ---------- Ventana de copiado ---------- */

const CLAVE_AUTO = "validador-auto-ventana";

function autoAbrir() {
  try { return localStorage.getItem(CLAVE_AUTO) !== "no"; } catch (e) { return true; }
}

function abrirVentana(r) {
  $("#ventana-id").textContent = idFinal(r);
  $("#ventana-titulo").textContent = r.corregido ? "ID de sesión corregido" : "ID de sesión listo";
  const nota = $("#ventana-nota");
  nota.hidden = !r.corregido;
  if (r.corregido) nota.textContent = "En la URL venía como " + r.sessionId + ". Le agregamos el guion bajo que pide el equipo de bugs.";
  $("#ventana-caja").classList.toggle("corregida", Boolean(r.corregido));
  $("#chk-auto").checked = autoAbrir();
  const v = $("#ventana");
  if (typeof v.showModal === "function") v.showModal();
  else v.setAttribute("open", "");
}

function cerrarVentana() {
  const v = $("#ventana");
  if (typeof v.close === "function") v.close();
  else v.removeAttribute("open");
}

/* ---------- Eventos ---------- */

$("#btn-validar").addEventListener("click", () => pintar(analizar($("#entrada").value)));

$("#entrada").addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) pintar(analizar(e.target.value));
});

$("#btn-pegar").addEventListener("click", async e => {
  try {
    const texto = await navigator.clipboard.readText();
    $("#entrada").value = texto;
    pintar(analizar(texto));
  } catch (err) {
    avisarEnBoton(e.currentTarget, "Pegalo a mano");
    $("#entrada").focus();
  }
});

$("#btn-solo-id").addEventListener("click", () => {
  if (ultimo && idFinal(ultimo)) abrirVentana(ultimo);
});

$("#btn-copiar-solo-id").addEventListener("click", e => {
  if (ultimo && idFinal(ultimo)) copiar(idFinal(ultimo), e.currentTarget);
});

$("#btn-cerrar-ventana").addEventListener("click", cerrarVentana);

$("#chk-auto").addEventListener("change", e => {
  try { localStorage.setItem(CLAVE_AUTO, e.target.checked ? "si" : "no"); } catch (err) {}
});

$("#ventana").addEventListener("click", e => {
  if (e.target === $("#ventana")) cerrarVentana();
});

$("#btn-copiar").addEventListener("click", e => {
  if (ultimo) copiar(armarBloque(ultimo), e.currentTarget);
});

if (navigator.share) {
  const compartir = $("#btn-compartir");
  compartir.hidden = false;
  compartir.addEventListener("click", async () => {
    if (!ultimo) return;
    try { await navigator.share({ title: "Session ID", text: armarBloque(ultimo) }); }
    catch (err) { /* el usuario canceló */ }
  });
}

$("#btn-limpiar").addEventListener("click", () => {
  historial = [];
  guardarHistorial(historial);
  pintarHistorial();
});

document.querySelectorAll(".segmentado button").forEach(b => {
  b.addEventListener("click", () => activarCategoria(b));
});

document.querySelectorAll(".tab").forEach(t => {
  t.addEventListener("click", () => irA(t.dataset.vista));
});

/* ---------- Arranque ---------- */

pintarFlujos("publicar");
historial = leerHistorial();
pintarHistorial();

const inicial = (location.hash || "#validar").slice(1);
if (["validar", "flujos", "historial"].includes(inicial)) irA(inicial);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* sin conexión o file:// */ });
  });
}
