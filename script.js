document.addEventListener("DOMContentLoaded", () => {
  const welcome = document.getElementById("welcomeScreen");
  const startBtn = document.getElementById("startSurveyBtn");
  const form = document.getElementById("surveyForm");
  const thankYou = document.getElementById("thankYouScreen");
  const progressShell = document.getElementById("progressShell");

  const steps = Array.from(document.querySelectorAll(".step"));
  const progSteps = Array.from(document.querySelectorAll(".prog-step"));
  const progressFill = document.getElementById("progressFill");
  const progressLabel = document.getElementById("progressLabel");
  const stepCounter = document.getElementById("stepCounter");
  const submitBtn = document.getElementById("submitBtn");

  const totalSteps = steps.length;
  let currentStep = 1;

  // Asignar action a Apps Script
  if (typeof SCRIPT_URL === "string" && SCRIPT_URL.startsWith("http")) {
    form.action = SCRIPT_URL;
  }

  // ------------ Utilidades generales ------------

  function getSelectedTipoEmpresa() {
    const checked = document.querySelector('input[name="tipo_empresa"]:checked');
    return checked ? checked.value : null;
  }

  function clearErrors(stepEl) {
    stepEl.querySelectorAll(".error-msg").forEach(el => el.remove());
    stepEl.querySelectorAll(".question.error").forEach(q => q.classList.remove("error"));
    const globalErr = stepEl.querySelector(".error-global");
    if (globalErr) globalErr.textContent = "";
  }

  function addError(questionEl, msg) {
    questionEl.classList.add("error");
    let err = questionEl.querySelector(".error-msg");
    if (!err) {
      err = document.createElement("div");
      err.className = "error-msg";
      questionEl.appendChild(err);
    }
    err.textContent = msg;
  }

  function clearInputs(block) {
    if (!block) return;
    const fields = block.querySelectorAll("input, select, textarea");
    fields.forEach(el => {
      if (el.type === "radio" || el.type === "checkbox") {
        el.checked = false;
      } else if (el.tagName.toLowerCase() === "select") {
        el.selectedIndex = 0;
      } else {
        el.value = "";
      }
    });
  }

  // ------------ Navegación ------------

  function updateUI() {
    steps.forEach(step => {
      const stepIndex = Number(step.dataset.step);
      step.classList.toggle("hidden", stepIndex !== currentStep);
    });

    progSteps.forEach(chip => {
      const idx = Number(chip.dataset.stepChip);
      chip.classList.toggle("active", idx === currentStep);
    });

    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressFill.style.width = progress + "%";

    const labels = {
      1: "Conceptos clave",
      2: "Caracterización",
      3: "Estrategia CI",
      4: "Conocimiento MMC",
      5: "Beneficios y barreras",
      6: "Proyección",
      7: "Privacidad"
    };
    progressLabel.textContent = labels[currentStep] || "";
    stepCounter.textContent = `Paso ${currentStep} de ${totalSteps}`;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep(nextStep) {
    currentStep = nextStep;
    updateUI();
  }

  function goNext() {
    if (currentStep < totalSteps) {
      if (!validateStep(currentStep)) return;
      goToStep(currentStep + 1);
    }
  }

  function goPrev() {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  }

  // ------------ Validación ------------

  function validateStep(stepNumber) {
    const stepEl = steps.find(s => Number(s.dataset.step) === stepNumber);
    if (!stepEl) return true;

    clearErrors(stepEl);
    let isValid = true;

    // Solo considerar preguntas visibles (no .hidden) que tengan algún [required]
    const requiredQuestions = Array.from(stepEl.querySelectorAll(".question"))
      .filter(q => !q.classList.contains("hidden") && q.querySelector("[required]"));

    requiredQuestions.forEach(question => {
      const requiredInputs = Array.from(question.querySelectorAll("[required]"));
      const namesChecked = new Set();

      for (const input of requiredInputs) {
        const name = input.name;
        if (namesChecked.has(name)) continue;
        namesChecked.add(name);

        if (input.type === "radio" || input.type === "checkbox") {
          const group = stepEl.querySelectorAll(`input[name="${CSS.escape(name)}"]`);
          const anyChecked = Array.from(group).some(el => el.checked);
          if (!anyChecked) {
            isValid = false;
            addError(question, "Debe responder esta pregunta para continuar.");
            break;
          }
        } else {
          if (!input.value.trim()) {
            isValid = false;
            addError(question, "Debe responder esta pregunta para continuar.");
            break;
          }
        }
      }
    });

    // Regla especial para la pregunta 18b en proveedores
    if (isValid && stepNumber === 6) {
      const tipo = getSelectedTipoEmpresa();
      if (tipo === "Proveedor de soluciones industrializadas") {
        const q18b = document.getElementById("q18b_proveedor");
        if (q18b && !q18b.classList.contains("hidden")) {
          const radios = q18b.querySelectorAll('input[name="proyeccion_nivel_industrializacion_proveedor"]');
          const anyChecked = Array.from(radios).some(r => r.checked);
          if (!anyChecked) {
            isValid = false;
            addError(q18b, "Debe responder esta pregunta para continuar.");
          }
        }
      }
    }

    if (!isValid) {
      const globalErr = stepEl.querySelector(".error-global");
      if (globalErr) {
        globalErr.textContent = "Por favor complete las preguntas obligatorias antes de continuar.";
      }
    }

    return isValid;
  }

  // Limitar máximo de 3 checkboxes en grupos con data-max="3"
  document.querySelectorAll('.options-group[data-max="3"]').forEach(group => {
    const max = Number(group.getAttribute("data-max")) || 3;
    group.addEventListener("change", e => {
      if (e.target.type === "checkbox") {
        const checked = group.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length > max) {
          e.target.checked = false;
          alert(`Solo puede seleccionar hasta ${max} opciones en esta pregunta.`);
        }
      }
    });
  });

  // ------------ Lógica condicional 11.1 / 11.2 / 11.3 ------------

  const q11_1 = document.getElementById("q11_1");
  const q11_2 = document.getElementById("q11_2");
  const q11_3 = document.getElementById("q11_3");
  const abordajeRadios = document.querySelectorAll('input[name="abordaje_mmc"]');

  function resetConditionalBlock(block) {
    if (!block) return;
    block.querySelectorAll("input[type=checkbox]").forEach(ch => (ch.checked = false));
    block.querySelectorAll("input[type=text]").forEach(t => (t.value = ""));
  }

  function handleAbordajeChange(value) {
    const valIncorpora = "Se evaluó y se incorporaron MMC con éxito en uno o más proyectos.";
    const valNoIncorpora1 = "Se evaluó, pero finalmente no se incorporaron MMC.";
    const valNoIncorpora2 = "No se incorporaron MMC, pero existe un plan para evaluarlos e implementarlos a corto/mediano plazo.";
    const valNoIncorpora3 = "No se incorporaron MMC y no existe plan para evaluarlos o implementarlos.";
    const valNoAplicaProveedor = "No aplica, somos proveedores de soluciones MMC";

    if (value === valIncorpora) {
      if (q11_1) q11_1.classList.remove("hidden");
      if (q11_2) {
        q11_2.classList.add("hidden");
        resetConditionalBlock(q11_2);
      }
      if (q11_3) {
        q11_3.classList.add("hidden");
        resetConditionalBlock(q11_3);
      }
    } else if (
      value === valNoIncorpora1 ||
      value === valNoIncorpora2 ||
      value === valNoIncorpora3
    ) {
      if (q11_2) q11_2.classList.remove("hidden");
      if (q11_1) {
        q11_1.classList.add("hidden");
        resetConditionalBlock(q11_1);
      }
      if (q11_3) {
        q11_3.classList.add("hidden");
        resetConditionalBlock(q11_3);
      }
    } else if (value === valNoAplicaProveedor) {
      if (q11_1) {
        q11_1.classList.add("hidden");
        resetConditionalBlock(q11_1);
      }
      if (q11_2) {
        q11_2.classList.add("hidden");
        resetConditionalBlock(q11_2);
      }
      if (q11_3) q11_3.classList.remove("hidden");
    } else {
      if (q11_1) {
        q11_1.classList.add("hidden");
        resetConditionalBlock(q11_1);
      }
      if (q11_2) {
        q11_2.classList.add("hidden");
        resetConditionalBlock(q11_2);
      }
      if (q11_3) {
        q11_3.classList.add("hidden");
        resetConditionalBlock(q11_3);
      }
    }
  }

  abordajeRadios.forEach(r => {
    r.addEventListener("change", e => handleAbordajeChange(e.target.value));
  });

  // ------------ Lógica condicional por tipo de empresa (12 / 12b y 18 / 18b) ------------

  const tipoEmpresaRadios = document.querySelectorAll('input[name="tipo_empresa"]');
  const q12Principal = document.getElementById("q12_principal");
  const q12b = document.getElementById("q12b");
  const q18Principal = document.getElementById("q18_principal");
  const q18bProveedor = document.getElementById("q18b_proveedor");

  function applyTipoEmpresaMode(tipoValue) {
    const isProveedor = tipoValue === "Proveedor de soluciones industrializadas";

    // 12 vs 12b
    if (q12Principal && q12b) {
      if (isProveedor) {
        q12Principal.classList.add("hidden");
        clearInputs(q12Principal);
        q12b.classList.remove("hidden");
      } else {
        q12Principal.classList.remove("hidden");
        q12b.classList.add("hidden");
        clearInputs(q12b);
      }
    }

    // 18 vs 18b
    if (q18Principal && q18bProveedor) {
      if (isProveedor) {
        q18Principal.classList.add("hidden");
        clearInputs(q18Principal);
        q18bProveedor.classList.remove("hidden");
      } else {
        q18Principal.classList.remove("hidden");
        q18bProveedor.classList.add("hidden");
        clearInputs(q18bProveedor);
      }
    }
  }

  tipoEmpresaRadios.forEach(radio => {
    radio.addEventListener("change", e => {
      applyTipoEmpresaMode(e.target.value);
    });
  });

  // Aplicar modo inicial por si ya se escogió el tipo antes de llegar a secciones 4 o 6
  applyTipoEmpresaMode(getSelectedTipoEmpresa());

  // ------------ Eventos de navegación ------------

  document.querySelectorAll("[data-next]").forEach(btn => {
    btn.addEventListener("click", () => goNext());
  });

  document.querySelectorAll("[data-prev]").forEach(btn => {
    btn.addEventListener("click", () => goPrev());
  });

  // ------------ Bienvenida ------------

  startBtn.addEventListener("click", () => {
    welcome.classList.add("hidden");
    form.classList.remove("hidden");
    progressShell.classList.remove("hidden");
    currentStep = 1;
    updateUI();
  });

  // ------------ Envío ------------

  form.addEventListener("submit", e => {
    // Validar última sección antes de enviar
    if (!validateStep(currentStep)) {
      e.preventDefault();
      return;
    }

    const finalErr = document.getElementById("finalError");
    if (finalErr) finalErr.textContent = "";

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    // Dejamos que el form se envíe al iframe y luego simulamos confirmación
    setTimeout(() => {
      form.classList.add("hidden");
      progressShell.classList.add("hidden");
      thankYou.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar respuestas";
      form.reset();
    }, 1500);
  });

  // Estado inicial: solo bienvenida
  steps.forEach(step => step.classList.add("hidden"));
  thankYou.classList.add("hidden");
});
