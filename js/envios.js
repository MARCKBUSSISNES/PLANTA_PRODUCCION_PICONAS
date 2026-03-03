// js/envios.js
console.log("[envios.js] cargado OK");

var envioCarrito = [];

function renderEnvios() {
  var db = getDB();

  var clientesOpts = (db.clientes || []).map(function (c, i) {
    return '<option value="' + i + '">' + escapeHtml(c.nombre) + "</option>";
  }).join("");

  var vehOpts = (db.vehiculos || []).map(function (v, i) {
    return '<option value="' + i + '">' + escapeHtml(v.placa) + " - " + escapeHtml(v.piloto) + "</option>";
  }).join("");

  var pt = getInventarioPTAgregado(); // viene de utils.js
  var ptOpts = pt.map(function (p, idx) {
    return '<option value="' + idx + '">' +
      escapeHtml(p.producto) + " | Lote " + escapeHtml(p.lote) + " | Disp: " + p.cantidad +
      "</option>";
  }).join("");

  var carritoRows = envioCarrito.map(function (it, i) {
    return (
      "<tr>" +
      "<td>" + escapeHtml(it.producto) + "</td>" +
      "<td>" + escapeHtml(it.lote) + "</td>" +
      '<td class="right">' + it.cantidad + "</td>" +
      '<td class="right">' + money(it.precio) + "</td>" +
      '<td class="right">' + money(it.subtotal) + "</td>" +
      '<td class="right"><button class="btn danger" onclick="quitarItemEnvio(' + i + ')">X</button></td>' +
      "</tr>"
    );
  }).join("");

  var total = envioCarrito.reduce(function (a, b) { return a + (b.subtotal || 0); }, 0);

  return (
    '<div class="page-head">' +
      "<div>" +
        "<h2>Envíos a Clientes</h2>" +
        '<div class="muted">Confirma al momento: descuenta Inventario PT + registra Venta + imprime ticket 80mm.</div>' +
      "</div>" +
      '<div class="actions">' +
        '<button class="btn" onclick="exportarVentasXlsx()">Exportar Ventas (Excel)</button>' +
        '<button class="btn" onclick="exportarEnviosXlsx()">Exportar Envíos (Excel)</button>' +
      "</div>" +
    "</div>" +

    '<div class="grid-2">' +

      '<div class="panel">' +
        "<h3>Datos del Envío</h3>" +

        "<label>Cliente</label>" +
        '<select id="envCliente">' + (clientesOpts || '<option value="">(No hay clientes)</option>') + "</select>" +

        "<label>Vehículo / Piloto</label>" +
        '<select id="envVehiculo">' + (vehOpts || '<option value="">(No hay vehículos)</option>') + "</select>" +

        "<label>Observación</label>" +
        '<input id="envObs" placeholder="Ej: entrega urgente, evento, etc." />' +

        '<div class="hr"></div>' +

        "<h3>Agregar Producto (desde Inventario PT)</h3>" +

        "<label>Producto / Lote</label>" +
        '<select id="envPTSelect">' + (ptOpts || '<option value="">(Inventario PT vacío)</option>') + "</select>" +

        '<div class="row">' +
          "<div>" +
            "<label>Cantidad</label>" +
            '<input id="envQty" type="number" min="1" placeholder="0"/>' +
          "</div>" +
          "<div>" +
            "<label>Precio (variable)</label>" +
            '<input id="envPrecio" type="number" min="0" step="0.01" placeholder="Q0.00"/>' +
          "</div>" +
        "</div>" +

        '<button class="btn accent" onclick="agregarItemEnvio()">Agregar al envío</button>' +
      "</div>" +

      '<div class="panel">' +
        "<h3>Detalle</h3>" +
        '<table class="table">' +
          "<thead>" +
            "<tr>" +
              "<th>Producto</th>" +
              "<th>Lote</th>" +
              '<th class="right">Cant</th>' +
              '<th class="right">P/U</th>' +
              '<th class="right">Total</th>' +
              "<th></th>" +
            "</tr>" +
          "</thead>" +
          "<tbody>" +
            (carritoRows || '<tr><td colspan="6" class="muted">Sin productos agregados</td></tr>') +
          "</tbody>" +
        "</table>" +

        '<div class="totals">' +
          '<div class="muted">Total</div>' +
          '<div class="big">' + money(total) + "</div>" +
        "</div>" +

        '<div class="row">' +
          '<button class="btn" onclick="limpiarEnvio()">Limpiar</button>' +
          '<button class="btn accent" onclick="confirmarEnvio()">Confirmar + Imprimir Ticket</button>' +
        "</div>" +

        '<div class="hr"></div>' +
        '<button class="btn" onclick="enviarCorreoResumenEnvio()">Enviar resumen por correo (mailto)</button>' +
        '<div class="muted small">* El correo abre tu app de correo. El Excel lo descargas y lo adjuntas.</div>' +
      "</div>" +

    "</div>"
  );
}

