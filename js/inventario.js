// js/inventario.js
function renderInventarioPT(){
  const pt = getInventarioPTAgregado();

  let rows = pt.map(p=>`
    <tr>
      <td>${escapeHtml(p.producto)}</td>
      <td>${escapeHtml(p.lote)}</td>
      <td class="right">${p.cantidad}</td>
    </tr>
  `).join("");

  return `
    <h2>Inventario Producto Terminado</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Lote</th>
          <th class="right">Cantidad</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="3" class="muted">Sin inventario PT</td></tr>`}
      </tbody>
    </table>
  `;
}