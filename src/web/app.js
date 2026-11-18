// Frontend del proyecto. Todo lo pide a /api/..., la misma direccion de la pagina:
// el navegador nunca conoce la API ni la base de datos, solo al proxy.
const $ = (sel) => document.querySelector(sel);
let info = null;

// Escapa el texto antes de ponerlo en el HTML: lo que escribe un usuario nunca se ejecuta.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const numero = (n) => Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 });

async function pedir(ruta, opciones) {
  const res = await fetch(ruta, opciones);
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
  return datos;
}

function pintarTextos() {
  const { nombre, dominio, lema, color, recurso, accion } = info;
  document.title = `${nombre} · ${dominio}`;
  document.documentElement.style.setProperty("--marca", color);
  $("#marca").textContent = nombre;
  $("#inicial").textContent = nombre.charAt(0);
  $("#dominio").textContent = dominio;
  $("#lema").textContent = lema;
  $("#titulo-items").textContent = recurso.plural;
  $("#col-nombre").textContent = recurso.nombre;
  $("#col-detalle").textContent = recurso.detalle;
  $("#col-categoria").textContent = recurso.categoria;
  $("#col-cantidad").textContent = recurso.cantidad;
  $("#titulo-accion").textContent = accion.boton;
  $("#lbl-item").textContent = recurso.singular;
  $("#lbl-persona").textContent = accion.persona;
  $("#boton").textContent = accion.boton;
  $("#titulo-registros").textContent = accion.plural;
  $("#k-items").textContent = recurso.plural;
  $("#k-total").textContent = recurso.cantidad;
  $("#k-registros").textContent = accion.plural;
  if (accion.monto) {
    $("#campo-monto").hidden = false;
    $("#lbl-monto").textContent = accion.monto;
    $("#monto").required = true;
  }
  if (accion.anonimo) $("#nota-anonimo").hidden = false;
}

async function cargar() {
  const [items, resumen, registros] = await Promise.all([
    pedir("/api/items"), pedir("/api/resumen"), pedir("/api/registros"),
  ]);

  $("#v-items").textContent = numero(resumen.items);
  $("#v-total").textContent = numero(resumen.total);
  $("#v-registros").textContent = numero(resumen.registros);

  $("#tabla").innerHTML = items.map((i) => `
    <tr>
      <td><strong>${esc(i.nombre)}</strong></td>
      <td>${esc(i.detalle)}</td>
      <td><span class="pildora">${esc(i.categoria)}</span></td>
      <td class="num ${info.accion.modo === "descontar" && i.cantidad === 0 ? "agotado" : ""}">${numero(i.cantidad)}</td>
    </tr>`).join("");

  $("#item").innerHTML = items.map((i) => `<option value="${i.id}">${esc(i.nombre)}</option>`).join("");

  $("#registros").innerHTML = registros.length
    ? registros.map((r) => `
      <li>
        <span>${info.accion.anonimo ? "Voto registrado" : esc(r.item)}${r.monto !== null ? ` · ${numero(r.monto)}` : ""}</span>
        <small>${esc(r.persona)} · ${new Date(r.fecha).toLocaleString("es-CO")}</small>
      </li>`).join("")
    : `<li class="vacio">Todavía no hay ${info.accion.plural.toLowerCase()}.</li>`;
}

async function salud() {
  try {
    const s = await pedir("/api/health");
    $("#salud").textContent = `En línea · respondió el contenedor ${s.contenedor}`;
    $("#salud").className = "salud ok";
  } catch {
    $("#salud").textContent = "La API no responde";
    $("#salud").className = "salud mal";
  }
}

$("#formulario").addEventListener("submit", async (e) => {
  e.preventDefault();
  const aviso = $("#aviso");
  try {
    await pedir("/api/registros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: $("#item").value, persona: $("#persona").value, monto: $("#monto").value }),
    });
    aviso.textContent = "Registro guardado.";
    aviso.className = "aviso ok";
    e.target.reset();
    await cargar();
  } catch (error) {
    aviso.textContent = error.message;
    aviso.className = "aviso mal";
  }
});

(async () => {
  try {
    info = await pedir("/api/info");
    pintarTextos();
    await Promise.all([cargar(), salud()]);
  } catch (error) {
    $("#salud").textContent = `No se pudo cargar: ${error.message}`;
    $("#salud").className = "salud mal";
  }
})();