function agregarItemEnvio() {
  var ptList = getInventarioPTAgregado();
  var sel = document.getElementById("envPTSelect");
  var idx = sel ? Number(sel.value) : NaN;

  var qty = Number(document.getElementById("envQty").value);
  var precio = Number(document.getElementById("envPrecio").value);

  if (!ptList[idx]) { alert("Selecciona un producto válido."); return; }
  if (!qty || qty <= 0) { alert("Cantidad inválida."); return; }
  if (!isFinite(precio) || precio < 0) { alert("Precio inválido."); return; }
  if (qty > ptList[idx].cantidad) { alert("No hay suficiente inventario PT."); return; }

  var base = ptList[idx];
  var producto = base.producto;
  var lote = base.lote;

  // agrupa si coincide producto+lote+precio
  var found = null;
  for (var i = 0; i < envioCarrito.length; i++) {
    var x = envioCarrito[i];
    if (x.producto === producto && x.lote === lote && x.precio === precio) { found = x; break; }
  }

  if (found) {
    found.cantidad += qty;
    found.subtotal = found.cantidad * found.precio;
  } else {
    envioCarrito.push({ producto: producto, lote: lote, cantidad: qty, precio: precio, subtotal: qty * precio });
  }

  document.getElementById("envQty").value = "";
  document.getElementById("envPrecio").value = "";
  loadView("envios");
}

function quitarItemEnvio(i) {
  envioCarrito.splice(i, 1);
  loadView("envios");
}

function limpiarEnvio() {
  envioCarrito = [];
  loadView("envios");
}

