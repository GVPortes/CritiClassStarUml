const {
  calculateNIV,
  calculateNCV,
  calculateNIM,
  calculateNCM,
  calculatePIM,
  calculateInheritanceMethodMetrics,
  calculateAPPM,
  calculateLKMetrics
} = require("../src/metrics/lk");
const {
  createAcademicSampleModel,
  EXPECTED_ACADEMIC_METRICS
} = require("./fixtures/sampleModel");

describe("Lorenz & Kidd (L&K) Metrics", () => {
  test("matches hand-calculated values for the 4-class academic reference model", () => {
    const model = createAcademicSampleModel();
    const results = calculateLKMetrics(model);

    results.forEach((row) => {
      const expected = EXPECTED_ACADEMIC_METRICS[row.name];
      expect(row).toEqual({
        id: row.id,
        name: row.name,
        NIV: expected.NIV,
        NCV: expected.NCV,
        NIM: expected.NIM,
        NCM: expected.NCM,
        PIM: expected.PIM,
        NMO: expected.NMO,
        NMI: expected.NMI,
        NMA: expected.NMA,
        SIX: expected.SIX,
        APPM: expected.APPM
      });
    });
  });

  test("distinguishes instance vs static attributes/operations and visibility for NIV, NCV, NIM, NCM, PIM", () => {
    const cls = {
      id: "c_util",
      name: "Account",
      attributes: [
        { name: "balance", visibility: "private", isStatic: false },
        { name: "owner", visibility: "protected", isStatic: false },
        { name: "bankCode", visibility: "public", isStatic: true }
      ],
      operations: [
        { name: "deposit", visibility: "public", isStatic: false, params: [{ name: "amount", type: "Number" }] },
        { name: "audit", visibility: "private", isStatic: false, params: [] },
        { name: "fromJSON", visibility: "public", isStatic: true, params: [{ name: "raw", type: "String" }] }
      ],
      parents: [],
      relations: []
    };

    expect(calculateNIV(cls)).toBe(2);
    expect(calculateNCV(cls)).toBe(1);
    expect(calculateNIM(cls)).toBe(2);
    expect(calculateNCM(cls)).toBe(1);
    expect(calculatePIM(cls)).toBe(1);
    expect(calculateAPPM(cls)).toBe(0.667);
  });

  test("ignores private ancestor methods in NMI/NMO and handles division by zero in SIX and APPM", () => {
    const emptyClass = {
      id: "c_empty",
      name: "Empty",
      attributes: [],
      operations: [],
      parents: []
    };
    const base = {
      id: "c_base",
      name: "Base",
      attributes: [],
      operations: [
        { name: "secret", visibility: "private", isStatic: false, params: [] },
        { name: "compute", visibility: "protected", isStatic: false, params: [{ name: "x", type: "int" }] }
      ],
      parents: []
    };
    const derived = {
      id: "c_derived",
      name: "Derived",
      attributes: [],
      operations: [
        { name: "secret", visibility: "public", isStatic: false, params: [] }, // does not override private ancestor op
        { name: "compute", visibility: "public", isStatic: false, params: [{ name: "x", type: "int" }] } // overrides protected ancestor op
      ],
      parents: ["c_base"]
    };

    const emptyMetrics = calculateInheritanceMethodMetrics(emptyClass, [emptyClass]);
    expect(emptyMetrics.SIX).toBe(0);
    expect(calculateAPPM(emptyClass)).toBe(0);

    const derivedMetrics = calculateInheritanceMethodMetrics(derived, [base, derived]);
    expect(derivedMetrics.NMO).toBe(1);
    expect(derivedMetrics.NMI).toBe(0);
    expect(derivedMetrics.NMA).toBe(1);
    expect(derivedMetrics.SIX).toBe(0.5);
  });
});

