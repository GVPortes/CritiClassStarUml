const { readModel } = require("./src/modelReader");
const {
  collectAllMetrics,
  exportToXlsxBuffer,
  exportToCsvString,
  sanitizeFileName,
  triggerBrowserDownload
} = require("./src/exporter");

const COMMAND_GENERATE_XLSX = "criticlass:generate-metrics";
const LABEL_GENERATE_XLSX = "Gerar métricas (CK + L&K)";

const COMMAND_EXPORT_CSV = "criticlass:export-csv";
const LABEL_EXPORT_CSV = "Exportar métricas (.csv)";

function showMessageDialog(message) {
  if (typeof app !== "undefined" && app.dialogs && typeof app.dialogs.showInfoDialog === "function") {
    app.dialogs.showInfoDialog(message);
    return;
  }
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message);
  }
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

  const metricsRows = collectAllMetrics(classes, { targetsById });
  console.log(`[CritiClass] Métricas calculadas para ${metricsRows.length} classe(s) do projeto "${projectName}":`);
  if (typeof console.table === "function") {
    console.table(metricsRows);
  } else {
    console.log(metricsRows);
  }

  const safeProjectName = sanitizeFileName(projectName || "Projeto");

  if (format === "csv") {
    const fileName = `${safeProjectName}-metrics.csv`;
    const csvContent = exportToCsvString(metricsRows);
    triggerBrowserDownload(csvContent, fileName, "text/csv;charset=utf-8;");
    showMessageDialog(
      `Métricas exportadas com sucesso!\n\n` +
        `Arquivo salvo na pasta de Downloads: ${fileName}\n` +
        `Total de classes analisadas: ${metricsRows.length}`
    );
    return;
  }

  const fileName = `${safeProjectName}-metrics.xlsx`;
  const xlsxBuffer = exportToXlsxBuffer(metricsRows);
  triggerBrowserDownload(
    xlsxBuffer,
    fileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  showMessageDialog(
    `Métricas (CK + L&K) geradas com sucesso!\n\n` +
      `Arquivo salvo na pasta de Downloads: ${fileName}\n` +
      `Abas geradas: "Métricas" e "Legenda"\n` +
      `Total de classes analisadas: ${metricsRows.length}`
  );
}

function handleGenerateMetrics() {
  runMetricsExport("xlsx");
}

function handleExportCsv() {
  runMetricsExport("csv");
}

function init() {
  app.commands.register(COMMAND_GENERATE_XLSX, handleGenerateMetrics, LABEL_GENERATE_XLSX);
  app.commands.register(COMMAND_EXPORT_CSV, handleExportCsv, LABEL_EXPORT_CSV);
}

exports.init = init;
