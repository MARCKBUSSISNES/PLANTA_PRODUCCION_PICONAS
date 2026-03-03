// js/recetas.js

let tmpIngredientes = [];
let editRecetaIndex = null;

function isAdmin(){
  const s = getSession();
  return s && String(s.rol||"").toUpperCase() === "ADMIN";
}

// 🔒 Si receta es locked (oficial), solo ADMIN la edita/elimina
function canEditReceta(rec){
  if(!rec) return false;
  if(rec.locked) return isAdmin();
  return can("recetas_editar");
}

function renderRecetas(){
  const db = getDB();

  const rows = (db.recetas||[]).map((r,i)=>`
    <tr>
      <td>
        ${escapeHtml(r.nombre || "")}
        ${r.locked ? ` <span class="tag yellow small">OFICIAL</span>` : ``}
      </td>
      <td class="right">${Number(r.rendimientoEsperado||0)} ${escapeHtml(r.unidadRend||"")}</td>
      <td class="right">${(r.ingredientes||[]).length}</td>
      <td>
        <span class="${cssSemaforo('VERDE')}">V</span>
        ${r.semaforo?.greenMin ?? "-"}-${r.semaforo?.greenMax ?? "-"}
        &nbsp;&nbsp;
        <span class="${cssSemaforo('AMARILLO')}">A</span>
        ${r.semaforo?.yellowMin ?? "-"}-${r.semaforo?.yellowMax ?? "-"}
      </td>
      <td class="right">
        <button class="btn sm" onclick="verReceta(${i})">👁 Ver</button>
        ${canEditReceta(r) ? `<button class="btn sm" onclick="editarReceta(${i})">✏️ Editar</button>` : ``}
        ${canEditReceta(r) ? `<button class="btn danger sm" onclick="deleteReceta(${i})">🗑</button>` : `<span class="muted small">—</span>`}
      </td>
    </tr>
  `).join("");

  const editable = (can("recetas_editar") || isAdmin());

  const lockedNote = !isAdmin()
    ? `<div class="muted small">Nota: las recetas marcadas como <b>OFICIAL</b> solo las puede editar/eliminar el <b>ADMIN</b>.</div><div class="hr"></div>`
    : ``;

  return `
    <div class="page-head">
      <div>
        <div class="big">Recetas</div>
        <div class="muted small">Define ingredientes, rendimiento, procedimiento y semáforo.</div>
      </div>
      <div class="actions">
        ${editRecetaIndex!=null ? `<button class="btn" onclick="cancelEditReceta()">Cancelar edición</button>` : ``}
      </div>
    </div>

    <div class="panel">
      ${lockedNote}

      ${editable ? `` : `<div class="muted small">Modo solo lectura: no tienes permiso para crear/editar recetas.</div><div class="hr"></div>`}

      <div class="grid-2">
        <div>
          <label>Nombre receta</label>
          <input id="recNombre" placeholder="Carne de Birria" ${editable?``:`disabled`}>

          <label>Producto final</label>
          <input id="recProdFinal" placeholder="Carne de Birria" ${editable?``:`disabled`}>

          <label>Rendimiento esperado (base)</label>
          <input id="recRend" type="number" step="1" placeholder="20" ${editable?``:`disabled`}>

          <label>Unidad rendimiento</label>
          <input id="recRendU" placeholder="bolsa" ${editable?``:`disabled`}>
        </div>

        <div>
          <label>VERDE mín</label>
          <input id="gMin" type="number" step="1" placeholder="19" ${editable?``:`disabled`}>

          <label>VERDE máx</label>
          <input id="gMax" type="number" step="1" placeholder="21" ${editable?``:`disabled`}>

          <label>AMARILLO mín</label>
          <input id="yMin" type="number" step="1" placeholder="13" ${editable?``:`disabled`}>

          <label>AMARILLO máx</label>
          <input id="yMax" type="number" step="1" placeholder="25" ${editable?``:`disabled`}>
        </div>
      </div>

      <!-- ✅ NUEVO: PROCEDIMIENTO -->
      <div class="hr"></div>
      <h3>Procedimiento</h3>
      <label>Pasos detallados</label>
      <textarea
        id="recProcedimiento"
        rows="7"
        style="width:100%; resize:vertical; min-height:160px; margin-top:6px; border-radius:10px; border:1px solid rgba(255,255,255,.10); background:#0b1220; color:#e5e7eb; padding:10px;"
        placeholder="Ejemplo:
1. Hervir tomates y chiles 10 minutos.
2. Licuar con ajo y cebolla.
3. Cocinar la salsa 15 minutos.
4. Agregar sal al gusto."
        ${editable?``:`disabled`}
      ></textarea>

      <div class="hr"></div>

      <h3>Ingredientes (base)</h3>
      <div class="row">
        <div style="flex:2">
          <label>Materia prima</label>
          <select id="ingMp" ${editable?``:`disabled`}>
            ${(db.materiasPrimas||[]).length
              ? (db.materiasPrimas||[]).map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.nombre)} (${escapeHtml(m.unidad||"")})</option>`).join("")
              : `<option value="">(Sin MP)</option>`
            }
          </select>
        </div>
        <div>
          <label>Cantidad base</label>
          <input id="ingCant" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>
        </div>
        <div>
          <label>Unidad</label>
          <input id="ingUni" placeholder="kg" ${editable?``:`disabled`}>
        </div>
      </div>

      ${editable ? `<button class="btn accent" onclick="addIngTemp()">➕ Agregar ingrediente</button>` : ``}

      <div id="tmpIng"></div>

      ${editable ? `<button id="btnGuardarReceta" class="btn accent" onclick="guardarReceta()">Guardar receta</button>` : ``}
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Receta</th>
          <th class="right">Rend</th>
          <th class="right">Ingredientes</th>
          <th>Semáforo</th>
          <th class="right">Acción</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="5" class="muted">Sin recetas</td></tr>`}</tbody>
    </table>

    <script>
      setTimeout(()=>{ if(typeof renderTmpIng==="function") renderTmpIng(); }, 0);
    </script>
  `;
}

