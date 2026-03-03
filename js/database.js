// js/database.js
var DB_KEY = window.DB_KEY || "LAS_PICONAS_ERP_V2";
window.DB_KEY = DB_KEY;
function initDatabase() {
  if (!localStorage.getItem(DB_KEY)) {
    const initialData = {
      usuarios: [{ usuario: "juan luis", clave: "22782522", rol: "ADMIN" }],

      clientes: [],
      vehiculos: [],

      // ✅ RECETAS del sistema (seed)
      recetas: (typeof RECETAS_SEED !== "undefined"
        ? RECETAS_SEED.map(r => ({
            ...r,
            system: true,
            locked: true,
            version: r.version || 1,
            createdAt: Date.now(),
            createdBy: "SYSTEM",
            categoria: r.categoria || "GENERAL",
            ingredientes: Array.isArray(r.ingredientes) ? r.ingredientes : [],
            // ✅ Procedimiento (por si viene en seed)
            procedimiento: (r.procedimiento || "").toString(),
            procedimientoSteps: Array.isArray(r.procedimientoSteps) ? r.procedimientoSteps : []
          }))
        : []
      ),

      // ✅ ROLES (con permiso de ver recetas)
      roles: [
        {
          nombre: "ADMIN",
          permisos: {
            usuarios: true,
            recetas_ver: true,
            recetas_editar: true,
            mp_editar: true,
            compras_mp: true,
            produccion: true,
            envios: true,
            exportar: true
          }
        },
        {
          nombre: "SUPERVISOR",
          permisos: {
            usuarios: false,
            recetas_ver: true,
            recetas_editar: true,
            mp_editar: false,
            compras_mp: false,
            produccion: true,
            envios: true,
            exportar: true
          }
        },
        {
          nombre: "OPERADOR",
          permisos: {
            usuarios: false,
            recetas_ver: true,      // 👈 SOLO VER
            recetas_editar: false,  // 👈 NO EDITAR
            mp_editar: false,
            compras_mp: false,
            produccion: true,
            envios: true,
            exportar: false
          }
        }
      ],
      // Legacy (puedes mantenerlo por compatibilidad)
      inventarioMP: [],

      inventarioPT: [],
      producciones: [],
      lotes: [],
      envios: [],
      ventas: [],

      // NUEVO: MP + compras + logs
      materiasPrimas: [],
      comprasMP: [],
      ajustesMP: [],
      variacionesRend: [],

      // NUEVO: categorías
      categorias: { mp: ["GENERAL"], recetas: ["GENERAL"] },

      configuracion: { correlativos: {} }
    };

    localStorage.setItem(DB_KEY, JSON.stringify(initialData));
  } else {
    
    // Migración suave: agrega llaves faltantes sin borrar datos
    const db = getDB();

    db.usuarios = db.usuarios || [{ usuario: "juan luis", clave: "22782522", rol: "ADMIN" }];
    db.clientes = db.clientes || [];
    db.vehiculos = db.vehiculos || [];
    db.recetas = db.recetas || [];

    db.inventarioMP = db.inventarioMP || []; // legacy
    db.inventarioPT = db.inventarioPT || [];
    db.producciones = db.producciones || [];
    db.lotes = db.lotes || [];
    db.envios = db.envios || [];
    db.ventas = db.ventas || [];

    db.materiasPrimas = db.materiasPrimas || [];
    db.comprasMP = db.comprasMP || [];
    db.ajustesMP = db.ajustesMP || [];
    db.variacionesRend = db.variacionesRend || [];

    db.categorias = db.categorias || { mp: ["GENERAL"], recetas: ["GENERAL"] };
    db.categorias.mp = db.categorias.mp || ["GENERAL"];
    db.categorias.recetas = db.categorias.recetas || ["GENERAL"];

    db.configuracion = db.configuracion || { correlativos: {} };
    db.configuracion.correlativos = db.configuracion.correlativos || {};
    db.roles = db.roles || [
  { nombre:"ADMIN", permisos:{ usuarios:true, recetas_editar:true, mp_editar:true, compras_mp:true, produccion:true, envios:true, exportar:true } },
  { nombre:"SUPERVISOR", permisos:{ usuarios:false, recetas_editar:true, mp_editar:false, compras_mp:false, produccion:true, envios:true, exportar:true } },
  { nombre:"OPERADOR", permisos:{ usuarios:false, recetas_editar:false, mp_editar:false, compras_mp:false, produccion:true, envios:true, exportar:false } },
];
// ✅ Sembrar recetas oficiales si faltan (NO borra recetas existentes)
if (typeof RECETAS_SEED !== "undefined") {
  const byId = new Map((db.recetas || []).filter(r => r && r.id).map(r => [r.id, r]));
  for (const seed of RECETAS_SEED) {
    if (!byId.has(seed.id)) {
      db.recetas.push({
        ...seed,
        system: true,
        locked: true,
        version: seed.version || 1,
        createdAt: Date.now(),
        createdBy: "SYSTEM",
        categoria: seed.categoria || "GENERAL",
        ingredientes: Array.isArray(seed.ingredientes) ? seed.ingredientes : []
      });
    }
  }
}

// ✅ Asegurar bloqueo de recetas system
for (const r of db.recetas) {
  if (r && r.system === true) r.locked = true;
  if (r && !r.version) r.version = 1;
  if (r && !Array.isArray(r.ingredientes)) r.ingredientes = [];
}
    // Normalizar materias primas (unidad base + conversiones)
    for (const mp of db.materiasPrimas) {
      if (!mp.baseUnit) mp.baseUnit = mp.unidadBase || mp.unidad || "g";
      if (!mp.units) mp.units = { [mp.baseUnit]: 1 };
      if (mp.units[mp.baseUnit] == null) mp.units[mp.baseUnit] = 1;

      if (mp.stockBase == null) mp.stockBase = Number(mp.stockBase ?? mp.stock ?? 0) || 0;
      if (mp.stockMinBase == null) mp.stockMinBase = Number(mp.stockMinBase ?? mp.stockMin ?? 0) || 0;
      if (mp.costoPromBase == null) mp.costoPromBase = Number(mp.costoPromBase ?? 0) || 0;

      if (!mp.categoria) mp.categoria = "GENERAL";
    }

    // Normalizar recetas (estructura nueva)
    for (const r of db.recetas) {
      if (!r.productoFinal) r.productoFinal = r.nombre || "Producto";
      if (!r.unidadRend) r.unidadRend = "und";
      if (!Array.isArray(r.ingredientes)) r.ingredientes = [];
      if (!r.semaforo) r.semaforo = { greenMin: 0, greenMax: 999999, yellowMin: 0, yellowMax: 999999 };
      if (r.categoria == null) r.categoria = "GENERAL";
      if (r.rendimientoEsperado == null && r.rendimiento != null) r.rendimientoEsperado = Number(r.rendimiento || 0);
    }

    saveDB(db);
    autoBackupDB();
  }
}

