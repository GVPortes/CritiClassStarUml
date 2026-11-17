const {
  DATA_HEADERS,
  LEGEND_HEADERS,
  LEGEND_ROWS,
  collectAllMetrics,
  buildDataSheetAoA,
  buildLegendSheetAoA,
  exportToXlsxBuffer,
  exportToCsvString
} = require("../src/exporter");
const {
  createAcademicSampleModel,
  EXPECTED_ACADEMIC_METRICS
} = require("./fixtures/sampleModel");

describe("Exporter (XLSX, CSV and Legenda)", () => {
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

  test("buildDataSheetAoA and buildLegendSheetAoA include all required columns and legend rows", () => {
    const model = createAcademicSampleModel();
    const metrics = collectAllMetrics(model);
    const dataAoA = buildDataSheetAoA(metrics);
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

    expect(legendAoA[0]).toEqual(LEGEND_HEADERS);
    expect(legendAoA.length).toBe(1 + LEGEND_ROWS.length);
    const legendAcronyms = legendAoA.slice(1).map((r) => r[0]);
    expect(legendAcronyms).toContain("WMC");
    expect(legendAcronyms).toContain("RFC (aprox.)");
    expect(legendAcronyms).toContain("LCOM");
    expect(legendAcronyms).toContain("SIX");
    expect(legendAcronyms).toContain("APPM");
  });

  test("exportToXlsxBuffer produces a valid ZIP/OpenXML buffer containing Métricas and Legenda sheets", () => {
    const model = createAcademicSampleModel();
    const metrics = collectAllMetrics(model);
    const buffer = exportToXlsxBuffer(metrics);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(200);
    // ZIP magic header PK\x03\x04
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    expect(buffer.toString("utf8")).toContain("Legenda");
    expect(buffer.toString("utf8")).toContain("Student");
  });

  test("exportToCsvString generates UTF-8 CSV with header and class rows", () => {
    const model = createAcademicSampleModel();
    const metrics = collectAllMetrics(model);
    const csv = exportToCsvString(metrics);

    expect(csv.startsWith("\uFEFFClasse,WMC,DIT,NOC,CBO,Ce,Ca,RFC (aprox.),LCOM")).toBe(true);
    expect(csv).toContain("Student,2,1,0,1,1,0,3,N/A,1,0,2,0,2,1,1,1,0.333,0.5");
  });
});
