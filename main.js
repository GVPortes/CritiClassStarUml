const { readModel } = require("./src/modelReader");
const {
  collectAllMetrics,
  exportToXlsxBuffer,
  sanitizeFileName,
  triggerBrowserDownload
} = require("./src/exporter");
const { prioritizeClasses } = require("./src/metrics/prioritizer");

const COMMAND_GENERATE_XLSX = "criticlass:generate-metrics";
const LABEL_GENERATE_XLSX = "Generate Document";

function showMessageDialog(message) {
  if (typeof app !== "undefined" && app.dialogs && typeof app.dialogs.showInfoDialog === "function") {
    app.dialogs.showInfoDialog(message);
    return;
  }
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message);
  }
}

function handleGenerateMetrics() {
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

  try {
    const metricsRows = collectAllMetrics(classes, { targetsById });
    const prioritization = prioritizeClasses(metricsRows);

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
    const fileName = `${safeProjectName}-metrics.xlsx`;
    const xlsxBuffer = exportToXlsxBuffer(metricsRows, { prioritization });
    const saved = triggerBrowserDownload(
      xlsxBuffer,
      fileName,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    if (!saved) {
      showMessageDialog("Falha ao gravar o arquivo de métricas.");
    }
  } catch (err) {
    console.error("[CritiClass] Falha ao gerar ou gravar o arquivo:", err);
    showMessageDialog(`Falha ao gravar o arquivo: ${err && err.message ? err.message : String(err)}`);
  }
}

function init() {
  app.commands.register(COMMAND_GENERATE_XLSX, handleGenerateMetrics, LABEL_GENERATE_XLSX);
}

exports.init = init;
