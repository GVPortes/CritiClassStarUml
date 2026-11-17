const { calculateCKMetricsForClass, buildClassMap } = require("./metrics/ck");
const { calculateLKMetricsForClass } = require("./metrics/lk");
const { NUMERIC_METRIC_KEYS } = require("./metrics/normalizer");
const { prioritizeClasses } = require("./metrics/prioritizer");

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

const PRIORITIZATION_HEADERS = [
  "Ranking",
  "Classe",
  "Prioridade",
  "Score",
  "Soma Ponderada",
  ...NUMERIC_METRIC_KEYS.map((key) => `${key} (norm)`)
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
    "Representa os métodos de instância definidos pela classe que não sobrescritvem ancestrais."
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
  ],
  [
    "Min-Max",
    "Fase 2 — Priorização",
    "Normalização Min-Max",
    "(x - min) / (max - min) no intervalo [0, 1] para cada métrica numérica.",
    "Quando todas as classes possuem o mesmo valor em uma métrica (max = min), o valor normalizado atribuído é 0."
  ],
  [
    "Score",
    "Fase 2 — Priorização",
    "Score de Criticidade",
    "Média ponderada das métricas normalizadas: Σ(peso_m * norm_m) / Σ(peso_m).",
    "Varia de 0 a 1. Os pesos são configuráveis por métrica (padrão = 1 para todas as 17 métricas numéricas)."
  ],
  [
    "Top 20%",
    "Fase 2 — Priorização",
    "Priorização de Testes (Pareto ~20%)",
    "Indica as ceil(0.20 * N) classes com maior Score de Criticidade como ALTA (Top 20%).",
    "Critérios de desempate em caso de mesmo Score: Soma Ponderada, CBO, RFC, WMC e nome da classe."
  ]
];

const STYLE_IDS = Object.freeze({
  DEFAULT_AUX: 0,
  HEADER: 1,
  CLASS_COL_WHITE: 2,
  CLASS_COL_ZEBRA: 3,
  DATA_CENTER_WHITE: 4,
  DATA_CENTER_ZEBRA: 5,
  HIGH_PRIORITY_CLASS: 6,
  HIGH_PRIORITY_BADGE: 7,
  TEXT_LEFT_WHITE: 8,
  TEXT_LEFT_ZEBRA: 9,
  AUX_HEADER: 10
});

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