function getDB() {
  return JSON.parse(localStorage.getItem(DB_KEY));
}

function saveDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function yyyymmdd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function generarCorrelativo(prefijo) {
  const db = getDB();
  const hoy = yyyymmdd(new Date());
  const key = `${prefijo}${hoy}`;

  if (!db.configuracion) db.configuracion = { correlativos: {} };
  if (!db.configuracion.correlativos) db.configuracion.correlativos = {};

  if (!db.configuracion.correlativos[key]) db.configuracion.correlativos[key] = 1;
  else db.configuracion.correlativos[key]++;

  saveDB(db);
  autoBackupDB();
  return `${prefijo}-${hoy}-${String(db.configuracion.correlativos[key]).padStart(3, "0")}`;
}
function exportBackupDB(){
  const db = getDB();
  const stamp = new Date().toISOString().slice(0,10);
  const name = `marck_backup_${stamp}.json`;
  const blob = new Blob([JSON.stringify(db, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
}

function importBackupDB(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = () => {
      try{
        const raw = JSON.parse(String(r.result || "{}"));
        if(!raw || typeof raw !== "object") throw new Error("Backup inválido.");

        // Compatibilidad con ambos formatos:
        // 1) Backup puro (DB directo)
        // 2) Backup con meta + keys (File System Access)
        let db = raw;

        if (raw.keys && typeof raw.keys === "object" && raw.keys[DB_KEY]) {
          db = raw.keys[DB_KEY];
        }

        if(!db || typeof db !== "object") {
          throw new Error("Backup inválido (sin DB real).");
        }

        // Asegurar estructuras mínimas
        db.usuarios = db.usuarios || [];
        db.clientes = db.clientes || [];
        db.recetas = db.recetas || [];
        db.materiasPrimas = db.materiasPrimas || [];
        db.producciones = db.producciones || [];
        db.inventarioPT = db.inventarioPT || [];

        saveDB(db);

        resolve(db);

        // Recargar para refrescar todo
        setTimeout(()=>location.reload(), 100);

      }catch(e){
        reject(e);
      }
    };
    r.onerror = () => reject(new Error("No se pudo leer el archivo."));
    r.readAsText(file);
  });
}

// Backup automático rotativo (últimos 14)
function autoBackupDB(){
  try{
    const db = getDB();
    const key = "MB_BACKUP_" + yyyymmdd(new Date());
    localStorage.setItem(key, JSON.stringify(db));

    // limpia backups antiguos (deja 14)
    const keys = Object.keys(localStorage).filter(k=>k.startsWith("MB_BACKUP_")).sort();
    while(keys.length > 14){
      const old = keys.shift();
      localStorage.removeItem(old);
    }
  }catch(e){
    console.warn("Auto-backup falló:", e);
  }
}