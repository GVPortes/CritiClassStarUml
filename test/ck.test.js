const {
  calculateWMC,
  calculateDIT,
  calculateNOC,
  calculateCoupling,
  calculateRFC,
  calculateLCOM,
  calculateCKMetrics
} = require("../src/metrics/ck");
const {
  createAcademicSampleModel,
  EXPECTED_ACADEMIC_METRICS
} = require("./fixtures/sampleModel");

describe("Chidamber & Kemerer (C&K) Metrics", () => {
  test("matches hand-calculated values for the 4-class academic reference model", () => {
    const model = createAcademicSampleModel();
    const results = calculateCKMetrics(model);

    results.forEach((row) => {
      const expected = EXPECTED_ACADEMIC_METRICS[row.name];
      expect(row).toEqual({
        id: row.id,
        name: row.name,
        WMC: expected.WMC,
        DIT: expected.DIT,
        NOC: expected.NOC,
        CBO: expected.CBO,
        Ce: expected.Ce,
        Ca: expected.Ca,
        RFC: expected.RFC,
        LCOM: expected.LCOM
      });
    });
  });

  test("supports custom operation weight function in WMC", () => {
    const cls = {
      id: "c1",
      name: "Service",
      operations: [
        { name: "op1", params: [] },
        { name: "op2", params: [{ name: "a" }, { name: "b" }] }
      ]
    };

    expect(calculateWMC(cls)).toBe(2);
    expect(calculateWMC(cls, (op) => 1 + op.params.length)).toBe(4);
  });

  test("takes longest path to root in multiple inheritance for DIT", () => {
    const classes = [
      { id: "root", name: "Root", parents: [] },
      { id: "mid", name: "Mid", parents: ["root"] },
      { id: "shortBase", name: "ShortBase", parents: [] },
      { id: "leaf", name: "Leaf", parents: ["shortBase", "mid"] }
    ];

    expect(calculateDIT(classes[3], classes)).toBe(2);
  });

  test("protects against direct and indirect inheritance cycles in DIT", () => {
    const cyclicClasses = [
      { id: "a", name: "A", parents: ["b"] },
      { id: "b", name: "B", parents: ["c"] },
      { id: "c", name: "C", parents: ["a"] }
    ];

    expect(() => calculateDIT(cyclicClasses[0], cyclicClasses)).not.toThrow();
    expect(calculateDIT(cyclicClasses[0], cyclicClasses)).toBe(2);
  });

  test("counts distinct coupled targets across association, aggregation, composition, dependency, and interfaceRealization", () => {
    const iface = {
      id: "i_repo",
      name: "IRepository",
      operations: [{ name: "save", params: [] }]
    };
    const helper = {
      id: "c_helper",
      name: "Helper",
      operations: [
        { name: "assist", params: [] },
        { name: "validate", params: [] }
      ]
    };
    const client = {
      id: "c_client",
      name: "Client",
      operations: [{ name: "run", params: [] }],
      parents: ["c_helper"], // Generalization must NOT count for CBO
      relations: [
        { kind: "interfaceRealization", targetId: "i_repo", direction: "out" },
        { kind: "dependency", targetId: "c_helper", direction: "out" },
        { kind: "aggregation", targetId: "c_helper", direction: "in" },
        { kind: "association", targetId: "c_client", direction: "out" } // self-relation ignored
      ]
    };

    const coupling = calculateCoupling(client);
    expect(coupling.CBO).toBe(2);
    expect(coupling.Ce).toBe(2);
    expect(coupling.Ca).toBe(1);

    const rfc = calculateRFC(client, [client, helper, iface]);
    expect(rfc).toBe(4); // 1 own + 1 from IRepository + 2 from Helper
    expect(calculateLCOM()).toBe("N/A");
    expect(calculateNOC(helper, [client, helper])).toBe(1);
  });
});

