// js/utils.js

function money(n){
  const v = Number(n || 0);
  return "Q" + v.toFixed(2);
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function getUserName(){
  const s = localStorage.getItem("SESSION");
  if(!s) return "SIN_SESION";
  try { return JSON.parse(s).usuario || "USUARIO"; } catch { return "USUARIO"; }
}

function semaforoRend(real, sem){
  // sem: {greenMin, greenMax, yellowMin, yellowMax}
  const r = Number(real||0);
  if(r >= sem.greenMin && r <= sem.greenMax) return "VERDE";
  if(r >= sem.yellowMin && r <= sem.yellowMax) return "AMARILLO";
  return "ROJO";
}

function cssSemaforo(status){
  if(status==="VERDE") return "tag green";
  if(status==="AMARILLO") return "tag yellow";
  return "tag red";
}
// Agrupa Inventario PT por producto + lote
function getInventarioPTAgregado(){
  const db = getDB();
  const map = new Map();

  for (const item of (db.inventarioPT || [])) {
    const key = `${item.producto}||${item.lote}`;
    const prev = map.get(key) || { producto: item.producto, lote: item.lote, cantidad: 0 };
    prev.cantidad += Number(item.cantidad || 0);
    map.set(key, prev);
  }
  return Array.from(map.values()).filter(x => x.cantidad > 0);
}
function toast(msg){
  const t = document.createElement("div");
  t.style.position="fixed";
  t.style.right="16px";
  t.style.bottom="16px";
  t.style.zIndex="9999";
  t.style.background="rgba(15,23,42,.95)";
  t.style.border="1px solid rgba(255,255,255,.15)";
  t.style.padding="10px 14px";
  t.style.borderRadius="12px";
  t.style.boxShadow="0 10px 30px rgba(0,0,0,.35)";
  t.style.fontWeight="700";
  t.style.color="#fff";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 1800);
}