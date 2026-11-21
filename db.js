/**
 * Fase 2 - Capa de datos IndexedDB.
 * Responsabilidad: abrir DB, crear esquema y exponer CRUD asíncrono.
 * No toca DOM ni lógica de negocio de cálculo.
 */
const DB_NAME = "NotasDefinitivasDB";
const DB_VERSION = 1;
const STORE_USUARIOS = "usuarios";
const STORE_CALCULOS = "calculos";

/**
 * Abre la base de datos y ejecuta migraciones en onupgradeneeded.
 * Se reutiliza para todas las operaciones CRUD.
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Usuarios: keyPath por documento (RN-01). No se guarda contraseña.
      if (!db.objectStoreNames.contains(STORE_USUARIOS)) {
        const usuariosStore = db.createObjectStore(STORE_USUARIOS, {
          keyPath: "documento",
        });
        // Índice para consultas por fecha de registro si se requieren reportes.
        usuariosStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Cálculos: id autoincremental; índice por documento para historial del estudiante.
      if (!db.objectStoreNames.contains(STORE_CALCULOS)) {
        const calculosStore = db.createObjectStore(STORE_CALCULOS, {
          keyPath: "id",
          autoIncrement: true,
        });
        calculosStore.createIndex("documento", "documento", { unique: false });
        calculosStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error(`Error abriendo IndexedDB: ${request.error?.message}`));
  });
}

/**
 * Helper genérico para ejecutar una operación en una transacción.
 * Cierra la conexión al finalizar para evitar fugas de recursos.
 */
async function withStore(storeName, mode, operation) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    // La operación recibe el store y debe retornar un IDBRequest.
    let request;
    try {
      request = operation(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error(`Error en operación IndexedDB: ${request.error?.message}`));

    // Cierre seguro tras completar/abortar la transacción.
    transaction.oncomplete = () => db.close();
    transaction.onabort = () =>
      reject(new Error(`Transacción abortada: ${transaction.error?.message}`));
    transaction.onerror = () =>
      reject(new Error(`Error de transacción: ${transaction.error?.message}`));
  });
}

/* =========================
   CRUD Usuarios
   ========================= */

async function createUsuario(usuario) {
  // usuario esperado: { documento: string, createdAt: string ISO }
  return withStore(STORE_USUARIOS, "readwrite", (store) => store.add(usuario));
}

async function getUsuarioByDocumento(documento) {
  return withStore(STORE_USUARIOS, "readonly", (store) => store.get(documento));
}

async function getAllUsuarios() {
  return withStore(STORE_USUARIOS, "readonly", (store) => store.getAll());
}

/* =========================
   CRUD Cálculos
   ========================= */

async function createCalculo(calculo) {
  /*
    calculo esperado:
    {
      documento: string,
      evaluaciones: [{ nota: number, porcentaje: number }],
      definitiva: number, // redondeada a 2 decimales
      estado: "APROBADO" | "REPROBADO",
      createdAt: string ISO
    }
  */
  return withStore(STORE_CALCULOS, "readwrite", (store) => store.add(calculo));
}

async function getCalculosByDocumento(documento) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CALCULOS, "readonly");
    const store = transaction.objectStore(STORE_CALCULOS);
    const index = store.index("documento");
    const request = index.getAll(documento);

    request.onsuccess = () => {
      // Orden descendente por fecha para mostrar el más reciente primero.
      const resultados = (request.result || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      resolve(resultados);
    };

    request.onerror = () =>
      reject(new Error(`Error consultando cálculos: ${request.error?.message}`));

    transaction.oncomplete = () => db.close();
    transaction.onabort = () =>
      reject(new Error(`Transacción abortada: ${transaction.error?.message}`));
  });
}

async function getAllCalculos() {
  return withStore(STORE_CALCULOS, "readonly", (store) => store.getAll());
}

async function deleteCalculo(id) {
  return withStore(STORE_CALCULOS, "readwrite", (store) => store.delete(id));
}

/*
  Exportación global simple para Vanilla JS sin módulos/bundlers.
  Fases siguientes consumirán window.DB.*.
*/
window.DB = {
  openDatabase,
  createUsuario,
  getUsuarioByDocumento,
  getAllUsuarios,
  createCalculo,
  getCalculosByDocumento,
  getAllCalculos,
  deleteCalculo,
  STORE_USUARIOS,
  STORE_CALCULOS,
};
