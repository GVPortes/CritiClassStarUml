const { readModel } = require("./src/modelReader");
const {
  collectAllMetrics,
  exportToXlsxBuffer,
  exportToCsvString,
  sanitizeFileName,
  triggerBrowserDownload
} = require("./src/exporter");
const {
  DEFAULT_METRIC_WEIGHTS,
  resolveWeights,
  prioritizeClasses
} = require("./src/metrics/prioritizer");
const { NUMERIC_METRIC_KEYS } = require("./src/metrics/normalizer");

const COMMAND_GENERATE_XLSX = "criticlass:generate-metrics";
const LABEL_GENERATE_XLSX = "Gerar métricas (CK + L&K)";

const COMMAND_EXPORT_CSV = "criticlass:export-csv";
const LABEL_EXPORT_CSV = "Exportar métricas (.csv)";

const COMMAND_CONFIGURE_WEIGHTS = "criticlass:configure-weights";
const LABEL_CONFIGURE_WEIGHTS = "Configurar pesos das métricas...";

const COMMAND_RESET_WEIGHTS = "criticlass:reset-weights";
const LABEL_RESET_WEIGHTS = "Restaurar pesos padrão (1.0)";

const STORAGE_KEY_WEIGHTS = "criticlass.metricWeights";

let activeWeights = { ...DEFAULT_METRIC_WEIGHTS };

function loadSavedWeights() {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY_WEIGHTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        activeWeights = resolveWeights(parsed);
      }
    }
  } catch (_) {
    activeWeights = { ...DEFAULT_METRIC_WEIGHTS };
  }
  return activeWeights;
}

function saveWeights(weights) {
  activeWeights = resolveWeights(weights);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_WEIGHTS, JSON.stringify(activeWeights));
    }
  } catch (_) {
    // Ignore storage errors in restricted environments
  }
  return activeWeights;
}

function formatWeightsString(weights = activeWeights) {
  return NUMERIC_METRIC_KEYS.map((key) => `${key}=${weights[key] ?? 1}`).join(", ");
}

function parseWeightsInput(inputText, baseWeights = activeWeights) {
  if (!inputText || typeof inputText !== "string") {
    return resolveWeights(baseWeights);
  }

  const trimmed = inputText.trim();
  if (!trimmed) {
    return resolveWeights(baseWeights);
  }

  if (trimmed.startsWith("{")) {
    try {
      return resolveWeights({ ...baseWeights, ...JSON.parse(trimmed) });
    } catch (_) {
      // Fallback to key=value parser below
    }
  }

  const updated = { ...baseWeights };
  const pairs = trimmed.split(/[,;\n]+/);
  pairs.forEach((pair) => {
    const [rawKey, rawVal] = pair.split(/[:=]/);
    if (!rawKey || rawVal === undefined) {
      return;
    }
    const cleanKey = rawKey.trim().toUpperCase();
    const matchedKey = NUMERIC_METRIC_KEYS.find((k) => k.toUpperCase() === cleanKey);
    const numVal = Number(rawVal.trim());
    if (matchedKey && Number.isFinite(numVal) && numVal >= 0) {
      updated[matchedKey] = numVal;
    }
  });

  return resolveWeights(updated);
}

function showMessageDialog(message) {
  if (typeof app !== "undefined" && app.dialogs && typeof app.dialogs.showInfoDialog === "function") {
    app.dialogs.showInfoDialog(message);
    return;
  }
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message);
  }
}

function formatCriticalClassesSummary(prioritization) {
  if (!prioritization || !Array.isArray(prioritization.criticalClasses) || prioritization.criticalClasses.length === 0) {
    return "Nenhuma";
  }
  return prioritization.criticalClasses
    .map((cls) => `${cls.rank}º ${cls.name} (Score: ${cls.score})`)
    .join("\n  • ");
}

