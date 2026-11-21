/**
 * Fase 3 - Autenticación por documento y sesión en memoria.
 * Cumple RN-01: acceso solo por documento; si no existe, se registra.
 * La sesión activa NO se persiste en IndexedDB/sessionStorage/localStorage.
 */
const Auth = (() => {
  // Estado de sesión en memoria: se pierde al recargar (comportamiento esperado).
  let currentUser = null;

  function getCurrentUser() {
    return currentUser;
  }

  function isAuthenticated() {
    return currentUser !== null;
  }

  function clearSession() {
    currentUser = null;
  }

  /**
   * Valida formato básico de documento.
   * Se normaliza como string para conservar ceros y evitar problemas numéricos.
   */
  function normalizeDocumento(value) {
    return String(value ?? "").trim();
  }

  function validateDocumento(documento) {
    if (!documento) {
      return { valid: false, message: "El número de documento es obligatorio." };
    }

    // Solo dígitos; permite documentos de longitud variable según contexto real.
    if (!/^\d+$/.test(documento)) {
      return {
        valid: false,
        message: "El documento debe contener solo números.",
      };
    }

    if (documento.length < 5) {
      return {
        valid: false,
        message: "El documento debe tener al menos 5 dígitos.",
      };
    }

    return { valid: true, message: "" };
  }

  /**
   * Flujo RN-01: busca usuario; si no existe, lo crea automáticamente.
   * Retorna información útil para que la UI muestre si fue registro o ingreso.
   */
  async function loginWithDocumento(rawDocumento) {
    const documento = normalizeDocumento(rawDocumento);
    const validation = validateDocumento(documento);

    if (!validation.valid) {
      const error = new Error(validation.message);
      error.code = "VALIDATION_ERROR";
      throw error;
    }

    let usuario = await window.DB.getUsuarioByDocumento(documento);
    let isNewUser = false;

    if (!usuario) {
      usuario = {
        documento,
        createdAt: new Date().toISOString(),
      };
      await window.DB.createUsuario(usuario);
      isNewUser = true;
    }

    // Sesión activa solo en memoria.
    currentUser = { documento: usuario.documento };
    return { user: currentUser, isNewUser };
  }

  return {
    getCurrentUser,
    isAuthenticated,
    clearSession,
    normalizeDocumento,
    validateDocumento,
    loginWithDocumento,
  };
})();

window.Auth = Auth;