function buildPrioritizationSheetAoA(metricsRowsOrPrioritization, options = {}) {
  const prioritization =
    metricsRowsOrPrioritization && Array.isArray(metricsRowsOrPrioritization.rankedRows)
      ? metricsRowsOrPrioritization
      : prioritizeClasses(metricsRowsOrPrioritization, options);

  const aoa = [PRIORITIZATION_HEADERS];

  prioritization.rankedRows.forEach((row) => {
    const normCells = NUMERIC_METRIC_KEYS.map((key) =>
      row.normalized && typeof row.normalized[key] === "number" ? row.normalized[key] : 0
    );

    aoa.push([
      row.rank,
      row.name || "(sem nome)",
      row.priorityLabel,
      row.score,
      row.weightedSum,
      ...normCells
    ]);
  });

  aoa.push([]);
  aoa.push([
    "",
    "Parâmetro",
    "Descrição",
    "",
    "",
    ...NUMERIC_METRIC_KEYS
  ]);
  aoa.push([
    "",
    "Peso Configurado",
    "Peso aplicado na média ponderada",
    "",
    "",
    ...NUMERIC_METRIC_KEYS.map((key) =>
      prioritization.weights && typeof prioritization.weights[key] === "number"
        ? prioritization.weights[key]
        : 1
    )
  ]);
  aoa.push([
    "",
    "Mínimo (min)",
    "Menor valor observado no modelo",
    "",
    "",
    ...NUMERIC_METRIC_KEYS.map((key) =>
      prioritization.bounds && prioritization.bounds[key] ? prioritization.bounds[key].min : 0
    )
  ]);
  aoa.push([
    "",
    "Máximo (max)",
    "Maior valor observado no modelo",
    "",
    "",
    ...NUMERIC_METRIC_KEYS.map((key) =>
      prioritization.bounds && prioritization.bounds[key] ? prioritization.bounds[key].max : 0
    )
  ]);

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

/**
 * Dynamically detects the contiguous main table range (stopping before any blank separator row).
 */
function detectMainTableBounds(aoa) {
  if (!Array.isArray(aoa) || aoa.length === 0) {
    return { rowCount: 0, colCount: 0 };
  }

  const headerRow = Array.isArray(aoa[0]) ? aoa[0] : [];
  const colCount = headerRow.length;
  let rowCount = 0;

  for (let i = 0; i < aoa.length; i++) {
    const row = aoa[i];
    if (!Array.isArray(row) || row.length === 0) {
      break;
    }
    rowCount++;
  }

  return { rowCount, colCount };
}

/**
 * Computes auto-fitted column widths for the main table range so headers and values are not clipped.
 */
function computeColumnWidths(aoa, mainTableRowCount, sheetOptions = {}) {
  const headerRow = Array.isArray(aoa[0]) ? aoa[0] : [];
  const colCount = headerRow.length;
  const widths = [];
  const wrapCols = Array.isArray(sheetOptions.leftAlignTextCols) ? sheetOptions.leftAlignTextCols : [];

  for (let c = 0; c < colCount; c++) {
    const headerTitle = String(headerRow[c] || "");
    let maxLen = headerTitle.length;

    for (let r = 1; r < mainTableRowCount; r++) {
      const row = aoa[r] || [];
      const val = row[c];
      const text = val === null || val === undefined ? "" : String(val);
      if (text.length > maxLen) {
        maxLen = text.length;
      }
    }

    const isClassOrSiglaCol = headerTitle === "Classe" || headerTitle === "Sigla";
    const isPriorityCol = headerTitle === "Prioridade";
    const isWrapTextCol = wrapCols.includes(c);

    let minWidth = 11;
    let maxWidth = 42;

    if (isClassOrSiglaCol) {
      minWidth = 20;
      maxWidth = 45;
    } else if (isPriorityCol) {
      minWidth = 18;
      maxWidth = 26;
    } else if (isWrapTextCol) {
      minWidth = 28;
      maxWidth = 62;
    }

    const padded = Math.ceil(maxLen * 1.15) + 4;
    const finalWidth = Math.max(minWidth, Math.min(maxWidth, padded));
    widths.push(finalWidth);
  }

  return widths;
}

/**
 * Resolves the OpenXML cell style index (s="...") for a given cell coordinate.
 * Strictly preserves all cell values and only applies visual presentation rules.
 */
function resolveCellStyleId(aoa, rowIndex, colIndex, mainTableRowCount, sheetOptions = {}) {
  const headerRow = Array.isArray(aoa[0]) ? aoa[0] : [];

  // Auxiliary area below the main table (e.g., parameter/weights block)
  if (rowIndex >= mainTableRowCount) {
    const row = aoa[rowIndex] || [];
    if (row[1] === "Parâmetro") {
      return STYLE_IDS.AUX_HEADER;
    }
    return STYLE_IDS.DEFAULT_AUX;
  }

  // Main table header (first row)
  if (rowIndex === 0) {
    return STYLE_IDS.HEADER;
  }

  const row = aoa[rowIndex] || [];
  const isZebra = rowIndex % 2 === 0;

  const classColIdx = headerRow.findIndex((h) => h === "Classe" || h === "Sigla");
  const priorityColIdx = headerRow.indexOf("Prioridade");
  const wrapTextCols = Array.isArray(sheetOptions.leftAlignTextCols) ? sheetOptions.leftAlignTextCols : [];

  const isHighPriorityRow =
    priorityColIdx !== -1 &&
    typeof row[priorityColIdx] === "string" &&
    row[priorityColIdx].includes("ALTA");

  if (isHighPriorityRow && colIndex === classColIdx) {
    return STYLE_IDS.HIGH_PRIORITY_CLASS;
  }

  if (isHighPriorityRow && colIndex === priorityColIdx) {
    return STYLE_IDS.HIGH_PRIORITY_BADGE;
  }

  if (colIndex === classColIdx) {
    return isZebra ? STYLE_IDS.CLASS_COL_ZEBRA : STYLE_IDS.CLASS_COL_WHITE;
  }

  if (wrapTextCols.includes(colIndex)) {
    return isZebra ? STYLE_IDS.TEXT_LEFT_ZEBRA : STYLE_IDS.TEXT_LEFT_WHITE;
  }

  return isZebra ? STYLE_IDS.DATA_CENTER_ZEBRA : STYLE_IDS.DATA_CENTER_WHITE;
}

function buildStylesXml() {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="4">' +
    // Font 0: Regular body font (Calibri 11pt, dark slate #1F2937)
    '<font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>' +
    // Font 1: Header font (Calibri 11pt Bold, white #FFFFFF)
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
    // Font 2: Class column & auxiliary header font (Calibri 11pt Bold, dark slate #1B242B)
    '<font><b/><sz val="11"/><color rgb="FF1B242B"/><name val="Calibri"/><family val="2"/></font>' +
    // Font 3: High Priority highlight font (Calibri 11pt Bold, warm dark amber #7A4F01)
    '<font><b/><sz val="11"/><color rgb="FF7A4F01"/><name val="Calibri"/><family val="2"/></font>' +
    "</fonts>" +
    '<fills count="9">' +
    // Fills 0 and 1 are reserved by the OpenXML specification (none and gray125)
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    // Fill 2: Header solid dark green (#1F4E3D)
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E3D"/><bgColor indexed="64"/></patternFill></fill>' +
    // Fill 3: Even data row white (#FFFFFF)
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>' +
    // Fill 4: Odd/Zebra data row light gray (#F3F5F7)
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F5F7"/><bgColor indexed="64"/></patternFill></fill>' +
    // Fill 5: Class column white row soft sage tint (#EBF3F0)
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEBF3F0"/><bgColor indexed="64"/></patternFill></fill>' +
    // Fill 6: Class column zebra row soft sage tint (#E2EDE8)
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE2EDE8"/><bgColor indexed="64"/></patternFill></fill>' +
    // Fill 7: High Priority ("Classe") soft warm amber (#FFF3CD)
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF3CD"/><bgColor indexed="64"/></patternFill></fill>' +
    // Fill 8: High Priority ("Prioridade") soft amber badge (#FFE69C)
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFE69C"/><bgColor indexed="64"/></patternFill></fill>' +
    "</fills>" +
    '<borders count="5">' +
    // Border 0: No border (auxiliary area)
    "<border><left/><right/><top/><bottom/><diagonal/></border>" +
    // Border 1: Header subtle borders
    '<border>' +
    '<left style="thin"><color rgb="FF2E6B55"/></left>' +
    '<right style="thin"><color rgb="FF2E6B55"/></right>' +
    '<top style="thin"><color rgb="FF1F4E3D"/></top>' +
    '<bottom style="medium"><color rgb="FF143328"/></bottom>' +
    "<diagonal/>" +
    "</border>" +
    // Border 2: Discreet internal data cell border (#DCE1E7)
    '<border>' +
    '<left style="thin"><color rgb="FFDCE1E7"/></left>' +
    '<right style="thin"><color rgb="FFDCE1E7"/></right>' +
    '<top style="thin"><color rgb="FFDCE1E7"/></top>' +
    '<bottom style="thin"><color rgb="FFDCE1E7"/></bottom>' +
    "<diagonal/>" +
    "</border>" +
    // Border 3: High Priority "Classe" cell with medium amber left indicator bar (#D97706)
    '<border>' +
    '<left style="medium"><color rgb="FFD97706"/></left>' +
    '<right style="thin"><color rgb="FFE5A93C"/></right>' +
    '<top style="thin"><color rgb="FFE5A93C"/></top>' +
    '<bottom style="thin"><color rgb="FFE5A93C"/></bottom>' +
    "<diagonal/>" +
    "</border>" +
    // Border 4: High Priority "Prioridade" cell border (#E5A93C)
    '<border>' +
    '<left style="thin"><color rgb="FFE5A93C"/></left>' +
    '<right style="thin"><color rgb="FFE5A93C"/></right>' +
    '<top style="thin"><color rgb="FFE5A93C"/></top>' +
    '<bottom style="thin"><color rgb="FFE5A93C"/></bottom>' +
    "<diagonal/>" +
    "</border>" +
    "</borders>" +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="11">' +
    // 0: DEFAULT_AUX
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">' +
    '<alignment vertical="center"/>' +
    "</xf>" +
    // 1: HEADER
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
    '<alignment horizontal="center" vertical="center" wrapText="1"/>' +
    "</xf>" +
    // 2: CLASS_COL_WHITE
    '<xf numFmtId="0" fontId="2" fillId="5" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
    '<alignment horizontal="left" vertical="center"/>' +
    "</xf>" +
    // 3: CLASS_COL_ZEBRA
    '<xf numFmtId="0" fontId="2" fillId="6" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
    '<alignment horizontal="left" vertical="center"/>' +
    "</xf>" +
    // 4: DATA_CENTER_WHITE
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
    '<alignment horizontal="center" vertical="center"/>' +
    "</xf>" +
    // 5: DATA_CENTER_ZEBRA
    '<xf numFmtId="0" fontId="0" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
    '<alignment horizontal="center" vertical="center"/>' +
    "</xf>" +
    // 6: HIGH_PRIORITY_CLASS
    '<xf numFmtId="0" fontId="3" fillId="7" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
    '<alignment horizontal="left" vertical="center"/>' +
    "</xf>" +
    // 7: HIGH_PRIORITY_BADGE
    '<xf numFmtId="0" fontId="3" fillId="8" borderId="4" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
    '<alignment horizontal="center" vertical="center"/>' +
    "</xf>" +
    // 8: TEXT_LEFT_WHITE
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
    '<alignment horizontal="left" vertical="center" wrapText="1"/>' +
    "</xf>" +
    // 9: TEXT_LEFT_ZEBRA
    '<xf numFmtId="0" fontId="0" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
    '<alignment horizontal="left" vertical="center" wrapText="1"/>' +
    "</xf>" +
    // 10: AUX_HEADER
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">' +
    '<alignment horizontal="left" vertical="center"/>' +
    "</xf>" +
    "</cellXfs>" +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    "</styleSheet>"
  );
}

