const {
  DEFAULT_METRIC_WEIGHTS,
  prioritizeClasses
} = require("../src/metrics/prioritizer");
const { collectAllMetrics } = require("../src/exporter");
const { createAcademicSampleModel } = require("./fixtures/sampleModel");

describe("Class Prioritizer — Fixed Weights (1), Criticality Score, Ranking and Top 20% (Phase 2)", () => {
  test("uses fixed weights equal to 1, ranks the 4-class academic reference model and selects Top 20% (ceil(4 * 0.2) = 1 class)", () => {
    const model = createAcademicSampleModel();
    const metricsRows = collectAllMetrics(model);
    const result = prioritizeClasses(metricsRows);

    Object.values(DEFAULT_METRIC_WEIGHTS).forEach((weight) => {
      expect(weight).toBe(1);
    });
    expect(result.weights).toEqual(DEFAULT_METRIC_WEIGHTS);

    expect(result.topCount).toBe(1);
    expect(result.criticalClasses.length).toBe(1);
    expect(result.rankedRows.length).toBe(4);

    // Student has the highest combined coupling, inheritance, override, and method metrics
    expect(result.rankedRows[0].name).toBe("Student");
    expect(result.rankedRows[0].rank).toBe(1);
    expect(result.rankedRows[0].isCritical).toBe(true);
    expect(result.rankedRows[0].priorityLabel).toBe("ALTA (Top 20%)");

    // Remaining 3 classes are marked Normal
    expect(result.rankedRows[1].isCritical).toBe(false);
    expect(result.rankedRows[1].priorityLabel).toBe("Normal");
  });

  test("selects 2 classes out of 10 when topRatio is 20%", () => {
    const tenClasses = Array.from({ length: 10 }, (_, idx) => ({
      id: `c_${idx + 1}`,
      name: `Class${idx + 1}`,
      WMC: idx + 1,
      DIT: 0,
      NOC: 0,
      CBO: idx,
      Ce: idx,
      Ca: 0,
      RFC: idx + 1,
      LCOM: "N/A",
      NIV: 1,
      NCV: 0,
      NIM: idx + 1,
      NCM: 0,
      PIM: idx + 1,
      NMO: 0,
      NMI: 0,
      NMA: idx + 1,
      SIX: 0,
      APPM: 0
    }));

    const result = prioritizeClasses(tenClasses);
    expect(result.topCount).toBe(2);
    expect(result.criticalClasses.map((c) => c.name)).toEqual(["Class10", "Class9"]);
    expect(result.rankedRows[0].rank).toBe(1);
    expect(result.rankedRows[9].rank).toBe(10);
  });
});