function addIngTemp(){
  const db = getDB();

  // permiso: si editas receta oficial -> solo admin
  if(editRecetaIndex!=null){
    const r = (db.recetas||[])[editRecetaIndex];
    if(!canEditReceta(r)){
      alert("No tienes permiso para editar esta receta.");
      return;
    }
  }else{
    if(!can("recetas_editar") && !isAdmin()){
      alert("No tienes permiso para crear recetas.");
      return;
    }
  }

  const mpId = (document.getElementById("ingMp").value||"").trim();
  const cant = Number(document.getElementById("ingCant").value||0);
  const uni = (document.getElementById("ingUni").value||"").trim();

  const mp = (db.materiasPrimas||[]).find(x=>x.id===mpId);
  if(!mp){ alert("Selecciona una materia prima válida"); return; }
  if(!cant || cant<=0){ alert("Cantidad inválida"); return; }

  tmpIngredientes.push({
    mpId,
    mpNombre: mp.nombre,
    cantBase: cant,
    unidad: uni || mp.unidad || "und"
  });

  document.getElementById("ingCant").value="";
  renderTmpIng();
}

/* =========================
   INGREDIENTES EDITABLES
========================= */

function updateIngTemp(i, key, val){
  const db = getDB();
  if(!tmpIngredientes[i]) return;

  // permisos
  if(editRecetaIndex!=null){
    const r = (db.recetas||[])[editRecetaIndex];
    if(!canEditReceta(r)){
      alert("No tienes permiso para editar esta receta.");
      return;
    }
  }else{
    if(!can("recetas_editar") && !isAdmin()){
      alert("No tienes permiso.");
      return;
    }
  }

  if(key === "cantBase"){
    tmpIngredientes[i].cantBase = Number(val||0);
    if(!tmpIngredientes[i].cantBase || tmpIngredientes[i].cantBase <= 0) tmpIngredientes[i].cantBase = 0;
    return;
  }

  if(key === "unidad"){
    tmpIngredientes[i].unidad = String(val||"").trim();
    return;
  }

  if(key === "mpId"){
    const mp = (db.materiasPrimas||[]).find(m => m.id === val);
    if(!mp){
      alert("Materia prima inválida.");
      return;
    }
    tmpIngredientes[i].mpId = mp.id;
    tmpIngredientes[i].mpNombre = mp.nombre;
    if(!tmpIngredientes[i].unidad) tmpIngredientes[i].unidad = mp.unidad || "und";
    renderTmpIng();
    return;
  }
}