function runMetricsExport(format = "xlsx") {
  const project = typeof app !== "undefined" && app.project ? app.project.getProject() : null;
  if (!project) {
    console.warn("[CritiClass] Nenhum projeto aberto.");
    showMessageDialog("Nenhum projeto aberto no StarUML.");
    return;
  }

  const modelData = readModel(project);
  const { projectName, classes, targetsById } = modelData;

  if (!classes || classes.length === 0) {
    console.warn("[CritiClass] Nenhuma classe encontrada no modelo.");
    showMessageDialog("Nenhuma classe (UMLClass) foi encontrada no modelo aberto.");
    return;
  }

  const weights = loadSavedWeights();
  const metricsRows = collectAllMetrics(classes, { targetsById });
  const prioritization = prioritizeClasses(metricsRows, { weights });

  console.log(`[CritiClass] Métricas calculadas para ${metricsRows.length} classe(s) do projeto "${projectName}":`);
  if (typeof console.table === "function") {
    console.table(metricsRows);
    console.table(
      prioritization.rankedRows.map((r) => ({
        Ranking: r.rank,
        Classe: r.name,
        Prioridade: r.priorityLabel,
        Score: r.score,
        SomaPonderada: r.weightedSum
      }))
    );
  } else {
    console.log(metricsRows);
  }

  const safeProjectName = sanitizeFileName(projectName || "Projeto");
  const topClassesText = formatCriticalClassesSummary(prioritization);

  if (format === "csv") {
    const fileName = `${safeProjectName}-metrics.csv`;
    const csvContent = exportToCsvString(metricsRows);
    triggerBrowserDownload(csvContent, fileName, "text/csv;charset=utf-8;");
    showMessageDialog(
      `Métricas exportadas com sucesso!\n\n` +
        `Arquivo salvo na pasta de Downloads: ${fileName}\n` +
        `Total de classes analisadas: ${metricsRows.length}\n\n` +
        `Classes prioritárias para teste (Top 20% — ${prioritization.topCount} de ${metricsRows.length}):\n` +
        `  • ${topClassesText}`
    );
    return;
  }

  const fileName = `${safeProjectName}-metrics.xlsx`;
  const xlsxBuffer = exportToXlsxBuffer(metricsRows, { prioritization, weights });
  triggerBrowserDownload(
    xlsxBuffer,
    fileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  showMessageDialog(
    `Métricas (CK + L&K) e Priorização geradas com sucesso!\n\n` +
      `Arquivo salvo na pasta de Downloads: ${fileName}\n` +
      `Abas geradas: "Métricas", "Priorização (Top 20%)" e "Legenda"\n` +
      `Total de classes analisadas: ${metricsRows.length}\n\n` +
      `Classes prioritárias para teste (Top 20% — ${prioritization.topCount} de ${metricsRows.length}):\n` +
      `  • ${topClassesText}`
  );
}

function handleGenerateMetrics() {
  runMetricsExport("xlsx");
}

function handleExportCsv() {
  runMetricsExport("csv");
}

function handleConfigureWeights() {
  const current = loadSavedWeights();
  const initialText = formatWeightsString(current);
  const promptMessage =
    "Informe os pesos das métricas (formato METRICA=PESO separados por vírgula; use 0 para desativar uma métrica):";

  if (typeof app !== "undefined" && app.dialogs && typeof app.dialogs.showInputDialog === "function") {
    app.dialogs.showInputDialog(promptMessage, initialText).then(({ buttonId, returnValue }) => {
      if (buttonId === "ok" && typeof returnValue === "string") {
        const updated = saveWeights(parseWeightsInput(returnValue, current));
        showMessageDialog(`Pesos atualizados com sucesso:\n\n${formatWeightsString(updated)}`);
      }
    });
    return;
  }

  if (typeof window !== "undefined" && typeof window.prompt === "function") {
    const response = window.prompt(promptMessage, initialText);
    if (typeof response === "string") {
      const updated = saveWeights(parseWeightsInput(response, current));
      showMessageDialog(`Pesos atualizados com sucesso:\n\n${formatWeightsString(updated)}`);
    }
  }
}

function handleResetWeights() {
  const reset = saveWeights(DEFAULT_METRIC_WEIGHTS);
  showMessageDialog(`Pesos restaurados para o padrão (1.0 em todas as métricas):\n\n${formatWeightsString(reset)}`);
}

function init() {
  loadSavedWeights();
  app.commands.register(COMMAND_GENERATE_XLSX, handleGenerateMetrics, LABEL_GENERATE_XLSX);
  app.commands.register(COMMAND_EXPORT_CSV, handleExportCsv, LABEL_EXPORT_CSV);
  app.commands.register(COMMAND_CONFIGURE_WEIGHTS, handleConfigureWeights, LABEL_CONFIGURE_WEIGHTS);
  app.commands.register(COMMAND_RESET_WEIGHTS, handleResetWeights, LABEL_RESET_WEIGHTS);
}

exports.init = init;
exports.parseWeightsInput = parseWeightsInput;
