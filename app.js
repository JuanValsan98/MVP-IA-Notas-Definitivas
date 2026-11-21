/**
 * Fase 3 - Orquestación mínima de UI para acceso y sesión.
 * No implementa generación/cálculo de notas (Fase 4-5).
 */
(() => {
  const loginSection = document.getElementById("loginSection");
  const calculatorSection = document.getElementById("calculatorSection");
  const historySection = document.getElementById("historySection");
  const sessionInfo = document.getElementById("sessionInfo");
  const sessionDocument = document.getElementById("sessionDocument");
  const appMessage = document.getElementById("appMessage");

  const loginForm = document.getElementById("loginForm");
  const documentInput = document.getElementById("documentInput");
  const documentError = document.getElementById("documentError");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  function setMessage(text, type = "info") {
    appMessage.textContent = text;
    appMessage.classList.remove("is-hidden", "state-info", "state-success", "state-error", "state-warning");
    appMessage.classList.add(`state-${type}`);
  }

  function clearMessage() {
    appMessage.textContent = "";
    appMessage.classList.add("is-hidden");
    appMessage.classList.remove("state-info", "state-success", "state-error", "state-warning");
  }

  function setFieldError(input, feedbackEl, message) {
    const field = input.closest(".field");
    field.classList.add("field-invalid");
    feedbackEl.textContent = message;
    feedbackEl.classList.remove("is-hidden");
  }

  function clearFieldError(input, feedbackEl) {
    const field = input.closest(".field");
    field.classList.remove("field-invalid");
    feedbackEl.textContent = "";
    feedbackEl.classList.add("is-hidden");
  }

  function renderSessionUI() {
    const user = window.Auth.getCurrentUser();

    if (!user) {
      loginSection.classList.remove("is-hidden");
      calculatorSection.classList.add("is-hidden");
      historySection.classList.add("is-hidden");
      sessionInfo.classList.add("is-hidden");
      sessionDocument.textContent = "";
      return;
    }

    // Sesión activa: mostrar contexto y habilitar áreas protegidas.
    loginSection.classList.add("is-hidden");
    calculatorSection.classList.remove("is-hidden");
    historySection.classList.remove("is-hidden");
    sessionInfo.classList.remove("is-hidden");
    sessionDocument.textContent = `Documento: ${user.documento}`;
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    clearMessage();
    clearFieldError(documentInput, documentError);

    const documento = window.Auth.normalizeDocumento(documentInput.value);
    const validation = window.Auth.validateDocumento(documento);

    if (!validation.valid) {
      setFieldError(documentInput, documentError, validation.message);
      setMessage(validation.message, "error");
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Ingresando...";

    try {
      const { user, isNewUser } = await window.Auth.loginWithDocumento(documento);
      loginForm.reset();
      renderSessionUI();
      if (window.Grades && typeof window.Grades.renderHistory === "function") {
        await window.Grades.renderHistory(user.documento);
      }
      setMessage(
        isNewUser
          ? "Usuario registrado e ingresado correctamente."
          : "Ingreso exitoso.",
        "success"
      );
    } catch (error) {
      // Errores de validación o IndexedDB se muestran sin exponer detalles internos sensibles.
      const message = error.code === "VALIDATION_ERROR"
        ? error.message
        : "No fue posible ingresar. Verifica el navegador e intenta nuevamente.";
      setFieldError(documentInput, documentError, message);
      setMessage(message, "error");
      console.error("Error en login:", error);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Ingresar";
    }
  }

  function handleLogout() {
    window.Auth.clearSession();
    clearFieldError(documentInput, documentError);
    loginForm.reset();
    if (window.Grades && typeof window.Grades.reset === "function") {
      window.Grades.reset();
    }
    renderSessionUI();
    setMessage("Sesión cerrada.", "info");
  }

  function init() {
    // Estado inicial: sin sesión en memoria tras carga.
    renderSessionUI();
    loginForm.addEventListener("submit", handleLoginSubmit);
    logoutBtn.addEventListener("click", handleLogout);

    if (window.Grades && typeof window.Grades.init === "function") {
      window.Grades.init();
    }

    // Limpia error del campo mientras el usuario corrige.
    documentInput.addEventListener("input", () => {
      clearFieldError(documentInput, documentError);
      if (!appMessage.classList.contains("is-hidden")) clearMessage();
    });
  }

  init();
})();