function renderTmpIng(){
  const db = getDB();
  const editable = (can("recetas_editar") || isAdmin());

  const html = tmpIngredientes.map((x,i)=>`
    <div class="panel" style="margin-top:10px">
      <div class="row" style="align-items:end;">
        <div style="flex:2; min-width:260px;">
          <label class="small muted">Materia prima</label>
          <select ${editable?``:`disabled`} onchange="updateIngTemp(${i}, 'mpId', this.value)">
            ${(db.materiasPrimas||[]).map(m => `
              <option value="${escapeHtml(m.id)}" ${m.id===x.mpId ? "selected" : ""}>
                ${escapeHtml(m.nombre)} (${escapeHtml(m.unidad||"")})
              </option>
            `).join("")}
          </select>
        </div>

        <div style="min-width:180px;">
          <label class="small muted">Cantidad</label>
          <input ${editable?``:`disabled`}
                 type="number" step="0.01"
                 value="${Number(x.cantBase||0)}"
                 oninput="updateIngTemp(${i}, 'cantBase', this.value)">
        </div>

        <div style="min-width:180px;">
          <label class="small muted">Unidad</label>
          <input ${editable?``:`disabled`}
                 value="${escapeHtml(x.unidad||'')}"
                 oninput="updateIngTemp(${i}, 'unidad', this.value)">
        </div>

        <div style="min-width:120px; display:flex; gap:10px; justify-content:flex-end;">
          ${editable ? `<button class="btn danger sm" onclick="delIngTemp(${i})">Quitar</button>` : ``}
        </div>
      </div>

      <div class="muted small" style="margin-top:6px;">
        <b>${escapeHtml(x.mpNombre || "")}</b>
      </div>
    </div>
  `).join("");

  const box = document.getElementById("tmpIng");
  if(box) box.innerHTML = html || `<div class="muted">Sin ingredientes agregados</div>`;
}

function delIngTemp(i){
  const db = getDB();
  if(editRecetaIndex!=null){
    const r = (db.recetas||[])[editRecetaIndex];
    if(!canEditReceta(r)){
      alert("No tienes permiso para editar esta receta.");
      return;
    }
  }else{
    if(!can("recetas_editar") && !isAdmin()){
      alert("No tienes permiso.");
      return;
    }
  }
  tmpIngredientes.splice(i,1);
  renderTmpIng();
}

/* =========================
   GUARDAR / EDITAR
========================= */

function guardarReceta(){
  const db = getDB();
  db.recetas = db.recetas || [];

  const nombre = (document.getElementById("recNombre").value||"").trim();
  if(!nombre){ alert("Nombre receta obligatorio"); return; }

  const isEdit = (editRecetaIndex != null);
  const old = isEdit ? db.recetas[editRecetaIndex] : null;

  if(isEdit){
    if(!canEditReceta(old)){
      alert("No tienes permiso para editar esta receta.");
      return;
    }
  }else{
    if(!can("recetas_editar") && !isAdmin()){
      alert("No tienes permiso para crear recetas.");
      return;
    }
  }

  if(tmpIngredientes.length===0){
    alert("Agrega ingredientes");
    return;
  }
  if(tmpIngredientes.some(x => !x.cantBase || x.cantBase <= 0)){
    alert("Hay ingredientes con cantidad 0. Corrige antes de guardar.");
    return;
  }

  const rec = {
    ...(isEdit ? (old||{}) : {}),
    nombre,
    productoFinal: (document.getElementById("recProdFinal").value||nombre).trim(),
    rendimientoEsperado: Number(document.getElementById("recRend").value||0),
    unidadRend: (document.getElementById("recRendU").value||"und").trim(),
    // ✅ NUEVO: PROCEDIMIENTO
    procedimiento: (document.getElementById("recProcedimiento")?.value || "").trim(),
    ingredientes: tmpIngredientes.slice(),
    semaforo: {
      greenMin: Number(document.getElementById("gMin").value||0),
      greenMax: Number(document.getElementById("gMax").value||0),
      yellowMin: Number(document.getElementById("yMin").value||0),
      yellowMax: Number(document.getElementById("yMax").value||0),
    }
  };

  if(!rec.rendimientoEsperado || rec.rendimientoEsperado<=0){ alert("Rendimiento esperado inválido"); return; }

  if(isEdit){
    db.recetas[editRecetaIndex] = rec;
  }else{
    db.recetas.push(rec);
  }

  saveDB(db);
  cancelEditReceta();
  loadView("recetas");
}

