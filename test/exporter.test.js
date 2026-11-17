const {
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
  resolveCellStyleId,
  exportToXlsxBuffer,
  exportToCsvString
} = require("../src/exporter");
const {
  createAcademicSampleModel,
  EXPECTED_ACADEMIC_METRICS
} = require("./fixtures/sampleModel");

describe("Exporter (XLSX, CSV, Priorização, Legenda and Visual Styling)", () => {
  test("collectAllMetrics combines all CK and L&K metrics matching the reference gabarito", () => {
    const model = createAcademicSampleModel();
    const metrics = collectAllMetrics(model);

    expect(metrics.length).toBe(4);
    metrics.forEach((row) => {
      const expected = EXPECTED_ACADEMIC_METRICS[row.name];
      expect(row).toEqual({
        id: row.id,
        name: row.name,
        ...expected
      });
    });
  });

  test("buildDataSheetAoA, buildPrioritizationSheetAoA and buildLegendSheetAoA include all required columns and legend rows", () => {
    const model = createAcademicSampleModel();
    const metrics = collectAllMetrics(model);
    const dataAoA = buildDataSheetAoA(metrics);
    const prioritizationAoA = buildPrioritizationSheetAoA(metrics);
    const legendAoA = buildLegendSheetAoA();

    expect(dataAoA[0]).toEqual(DATA_HEADERS);
    expect(dataAoA.length).toBe(5); // 1 header + 4 classes

    // Check Student row values in table order
    const studentRow = dataAoA.find((r) => r[0] === "Student");
    expect(studentRow).toEqual([
      "Student",
      2, // WMC
      1, // DIT
      0, // NOC
      1, // CBO
      1, // Ce
      0, // Ca
      3, // RFC (aprox.)
      "N/A", // LCOM
      1, // NIV
      0, // NCV
      2, // NIM
      0, // NCM
      2, // PIM
      1, // NMO
      1, // NMI
      1, // NMA
      0.333, // SIX
      0.5 // APPM
    ]);

    expect(prioritizationAoA[0]).toEqual(PRIORITIZATION_HEADERS);
    // Row 1 in prioritizationAoA is Rank 1 (Student, ALTA (Top 20%))
    expect(prioritizationAoA[1][0]).toBe(1);
    expect(prioritizationAoA[1][1]).toBe("Student");
    expect(prioritizationAoA[1][2]).toBe("ALTA (Top 20%)");

    expect(legendAoA[0]).toEqual(LEGEND_HEADERS);
    expect(legendAoA.length).toBe(1 + LEGEND_ROWS.length);
    const legendAcronyms = legendAoA.slice(1).map((r) => r[0]);
    expect(legendAcronyms).toContain("WMC");
    expect(legendAcronyms).toContain("RFC (aprox.)");
    expect(legendAcronyms).toContain("LCOM");
    expect(legendAcronyms).toContain("SIX");
    expect(legendAcronyms).toContain("APPM");
    expect(legendAcronyms).toContain("Min-Max");
    expect(legendAcronyms).toContain("Score");
    expect(legendAcronyms).toContain("Top 20%");
  });

  test("dynamically detects main table range, applies zebra striping, highlights Top 20%, and excludes auxiliary rows", () => {
    const model = createAcademicSampleModel();
    const metrics = collectAllMetrics(model);
    const prioritizationAoA = buildPrioritizationSheetAoA(metrics);

    const bounds = detectMainTableBounds(prioritizationAoA);
    // 1 header row + 4 ranked class rows (excludes empty separator row and 4 auxiliary parameter rows below)
    expect(bounds.rowCount).toBe(5);
    expect(bounds.colCount).toBe(PRIORITIZATION_HEADERS.length);

    // Header row style
    expect(resolveCellStyleId(prioritizationAoA, 0, 0, bounds.rowCount)).toBe(STYLE_IDS.HEADER);
    expect(resolveCellStyleId(prioritizationAoA, 0, 1, bounds.rowCount)).toBe(STYLE_IDS.HEADER);

    // Row 1 is Student ("ALTA (Top 20%)"): "Classe" (col 1) and "Prioridade" (col 2) get special amber highlight
    expect(resolveCellStyleId(prioritizationAoA, 1, 1, bounds.rowCount)).toBe(STYLE_IDS.HIGH_PRIORITY_CLASS);
    expect(resolveCellStyleId(prioritizationAoA, 1, 2, bounds.rowCount)).toBe(STYLE_IDS.HIGH_PRIORITY_BADGE);
    // Numeric cells on Row 1 (white row) get centered white style
    expect(resolveCellStyleId(prioritizationAoA, 1, 3, bounds.rowCount)).toBe(STYLE_IDS.DATA_CENTER_WHITE);

    // Row 2 is Normal priority (zebra row): "Classe" gets zebra class col style, metrics get zebra data style
    expect(resolveCellStyleId(prioritizationAoA, 2, 1, bounds.rowCount)).toBe(STYLE_IDS.CLASS_COL_ZEBRA);
    expect(resolveCellStyleId(prioritizationAoA, 2, 3, bounds.rowCount)).toBe(STYLE_IDS.DATA_CENTER_ZEBRA);

    // Row 3 is Normal priority (white row): "Classe" gets white class col style, metrics get white data style
    expect(resolveCellStyleId(prioritizationAoA, 3, 1, bounds.rowCount)).toBe(STYLE_IDS.CLASS_COL_WHITE);
    expect(resolveCellStyleId(prioritizationAoA, 3, 3, bounds.rowCount)).toBe(STYLE_IDS.DATA_CENTER_WHITE);

    // Auxiliary parameter rows below the main table do NOT receive main table zebra/borders
    expect(resolveCellStyleId(prioritizationAoA, 6, 1, bounds.rowCount)).toBe(STYLE_IDS.AUX_HEADER);
    expect(resolveCellStyleId(prioritizationAoA, 7, 1, bounds.rowCount)).toBe(STYLE_IDS.DEFAULT_AUX);
  });

  test("exportToXlsxBuffer produces a styled OpenXML buffer with styles.xml, frozen panes, autoFilter, and column widths", () => {
    const model = createAcademicSampleModel();
    const metrics = collectAllMetrics(model);
    const buffer = exportToXlsxBuffer(metrics);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(200);
    // ZIP magic header PK\x03\x04
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    const text = buffer.toString("utf8");
    expect(text).toContain("xl/styles.xml");
    expect(text).toContain("FF1F4E3D"); // Dark green header fill
    expect(text).toContain("FFF3F5F7"); // Zebra row fill (#F3F5F7)
    expect(text).toContain("FFFFF3CD"); // High priority amber fill
    expect(text).toContain('state="frozen"'); // Frozen header row
    expect(text).toContain("<autoFilter"); // Header filter enabled on main table
    expect(text).toContain("customWidth=\"1\""); // Auto-adjusted column widths
    expect(text).toContain("Prioriza");
    expect(text).toContain("ALTA (Top 20%)");
    expect(text).toContain("Legenda");
    expect(text).toContain("Student");
  });

  test("exportToCsvString generates UTF-8 CSV with header and class rows", () => {
    const model = createAcademicSampleModel();
    const metrics = collectAllMetrics(model);
    const csv = exportToCsvString(metrics);

    expect(csv.startsWith("\uFEFFClasse,WMC,DIT,NOC,CBO,Ce,Ca,RFC (aprox.),LCOM")).toBe(true);
    expect(csv).toContain("Student,2,1,0,1,1,0,3,N/A,1,0,2,0,2,1,1,1,0.333,0.5");
  });
});