function confirmarEnvio() {
  var db = getDB();
  if (!envioCarrito.length) { alert("Agrega productos al envío."); return; }

  var cliIdx = document.getElementById("envCliente").value;
  var vehIdx = document.getElementById("envVehiculo").value;

  var cliente = (db.clientes || [])[cliIdx];
  var vehiculo = (db.vehiculos || [])[vehIdx];

  if (!cliente) { alert("Selecciona un cliente."); return; }
  if (!vehiculo) { alert("Selecciona un vehículo/piloto."); return; }

  // validar stock
  var agg = getInventarioPTAgregado();
  for (var i = 0; i < envioCarrito.length; i++) {
    var it = envioCarrito[i];
    var match = null;
    for (var j = 0; j < agg.length; j++) {
      if (agg[j].producto === it.producto && agg[j].lote === it.lote) { match = agg[j]; break; }
    }
    if (!match || it.cantidad > match.cantidad) {
      alert("Inventario insuficiente para: " + it.producto + " lote " + it.lote);
      return;
    }
  }

  // descontar inventarioPT (por registros)
  for (var k = 0; k < envioCarrito.length; k++) {
    descontarInventarioPT(db, envioCarrito[k].producto, envioCarrito[k].lote, envioCarrito[k].cantidad);
  }

  var envioId = generarCorrelativo("ENV");
  var fechaISO = new Date().toISOString();
  var obs = (document.getElementById("envObs").value || "").trim();

  var total = envioCarrito.reduce(function (a, b) { return a + (b.subtotal || 0); }, 0);

  var envio = {
    envioId: envioId,
    fechaISO: fechaISO,
    clienteNombre: cliente.nombre,
    clienteDireccion: cliente.direccion || "",
    clienteTelefono: cliente.telefono || "",
    vehiculoPlaca: vehiculo.placa || "",
    vehiculoPiloto: vehiculo.piloto || "",
    obs: obs,
    items: envioCarrito.map(function (x) { return {
      producto: x.producto, lote: x.lote, cantidad: x.cantidad, precio: x.precio, subtotal: x.subtotal
    };}),
    total: total
  };

  db.envios = db.envios || [];
  db.ventas = db.ventas || [];

  db.envios.push(envio);
  db.ventas.push({
    ventaId: envioId,
    fechaISO: fechaISO,
    tipo: "ENVIO",
    clienteNombre: cliente.nombre,
    items: envio.items.map(function (x) { return {
      producto: x.producto, lote: x.lote, cantidad: x.cantidad, precio: x.precio, subtotal: x.subtotal
    };}),
    total: total
  });

  saveDB(db);

  // imprime ticket (tickets.js)
  imprimirTicketEnvio(envio);

  envioCarrito = [];
  loadView("inventarioPT");
  alert("Envío confirmado: " + envioId);
}

function descontarInventarioPT(db, producto, lote, cantidad) {
  var restante = cantidad;
  db.inventarioPT = db.inventarioPT || [];

  for (var i = 0; i < db.inventarioPT.length; i++) {
    if (restante <= 0) break;
    var reg = db.inventarioPT[i];
    if (reg.producto !== producto) continue;
    if (reg.lote !== lote) continue;

    var disp = Number(reg.cantidad || 0);
    if (disp <= 0) continue;

    var take = Math.min(disp, restante);
    reg.cantidad = disp - take;
    restante -= take;
  }

  if (restante > 0) {
    throw new Error("Descuento inventarioPT inconsistente.");
  }
}

function enviarCorreoResumenEnvio() {
  var db = getDB();
  var subject = "Las Piconas - Resumen de Envío";
  var body = "";

  if (envioCarrito.length > 0) {
    var total = envioCarrito.reduce(function (a, b) { return a + (b.subtotal || 0); }, 0);
    body += "RESUMEN (sin confirmar)\n\n";
    for (var i = 0; i < envioCarrito.length; i++) {
      var it = envioCarrito[i];
      body += "- " + it.producto + " | Lote " + it.lote + " | Cant " + it.cantidad +
              " | P/U " + money(it.precio) + " | " + money(it.subtotal) + "\n";
    }
    body += "\nTOTAL: " + money(total) + "\n\n";
    body += "Nota: Descarga el Excel desde el sistema y adjúntalo manualmente.\n";
  } else if ((db.envios || []).length > 0) {
    var envio = db.envios[db.envios.length - 1];
    subject = "Las Piconas - Envío " + envio.envioId;
    body += "ENVÍO: " + envio.envioId + "\nCLIENTE: " + envio.clienteNombre +
            "\nFECHA: " + new Date(envio.fechaISO).toLocaleString() + "\n\n";
    for (var j = 0; j < envio.items.length; j++) {
      var x = envio.items[j];
      body += "- " + x.producto + " | Lote " + x.lote + " | Cant " + x.cantidad +
              " | P/U " + money(x.precio) + " | " + money(x.subtotal) + "\n";
    }
    body += "\nTOTAL: " + money(envio.total) + "\n";
    body += "\nNota: Adjunta el Excel exportado desde el sistema.\n";
  } else {
    alert("No hay carrito ni envíos recientes.");
    return;
  }

  var mailto = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  window.location.href = mailto;
}