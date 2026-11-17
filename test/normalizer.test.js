const {
  NUMERIC_METRIC_KEYS,
  computeMinMaxBounds,
  minMaxNormalizeValue,
  normalizeMetrics
} = require("../src/metrics/normalizer");
const { collectAllMetrics } = require("../src/exporter");
const { createAcademicSampleModel } = require("./fixtures/sampleModel");

describe("Min-Max Metric Normalizer (Phase 2)", () => {
  test("computes min/max bounds and normalizes the 4-class academic reference model into [0, 1]", () => {
    const model = createAcademicSampleModel();
    const metricsRows = collectAllMetrics(model);
    const { bounds, rows } = normalizeMetrics(metricsRows);

    // WMC ranges from 1 (Professor, Course) to 2 (Person, Student)
    expect(bounds.WMC).toEqual({ min: 1, max: 2 });
    // NOC ranges from 0 to 2 (Person)
    expect(bounds.NOC).toEqual({ min: 0, max: 2 });
    // NCV is 0 for all classes -> min === max === 0
    expect(bounds.NCV).toEqual({ min: 0, max: 0 });

    const person = rows.find((r) => r.name === "Person");
    const student = rows.find((r) => r.name === "Student");
    const professor = rows.find((r) => r.name === "Professor");

    expect(person.normalized.WMC).toBe(1);
    expect(person.normalized.DIT).toBe(0);
    expect(person.normalized.NOC).toBe(1);
    expect(person.normalized.NCV).toBe(0); // max === min handled safely

    expect(student.normalized.WMC).toBe(1);
    expect(student.normalized.DIT).toBe(1);
    expect(student.normalized.CBO).toBe(1);
    expect(student.normalized.SIX).toBe(1);

    expect(professor.normalized.WMC).toBe(0);
    expect(professor.normalized.NMI).toBe(1); // Professor has max NMI = 2
  });

  test("handles empty input and single-class models without division by zero", () => {
    const emptyResult = normalizeMetrics([]);
    expect(emptyResult.rows).toEqual([]);
    NUMERIC_METRIC_KEYS.forEach((key) => {
      expect(emptyResult.bounds[key]).toEqual({ min: 0, max: 0 });
    });

    const singleClass = [
      {
        id: "c1",
        name: "OnlyClass",
        WMC: 5,
        DIT: 2,
        NOC: 0,
        CBO: 3,
        Ce: 2,
        Ca: 1,
        RFC: 8,
        LCOM: "N/A",
        NIV: 4,
        NCV: 1,
        NIM: 4,
        NCM: 1,
        PIM: 3,
        NMO: 1,
        NMI: 2,
        NMA: 3,
        SIX: 0.333,
        APPM: 1.5
      }
    ];
    const singleResult = normalizeMetrics(singleClass);
    NUMERIC_METRIC_KEYS.forEach((key) => {
      expect(singleResult.rows[0].normalized[key]).toBe(0);
    });
    expect(minMaxNormalizeValue(10, 10, 10)).toBe(0);
    expect(computeMinMaxBounds(singleClass).WMC).toEqual({ min: 5, max: 5 });
  });
});

