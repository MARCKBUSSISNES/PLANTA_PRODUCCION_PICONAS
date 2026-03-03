// js/export.js

function exportarEnviosXlsx(){
  const db = getDB();
  const rows = [];

  for (const e of (db.envios || [])) {
    for (const it of e.items) {
      rows.push({
        ENVIO: e.envioId,
        FECHA: new Date(e.fechaISO).toLocaleString(),
        CLIENTE: e.clienteNombre,
        DIRECCION: e.clienteDireccion || "",
        TELEFONO: e.clienteTelefono || "",
        VEHICULO: e.vehiculoPlaca || "",
        PILOTO: e.vehiculoPiloto || "",
        PRODUCTO: it.producto,
        LOTE: it.lote,
        CANTIDAD: it.cantidad,
        PRECIO: it.precio,
        SUBTOTAL: it.subtotal,
        TOTAL_ENVIO: e.total
      });
    }
  }

  if (rows.length === 0) { alert("No hay envíos para exportar."); return; }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Envios");
  XLSX.writeFile(wb, `ENVÍOS_LAS_PICONAS_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportarVentasXlsx(){
  const db = getDB();
  const rows = [];

  for (const v of (db.ventas || [])) {
    for (const it of v.items) {
      rows.push({
        VENTA: v.ventaId,
        FECHA: new Date(v.fechaISO).toLocaleString(),
        TIPO: v.tipo,
        CLIENTE: v.clienteNombre,
        PRODUCTO: it.producto,
        LOTE: it.lote,
        CANTIDAD: it.cantidad,
        PRECIO: it.precio,
        SUBTOTAL: it.subtotal,
        TOTAL_VENTA: v.total
      });
    }
  }

  if (rows.length === 0) { alert("No hay ventas para exportar."); return; }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ventas");
  XLSX.writeFile(wb, `VENTAS_LAS_PICONAS_${new Date().toISOString().slice(0,10)}.xlsx`);
}