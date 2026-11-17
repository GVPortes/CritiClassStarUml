const { calculateCKMetricsForClass, buildClassMap } = require("./metrics/ck");
const { calculateLKMetricsForClass } = require("./metrics/lk");

let XLSX = null;
try {
  // Optional runtime resolution: uses SheetJS if installed in node_modules
  XLSX = require("xlsx");
} catch (_) {
  XLSX = null;
}

const DATA_HEADERS = [
  "Classe",
  "WMC",
  "DIT",
  "NOC",
  "CBO",
  "Ce",
  "Ca",
  "RFC (aprox.)",
  "LCOM",
  "NIV",
  "NCV",
  "NIM",
  "NCM",
  "PIM",
  "NMO",
  "NMI",
  "NMA",
  "SIX",
  "APPM"
];

const LEGEND_HEADERS = [
  "Sigla",
  "Conjunto",
  "Métrica",
  "Definição neste Projeto",
  "Observações / Limitações (Fase de Design)"
];

const LEGEND_ROWS = [
  [
    "WMC",
    "CK",
    "Weighted Methods per Class",
    "Número de operações da classe (peso 1 por operação).",
    "Contagem simples: na fase de design não há corpo de método para calcular complexidade ciclomática (ponto de extensão disponível para pesos)."
  ],
  [
    "DIT",
    "CK",
    "Depth of Inheritance Tree",
    "Maior caminho da classe até a raiz via Generalization.",
    "Suporta herança múltipla e protege contra ciclos. Interface Realization não conta para DIT."
  ],
  [
    "NOC",
    "CK",
    "Number of Children",
    "Número de subclasses diretas via Generalization.",
    "Conta apenas herança direta (um nível abaixo)."
  ],
  [
    "CBO",
    "CK",
    "Coupling Between Object Classes",
    "Número de classes ou interfaces distintas acopladas nos dois sentidos.",
    "Inclui Association, Directed Association, Aggregation, Composition, Dependency e Interface Realization. Generalization e autoassociações não contam."
  ],
  [
    "Ce",
    "CK (extra)",
    "Efferent Coupling (Acoplamento de Saída)",
    "Número de classes ou interfaces distintas das quais a classe depende (direção de saída).",
    "Em associações sem navegabilidade definida, ambos os sentidos são registrados."
  ],
  [
    "Ca",
    "CK (extra)",
    "Afferent Coupling (Acoplamento de Entrada)",
    "Número de classes ou interfaces distintas que dependem da classe (direção de entrada).",
    "Em associações sem navegabilidade definida, ambos os sentidos são registrados."
  ],
  [
    "RFC (aprox.)",
    "CK",
    "Response For a Class (Aproximação)",
    "Operações da própria classe + operações distintas das classes/interfaces diretamente acopladas.",
    "Aproximação: como não há corpo de métodos no diagrama de classes, assume potencial invocação das operações das classes diretamente acopladas."
  ],
  [
    "LCOM",
    "CK",
    "Lack of Cohesion in Methods",
    "N/A",
    "Não aplicável na fase de design: exige saber quais métodos acessam quais atributos dentro do código-fonte."
  ],
  [
    "NIV",
    "Lorenz & Kidd",
    "Number of Instance Variables",
    "Número de atributos de instância (não estáticos).",
    "Calculado diretamente dos atributos da classe."
  ],
  [
    "NCV",
    "Lorenz & Kidd",
    "Number of Class Variables",
    "Número de atributos de classe (estáticos / isStatic = true).",
    "Calculado diretamente dos atributos da classe."
  ],
  [
    "NIM",
    "Lorenz & Kidd",
    "Number of Instance Methods",
    "Número de operações de instância (não estáticas).",
    "Calculado diretamente das operações da classe."
  ],
  [
    "NCM",
    "Lorenz & Kidd",
    "Number of Class Methods",
    "Número de operações de classe (estáticas / isStatic = true).",
    "Calculado diretamente das operações da classe."
  ],
  [
    "PIM",
    "Lorenz & Kidd",
    "Public Instance Methods",
    "Número de operações de instância com visibilidade pública (public).",
    "Considera apenas métodos não estáticos com visibility = 'public'."
  ],
  [
    "NMO",
    "Lorenz & Kidd",
    "Number of Methods Overridden",
    "Operações de instância que sobrescrevem método herdado não privado de algum ancestral.",
    "Compara assinatura pelo nome da operação e quantidade/tipos dos parâmetros."
  ],
  [
    "NMI",
    "Lorenz & Kidd",
    "Number of Methods Inherited",
    "Operações de instância herdadas de ancestrais (não privadas e não sobrescritas na classe).",
    "Percorre toda a cadeia de Generalization com proteção contra ciclos."
  ],
  [
    "NMA",
    "Lorenz & Kidd",
    "Number of Methods Added",
    "Operações de instância novas adicionadas pela classe (NIM - NMO).",
    "Representa os métodos de instância definidos pela classe que não sobrescrevem ancestrais."
  ],
  [
    "SIX",
    "Lorenz & Kidd",
    "Specialization Index",
    "(NMO * DIT) / (NMO + NMA + NMI).",
    "Quando (NMO + NMA + NMI) = 0, o valor resultante é 0 (proteção contra divisão por zero)."
  ],
  [
    "APPM",
    "Lorenz & Kidd",
    "Average Parameters per Method",
    "Média de parâmetros por operação da classe, sem contar o parâmetro de retorno.",
    "Quando a classe não possui operações, o valor resultante é 0."
  ]
];

