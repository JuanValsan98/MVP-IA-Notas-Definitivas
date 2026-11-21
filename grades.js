/**
 * Fase 4 - Generación dinámica de evaluaciones y validaciones en tiempo real.
 * Cubre RN-02 (nota 0.0-5.0) y validación de porcentajes/suma RN-03 parcial en UI.
 * No calcula definitiva ni guarda en IndexedDB (Fase 5).
 */
const Grades = (() => {
  const form = document.getElementById("gradesForm");
  const countInput = document.getElementById("gradeCountInput");
  const countError = document.getElementById("gradeCountError");
  const generateBtn = document.getElementById("generateGradesBtn");
  const container = document.getElementById("gradesContainer");
  const appMessage = document.getElementById("appMessage");
  const resultCard = document.getElementById("resultCard");
  const finalGradeValue = document.getElementById("finalGradeValue");
  const finalGradeStatus = document.getElementById("finalGradeStatus");

  function setAppMessage(text, type = "info") {
    appMessage.textContent = text;
    appMessage.classList.remove("is-hidden", "state-info", "state-success", "state-error", "state-warning");
    appMessage.classList.add(`state-${type}`);
  }

  function clearAppMessage() {
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

  function parseNumber(value) {
    // Acepta coma decimal por usabilidad local, pero calcula con punto.
    const normalized = String(value ?? "").trim().replace(",", ".");
    if (normalized === "") return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  }

  function formatDate(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function validateCount(rawValue) {
    const value = String(rawValue ?? "").trim();
    if (!value) {
      return { valid: false, message: "Indica la cantidad de evaluaciones." };
    }
    const count = Number(value);
    if (!Number.isInteger(count) || count < 1) {
      return { valid: false, message: "La cantidad debe ser un entero mayor o igual a 1." };
    }
    if (count > 20) {
      return { valid: false, message: "Máximo 20 evaluaciones para mantener la interfaz manejable." };
    }
    return { valid: true, count };
  }

  function validateGrade(value) {
    const number = parseNumber(value);
    if (number === null) return { valid: false, message: "La nota es obligatoria." };
    if (Number.isNaN(number)) return { valid: false, message: "La nota debe ser numérica." };
    if (number < 0 || number > 5) {
      return { valid: false, message: "La nota debe estar entre 0.0 y 5.0 (RN-02)." };
    }
    return { valid: true, value: number };
  }

  function validatePercentage(value) {
    const number = parseNumber(value);
    if (number === null) return { valid: false, message: "El porcentaje es obligatorio." };
    if (Number.isNaN(number)) return { valid: false, message: "El porcentaje debe ser numérico." };
    if (number <= 0 || number > 100) {
      return { valid: false, message: "El porcentaje debe ser mayor a 0 y máximo 100." };
    }
    return { valid: true, value: number };
  }

  function createGradeRow(index) {
    const rowNumber = index + 1;
    const article = document.createElement("article");
    article.className = "grade-row";
    article.dataset.index = String(index);

    article.innerHTML = `
      <h3 class="grade-row-title">Evaluación ${rowNumber}</h3>
      <div class="grade-row-grid">
        <div class="field">
          <label for="gradeValue-${index}">Nota</label>
          <input
            id="gradeValue-${index}"
            name="gradeValue-${index}"
            type="number"
            min="0"
            max="5"
            step="0.01"
            inputmode="decimal"
            aria-describedby="gradeValueHelp-${index} gradeValueError-${index}"
            required
          >
          <p id="gradeValueHelp-${index}" class="field-help">Rango permitido: 0.0 a 5.0.</p>
          <p id="gradeValueError-${index}" class="field-feedback is-hidden" aria-live="polite"></p>
        </div>
        <div class="field">
          <label for="gradePercent-${index}">Porcentaje (%)</label>
          <input
            id="gradePercent-${index}"
            name="gradePercent-${index}"
            type="number"
            min="0"
            max="100"
            step="0.01"
            inputmode="decimal"
            aria-describedby="gradePercentHelp-${index} gradePercentError-${index}"
            required
          >
          <p id="gradePercentHelp-${index}" class="field-help">La suma total debe ser 100%.</p>
          <p id="gradePercentError-${index}" class="field-feedback is-hidden" aria-live="polite"></p>
        </div>
      </div>
    `;

    return article;
  }

  function renderRows(count) {
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      fragment.appendChild(createGradeRow(i));
    }
    container.appendChild(fragment);
  }

  function getRowInputs(row) {
    const gradeInput = row.querySelector('input[name^="gradeValue-"]');
    const percentInput = row.querySelector('input[name^="gradePercent-"]');
    const gradeError = row.querySelector('[id^="gradeValueError-"]');
    const percentError = row.querySelector('[id^="gradePercentError-"]');
    return { gradeInput, percentInput, gradeError, percentError };
  }

  function validateRow(row) {
    const { gradeInput, percentInput, gradeError, percentError } = getRowInputs(row);
    const gradeResult = validateGrade(gradeInput.value);
    const percentResult = validatePercentage(percentInput.value);

    if (gradeResult.valid) clearFieldError(gradeInput, gradeError);
    else setFieldError(gradeInput, gradeError, gradeResult.message);

    if (percentResult.valid) clearFieldError(percentInput, percentError);
    else setFieldError(percentInput, percentError, percentResult.message);

    return {
      valid: gradeResult.valid && percentResult.valid,
      grade: gradeResult.value,
      porcentaje: percentResult.value,
    };
  }

  function getTotalPercentage() {
    const rows = container.querySelectorAll(".grade-row");
    let totalCents = 0;
    let hasInvalid = false;

    rows.forEach((row) => {
      const { percentInput } = getRowInputs(row);
      const result = validatePercentage(percentInput.value);
      if (result.valid) {
        // Suma en centésimas para reducir errores de coma flotante en RN-03.
        totalCents += Math.round(result.value * 100);
      } else {
        hasInvalid = true;
      }
    });

    return { total: totalCents / 100, hasInvalid, count: rows.length };
  }

  function collectEvaluaciones() {
    const rows = container.querySelectorAll(".grade-row");
    const evaluaciones = [];
    let allValid = true;

    rows.forEach((row) => {
      const result = validateRow(row);
      if (!result.valid) {
        allValid = false;
        return;
      }
      evaluaciones.push({ nota: result.grade, porcentaje: result.porcentaje });
    });

    return { allValid, evaluaciones };
  }

  function calculateDefinitiva(evaluaciones) {
    const total = evaluaciones.reduce(
      (acc, item) => acc + item.nota * (item.porcentaje / 100),
      0
    );
    // RN-04: redondeo a 2 decimales.
    return Math.round(total * 100) / 100;
  }

  function getEstado(definitiva) {
    return definitiva >= 3 ? "APROBADO" : "REPROBADO";
  }

  function showResult(definitiva, estado) {
    finalGradeValue.textContent = definitiva.toFixed(2);
    finalGradeStatus.textContent = `Estado: ${estado}`;
    resultCard.classList.remove("is-hidden", "result-approved", "result-failed");
    resultCard.classList.add(estado === "APROBADO" ? "result-approved" : "result-failed");
  }

  function hideResult() {
    finalGradeValue.textContent = "--";
    finalGradeStatus.textContent = "Estado: --";
    resultCard.classList.add("is-hidden");
    resultCard.classList.remove("result-approved", "result-failed");
  }

  function updatePercentageSummary() {
    const { total, hasInvalid, count } = getTotalPercentage();
    if (count === 0) return;

    if (hasInvalid) {
      setAppMessage("Corrige los porcentajes inválidos antes de continuar.", "warning");
      return;
    }

    if (total === 100) {
      setAppMessage(`Porcentajes válidos: la suma es ${total.toFixed(2)}%.`, "success");
      return;
    }

    setAppMessage(
      `La suma actual de porcentajes es ${total.toFixed(2)}%. Debe ser exactamente 100% (RN-03).`,
      "warning"
    );
  }

  function handleGenerate() {
    clearFieldError(countInput, countError);
    clearAppMessage();

    const validation = validateCount(countInput.value);
    if (!validation.valid) {
      setFieldError(countInput, countError, validation.message);
      setAppMessage(validation.message, "error");
      return;
    }

    renderRows(validation.count);
    setAppMessage("Campos generados. Ingresa notas y porcentajes.", "info");
  }

  function handleContainerInput(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const row = input.closest(".grade-row");
    if (!row) return;

    validateRow(row);
    updatePercentageSummary();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearAppMessage();
    hideResult();

    // FA-01 / sesión ausente: no se debe calcular sin estudiante identificado.
    const currentUser = window.Auth?.getCurrentUser?.();
    if (!currentUser?.documento) {
      setAppMessage("Debes iniciar sesión antes de calcular.", "error");
      return;
    }

    const rows = container.querySelectorAll(".grade-row");
    if (rows.length === 0) {
      setAppMessage("Primero genera los campos de evaluación.", "error");
      return;
    }

    const { allValid, evaluaciones } = collectEvaluaciones();
    const { total, hasInvalid } = getTotalPercentage();

    // FA-02: datos inválidos (rangos, vacíos, no numéricos).
    if (!allValid || hasInvalid) {
      setAppMessage("Corrige los campos inválidos: notas 0.0-5.0 y porcentajes válidos.", "error");
      return;
    }

    // FA-03: suma de porcentajes diferente de 100%.
    if (total !== 100) {
      setAppMessage(
        `No se puede calcular: la suma de porcentajes es ${total.toFixed(2)}% y debe ser 100% (RN-03).`,
        "error"
      );
      return;
    }

    const definitiva = calculateDefinitiva(evaluaciones);
    const estado = getEstado(definitiva);
    showResult(definitiva, estado);

    const calculo = {
      documento: currentUser.documento,
      evaluaciones,
      definitiva,
      estado,
      createdAt: new Date().toISOString(),
    };

    try {
      await window.DB.createCalculo(calculo);
      setAppMessage(`Cálculo guardado: definitiva ${definitiva.toFixed(2)} (${estado}).`, "success");
      await window.Grades.renderHistory?.(currentUser.documento);
    } catch (error) {
      console.error("Error guardando cálculo:", error);
      setAppMessage(
        "Se calculó la nota, pero no fue posible guardar el historial en IndexedDB.",
        "warning"
      );
    }
  }

  async function renderHistory(documento) {
    const tbody = document.getElementById("historyBody");
    const emptyState = document.getElementById("historyEmptyState");
    if (!tbody || !emptyState) return;

    tbody.innerHTML = "";

    try {
      const calculos = await window.DB.getCalculosByDocumento(documento);
      if (!calculos.length) {
        emptyState.classList.remove("is-hidden");
        return;
      }

      emptyState.classList.add("is-hidden");
      const fragment = document.createDocumentFragment();

      calculos.forEach((calculo) => {
        const tr = document.createElement("tr");
        const detalle = (calculo.evaluaciones || [])
          .map((ev, i) => `E${i + 1}: ${Number(ev.nota).toFixed(2)} (${Number(ev.porcentaje).toFixed(2)}%)`)
          .join(" | ");

        const estado = calculo.estado === "APROBADO" ? "APROBADO" : "REPROBADO";
        const estadoClass = estado === "APROBADO" ? "state-success" : "state-error";

        const tdFecha = document.createElement("td");
        tdFecha.textContent = formatDate(calculo.createdAt);

        const tdDefinitiva = document.createElement("td");
        tdDefinitiva.textContent = Number(calculo.definitiva).toFixed(2);

        const tdEstado = document.createElement("td");
        const estadoBadge = document.createElement("span");
        estadoBadge.className = `message ${estadoClass}`;
        estadoBadge.textContent = estado;
        tdEstado.appendChild(estadoBadge);

        const tdDetalle = document.createElement("td");
        tdDetalle.textContent = detalle;

        tr.append(tdFecha, tdDefinitiva, tdEstado, tdDetalle);
        fragment.appendChild(tr);
      });

      tbody.appendChild(fragment);
    } catch (error) {
      console.error("Error cargando historial:", error);
      emptyState.classList.remove("is-hidden");
      emptyState.innerHTML = "<p>No fue posible cargar el historial.</p>";
    }
  }

  function reset() {
    form.reset();
    container.innerHTML = "";
    clearFieldError(countInput, countError);
    hideResult();
    const tbody = document.getElementById("historyBody");
    const emptyState = document.getElementById("historyEmptyState");
    if (tbody) tbody.innerHTML = "";
    if (emptyState) {
      emptyState.classList.remove("is-hidden");
      emptyState.innerHTML = "<p>No hay cálculos registrados todavía.</p>";
    }
  }

  function init() {
    generateBtn.addEventListener("click", handleGenerate);
    container.addEventListener("input", handleContainerInput);
    form.addEventListener("submit", handleSubmit);
    countInput.addEventListener("input", () => {
      clearFieldError(countInput, countError);
    });
  }

  // API para app.js y fases posteriores.
  return {
    init,
    reset,
    validateRow,
    getTotalPercentage,
    renderHistory,
  };
})();

window.Grades = Grades;