function aoaToWorksheetXml(aoa, sheetOptions = {}) {
  const { rowCount: mainTableRowCount, colCount } = detectMainTableBounds(aoa);
  const colWidths = computeColumnWidths(aoa, mainTableRowCount, sheetOptions);

  // 1. Frozen top header row (<sheetViews>)
  const sheetViewsXml =
    mainTableRowCount > 0
      ? '<sheetViews><sheetView workbookViewId="0">' +
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
        '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' +
        "</sheetView></sheetViews>"
      : "";

  // 2. Default row height (<sheetFormatPr>)
  const sheetFormatPrXml = '<sheetFormatPr defaultRowHeight="20"/>';

  // 3. Auto-fitted column widths (<cols>)
  const colsXml =
    colWidths.length > 0
      ? "<cols>" +
        colWidths
          .map(
            (width, idx) =>
              `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`
          )
          .join("") +
        "</cols>"
      : "";

  // 4. Rows and styled cells (<sheetData>)
  const rowsXml = aoa
    .map((row, rowIndex) => {
      const rNum = rowIndex + 1;
      if (!Array.isArray(row) || row.length === 0) {
        return `<row r="${rNum}" ht="14" customHeight="1"/>`;
      }

      const rowHeight = rowIndex === 0 ? 28 : rowIndex < mainTableRowCount ? 21 : 19;
      const cellsXml = row
        .map((cellValue, colIndex) => {
          const cellRef = `${columnIndexToLetter(colIndex)}${rNum}`;
          const styleId = resolveCellStyleId(aoa, rowIndex, colIndex, mainTableRowCount, sheetOptions);

          if (typeof cellValue === "number" && Number.isFinite(cellValue)) {
            return `<c r="${cellRef}" s="${styleId}"><v>${cellValue}</v></c>`;
          }
          const safeText = escapeXml(cellValue === null || cellValue === undefined ? "" : cellValue);
          return `<c r="${cellRef}" s="${styleId}" t="inlineStr"><is><t>${safeText}</t></is></c>`;
        })
        .join("");

      return `<row r="${rNum}" ht="${rowHeight}" customHeight="1">${cellsXml}</row>`;
    })
    .join("");

  // 5. AutoFilter on the main table range (<autoFilter>)
  const lastColLetter = colCount > 0 ? columnIndexToLetter(colCount - 1) : "A";
  const autoFilterXml =
    mainTableRowCount > 1 && colCount > 0
      ? `<autoFilter ref="A1:${lastColLetter}${mainTableRowCount}"/>`
      : "";

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    sheetViewsXml +
    sheetFormatPrXml +
    colsXml +
    `<sheetData>${rowsXml}</sheetData>` +
    autoFilterXml +
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

function buildStyledXlsxBuffer(sheets) {
  const contentTypesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
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
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    "</Relationships>";

  const zipEntries = [
    { name: "[Content_Types].xml", data: contentTypesXml },
    { name: "_rels/.rels", data: rootRelsXml },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRelsXml },
    { name: "xl/styles.xml", data: buildStylesXml() },
    ...sheets.map((sheet, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: aoaToWorksheetXml(sheet.aoa, sheet.options)
    }))
  ];

  return createStoreZipBuffer(zipEntries);
}

function exportToXlsxBuffer(metricsRows, options = {}) {
  const dataAoA = buildDataSheetAoA(metricsRows);
  const prioritization = options.prioritization || prioritizeClasses(metricsRows, options);
  const prioritizationAoA = buildPrioritizationSheetAoA(prioritization);
  const legendAoA = buildLegendSheetAoA();

  return buildStyledXlsxBuffer([
    {
      name: "Métricas",
      aoa: dataAoA,
      options: {}
    },
    {
      name: "Priorização (Top 20%)",
      aoa: prioritizationAoA,
      options: {}
    },
    {
      name: "Legenda",
      aoa: legendAoA,
      options: { leftAlignTextCols: [2, 3, 4] }
    }
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
  PRIORITIZATION_HEADERS,
  LEGEND_HEADERS,
  LEGEND_ROWS,
  STYLE_IDS,
  collectAllMetrics,
  buildDataSheetAoA,
  buildPrioritizationSheetAoA,
  buildLegendSheetAoA,
  detectMainTableBounds,
  computeColumnWidths,
  resolveCellStyleId,
  exportToXlsxBuffer,
  exportToCsvString,
  sanitizeFileName,
  triggerBrowserDownload
};