function collectAllMetrics(allClasses, options = {}) {
  const classes = Array.isArray(allClasses) ? allClasses : [];
  const classesById = buildClassMap(classes, options.targetsById);

  return classes.map((cls) => {
    const ck = calculateCKMetricsForClass(cls, classes, {
      ...options,
      classesById
    });
    const lk = calculateLKMetricsForClass(cls, classes, {
      ...options,
      classesById
    });

    return {
      id: cls.id,
      name: cls.name || "(sem nome)",
      ...ck,
      ...lk
    };
  });
}

function buildDataSheetAoA(metricsRows) {
  const rows = Array.isArray(metricsRows) ? metricsRows : [];
  const aoa = [DATA_HEADERS];

  rows.forEach((row) => {
    aoa.push([
      row.name || "(sem nome)",
      row.WMC,
      row.DIT,
      row.NOC,
      row.CBO,
      row.Ce,
      row.Ca,
      row.RFC,
      row.LCOM,
      row.NIV,
      row.NCV,
      row.NIM,
      row.NCM,
      row.PIM,
      row.NMO,
      row.NMI,
      row.NMA,
      row.SIX,
      row.APPM
    ]);
  });

  return aoa;
}

function buildLegendSheetAoA() {
  return [LEGEND_HEADERS, ...LEGEND_ROWS];
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnIndexToLetter(index) {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function aoaToWorksheetXml(aoa) {
  const rowsXml = aoa
    .map((row, rowIndex) => {
      const rNum = rowIndex + 1;
      const cellsXml = row
        .map((cellValue, colIndex) => {
          const cellRef = `${columnIndexToLetter(colIndex)}${rNum}`;
          if (typeof cellValue === "number" && Number.isFinite(cellValue)) {
            return `<c r="${cellRef}"><v>${cellValue}</v></c>`;
          }
          const safeText = escapeXml(cellValue === null || cellValue === undefined ? "" : cellValue);
          return `<c r="${cellRef}" t="inlineStr"><is><t>${safeText}</t></is></c>`;
        })
        .join("");
      return `<row r="${rNum}">${cellsXml}</row>`;
    })
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${rowsXml}</sheetData>` +
    "</worksheet>"
  );
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoreZipBuffer(files) {
  const localFileHeaders = [];
  const centralDirectoryHeaders = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBuf = Buffer.from(file.name, "utf8");
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf8");
    const crc = crc32(dataBuf);
    const size = dataBuf.length;

    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(0, 8); // store (no compression)
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);

    localFileHeaders.push(localHeader, dataBuf);

    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuf.copy(centralHeader, 46);

    centralDirectoryHeaders.push(centralHeader);
    offset += localHeader.length + size;
  });

  const centralDirectoryBuffer = Buffer.concat(centralDirectoryHeaders);
  const endOfCentralDir = Buffer.alloc(22);
  endOfCentralDir.writeUInt32LE(0x06054b50, 0);
  endOfCentralDir.writeUInt16LE(0, 4);
  endOfCentralDir.writeUInt16LE(0, 6);
  endOfCentralDir.writeUInt16LE(files.length, 8);
  endOfCentralDir.writeUInt16LE(files.length, 10);
  endOfCentralDir.writeUInt32LE(centralDirectoryBuffer.length, 12);
  endOfCentralDir.writeUInt32LE(offset, 16);
  endOfCentralDir.writeUInt16LE(0, 20);

  return Buffer.concat([...localFileHeaders, centralDirectoryBuffer, endOfCentralDir]);
}

function buildFallbackXlsxBuffer(sheets) {
  const contentTypesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    sheets
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join("") +
    "</Types>";

  const rootRelsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    "<sheets>" +
    sheets
      .map(
        (sheet, i) =>
          `<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
      )
      .join("") +
    "</sheets>" +
    "</workbook>";

  const workbookRelsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join("") +
    "</Relationships>";

  const zipEntries = [
    { name: "[Content_Types].xml", data: contentTypesXml },
    { name: "_rels/.rels", data: rootRelsXml },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRelsXml },
    ...sheets.map((sheet, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: aoaToWorksheetXml(sheet.aoa)
    }))
  ];

  return createStoreZipBuffer(zipEntries);
}

function exportToXlsxBuffer(metricsRows) {
  const dataAoA = buildDataSheetAoA(metricsRows);
  const legendAoA = buildLegendSheetAoA();

  if (XLSX && XLSX.utils && typeof XLSX.write === "function") {
    const workbook = XLSX.utils.book_new();
    const dataWorksheet = XLSX.utils.aoa_to_sheet(dataAoA);
    const legendWorksheet = XLSX.utils.aoa_to_sheet(legendAoA);

    XLSX.utils.book_append_sheet(workbook, dataWorksheet, "Métricas");
    XLSX.utils.book_append_sheet(workbook, legendWorksheet, "Legenda");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  return buildFallbackXlsxBuffer([
    { name: "Métricas", aoa: dataAoA },
    { name: "Legenda", aoa: legendAoA }
  ]);
}

function escapeCsvCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCsvString(metricsRows) {
  const dataAoA = buildDataSheetAoA(metricsRows);
  const lines = dataAoA.map((row) => row.map(escapeCsvCell).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

function sanitizeFileName(rawName) {
  const base = (rawName || "metrics").trim() || "metrics";
  return base.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function triggerBrowserDownload(content, fileName, mimeType) {
  if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
    return false;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

module.exports = {
  DATA_HEADERS,
  LEGEND_HEADERS,
  LEGEND_ROWS,
  collectAllMetrics,
  buildDataSheetAoA,
  buildLegendSheetAoA,
  exportToXlsxBuffer,
  exportToCsvString,
  sanitizeFileName,
  triggerBrowserDownload
};