function editarReceta(i){
  const db = getDB();
  const r = (db.recetas||[])[i];
  if(!r) return;

  if(!canEditReceta(r)){
    alert("No tienes permiso para editar esta receta.");
    return;
  }

  editRecetaIndex = i;

  document.getElementById("recNombre").value = r.nombre || "";
  document.getElementById("recProdFinal").value = r.productoFinal || "";
  document.getElementById("recRend").value = Number(r.rendimientoEsperado||0);
  document.getElementById("recRendU").value = r.unidadRend || "und";

  document.getElementById("gMin").value = Number(r.semaforo?.greenMin||0);
  document.getElementById("gMax").value = Number(r.semaforo?.greenMax||0);
  document.getElementById("yMin").value = Number(r.semaforo?.yellowMin||0);
  document.getElementById("yMax").value = Number(r.semaforo?.yellowMax||0);

  // ✅ NUEVO: cargar procedimiento
  const procEl = document.getElementById("recProcedimiento");
  if(procEl) procEl.value = r.procedimiento || "";

  tmpIngredientes = (r.ingredientes||[]).map(x => ({
    mpId: x.mpId || "",
    mpNombre: x.mpNombre || "",
    cantBase: Number(x.cantBase ?? 0),
    unidad: x.unidad || "und"
  }));
  renderTmpIng();

  const btn = document.getElementById("btnGuardarReceta");
  if(btn) btn.textContent = "Actualizar receta";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEditReceta(){
  editRecetaIndex = null;
  tmpIngredientes = [];

  const btn = document.getElementById("btnGuardarReceta");
  if(btn) btn.textContent = "Guardar receta";

  const ids = [
    "recNombre","recProdFinal","recRend","recRendU",
    "gMin","gMax","yMin","yMax",
    "ingCant","ingUni",
    // ✅ NUEVO
    "recProcedimiento"
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = "";
  });

  renderTmpIng();
}

function deleteReceta(i){
  const db = getDB();
  const r = (db.recetas||[])[i];
  if(!r) return;

  if(!canEditReceta(r)){
    alert("No tienes permiso para eliminar esta receta.");
    return;
  }

  db.recetas.splice(i,1);
  saveDB(db);

  if(editRecetaIndex === i) cancelEditReceta();

  loadView("recetas");
}

/* =========================
   MODAL "VER" receta
========================= */
function closeModal(){
  const m = document.getElementById("modal");
  if(m) m.remove();
}

function verReceta(i){
  const db = getDB();
  const r = (db.recetas||[])[i];
  if(!r) return;

  const ing = (r.ingredientes||[]).map(x => {
    const mp = x.mpNombre || x.mpId || "MP";
    const cant = x.cantBase ?? 0;
    const uni = x.unidad || "";
    return `<li>${escapeHtml(String(cant))} ${escapeHtml(String(uni))} — ${escapeHtml(String(mp))}</li>`;
  }).join("");

  const proc = (r.procedimiento || "").trim();
  const procHtml = proc
    ? `<div style="margin-top:10px; white-space:pre-wrap;">${escapeHtml(proc)}</div>`
    : `<div class="muted" style="margin-top:10px;">Sin procedimiento definido</div>`;

  const html = `
    <div class="modal-backdrop" onclick="closeModal()"></div>
    <div class="modal">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div class="big" style="font-size:18px;">
            ${escapeHtml(r.nombre)}
            ${r.locked ? ` <span class="tag yellow small">OFICIAL</span>` : ``}
          </div>
          <div class="muted small">
            Producto: ${escapeHtml(r.productoFinal||"")} • Rend: ${Number(r.rendimientoEsperado||0)} ${escapeHtml(r.unidadRend||"")}
          </div>
        </div>
        <button class="btn" onclick="closeModal()">Cerrar</button>
      </div>

      <div class="hr"></div>

      <div class="panel">
        <b>Ingredientes</b>
        <ul style="margin:10px 0 0 18px;">${ing || `<li class="muted">Sin ingredientes</li>`}</ul>
      </div>

      <div class="panel" style="margin-top:12px;">
        <b>Procedimiento</b>
        ${procHtml}
      </div>

      <div class="panel" style="margin-top:12px;">
        <b>Semáforo</b>
        <div class="small muted" style="margin-top:6px;">
          VERDE: ${r.semaforo?.greenMin ?? "-"} a ${r.semaforo?.greenMax ?? "-"} •
          AMARILLO: ${r.semaforo?.yellowMin ?? "-"} a ${r.semaforo?.yellowMax ?? "-"}
        </div>
      </div>
    </div>
  `;

  const modal = document.createElement("div");
  modal.id = "modal";
  modal.innerHTML = html;
  document.body.appendChild(modal);
}