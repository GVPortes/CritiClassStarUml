const COMMAND_ID = "criticlass:generate-metrics";
const COMMAND_LABEL = "Gerar métricas (CK + L&K)";

function isUMLClass(element) {
  if (!element) {
    return false;
  }
  if (typeof type !== "undefined" && type.UMLClass) {
    return element instanceof type.UMLClass;
  }
  return Boolean(element.constructor && element.constructor.name === "UMLClass");
}

function collectClasses(rootElement) {
  const classes = [];
  const visitedIds = new Set();

  function traverse(element) {
    if (!element || typeof element !== "object") {
      return;
    }

    const elementId = element._id;
    if (elementId && visitedIds.has(elementId)) {
      return;
    }
    if (elementId) {
      visitedIds.add(elementId);
    }

    if (isUMLClass(element)) {
      classes.push(element);
    }

    if (Array.isArray(element.ownedElements)) {
      element.ownedElements.forEach(traverse);
    }
  }

  traverse(rootElement);
  return classes;
}

function handleGenerateMetrics() {
  const project = app.project.getProject();
  if (!project) {
    console.warn("[CritiClass] Nenhum projeto aberto.");
    return;
  }

  const classes = collectClasses(project);
  console.log(`[CritiClass] Projeto: "${project.name || "(sem nome)"}" | Classes encontradas: ${classes.length}`);

  classes.forEach((cls) => {
    const className = cls.name || "(sem nome)";
    const attributesCount = Array.isArray(cls.attributes) ? cls.attributes.length : "preciso confirmar propriedade";
    const operationsCount = Array.isArray(cls.operations) ? cls.operations.length : "preciso confirmar propriedade";

    console.log(
      `[CritiClass] Classe: ${className} | Atributos: ${attributesCount} | Operações: ${operationsCount}`
    );
  });

  if (classes.length > 0) {
    console.log("[CritiClass] Chaves da primeira UMLClass (para confirmação da API):", Object.keys(classes[0]));
  }
}

function init() {
  app.commands.register(COMMAND_ID, handleGenerateMetrics, COMMAND_LABEL);
}

exports.init = init;