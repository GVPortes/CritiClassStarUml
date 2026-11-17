const {
  DEFAULT_METRIC_WEIGHTS,
  resolveWeights,
  prioritizeClasses
} = require("../src/metrics/prioritizer");
const { parseWeightsInput } = require("../main");
const { collectAllMetrics } = require("../src/exporter");
const { createAcademicSampleModel } = require("./fixtures/sampleModel");

describe("Class Prioritizer — Weights, Criticality Score, Ranking and Top 20% (Phase 2)", () => {
  test("ranks the 4-class academic reference model and selects Top 20% (ceil(4 * 0.2) = 1 class)", () => {
    const model = createAcademicSampleModel();
    const metricsRows = collectAllMetrics(model);
    const result = prioritizeClasses(metricsRows);

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

  test("supports custom metric weights to shift prioritization focus", () => {
    const model = createAcademicSampleModel();
    const metricsRows = collectAllMetrics(model);

    // Weight ONLY NOC (where Person = 2 and others = 0)
    const zeroWeights = {};
    Object.keys(DEFAULT_METRIC_WEIGHTS).forEach((k) => {
      zeroWeights[k] = 0;
    });
    const nocOnlyWeights = resolveWeights({ ...zeroWeights, NOC: 10 });

    const result = prioritizeClasses(metricsRows, { weights: nocOnlyWeights });
    expect(result.rankedRows[0].name).toBe("Person");
    expect(result.rankedRows[0].score).toBe(1);
    expect(result.rankedRows[1].score).toBe(0);
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

  test("parseWeightsInput parses key=value pairs and JSON weight strings", () => {
    const parsedKv = parseWeightsInput("WMC=2.5, cbo=3; DIT=0", DEFAULT_METRIC_WEIGHTS);
    expect(parsedKv.WMC).toBe(2.5);
    expect(parsedKv.CBO).toBe(3);
    expect(parsedKv.DIT).toBe(0);
    expect(parsedKv.RFC).toBe(1);

    const parsedJson = parseWeightsInput('{"RFC": 4, "SIX": 2}', DEFAULT_METRIC_WEIGHTS);
    expect(parsedJson.RFC).toBe(4);
    expect(parsedJson.SIX).toBe(2);
  });
});
