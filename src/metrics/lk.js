const {
  getOperationSignature,
  buildClassMap,
  calculateDIT
} = require("./ck");

function roundMetric(value, decimals = 3) {
  if (!Number.isFinite(value) || value === 0) {
    return 0;
  }
  return Number(value.toFixed(decimals));
}

function collectAncestorIds(cls, classesById) {
  const ancestors = new Set();
  if (!cls || !cls.id) {
    return ancestors;
  }

  function visit(currentId) {
    const current = classesById.get(currentId);
    if (!current || !Array.isArray(current.parents)) {
      return;
    }
    current.parents.forEach((parentId) => {
      if (!parentId || parentId === cls.id || ancestors.has(parentId)) {
        return;
      }
      if (!classesById.has(parentId)) {
        return;
      }
      ancestors.add(parentId);
      visit(parentId);
    });
  }

  visit(cls.id);
  return ancestors;
}

function collectInheritableAncestorSignatures(cls, classesById) {
  const ancestorIds = collectAncestorIds(cls, classesById);
  const signatures = new Set();

  ancestorIds.forEach((ancestorId) => {
    const ancestor = classesById.get(ancestorId);
    if (!ancestor || !Array.isArray(ancestor.operations)) {
      return;
    }
    ancestor.operations.forEach((op) => {
      if (!op || op.isStatic) {
        return;
      }
      const visibility = op.visibility || "public";
      if (visibility === "private") {
        return;
      }
      signatures.add(getOperationSignature(op));
    });
  });

  return signatures;
}

function calculateNIV(cls) {
  const attributes = cls && Array.isArray(cls.attributes) ? cls.attributes : [];
  return attributes.filter((attr) => attr && !attr.isStatic).length;
}

function calculateNCV(cls) {
  const attributes = cls && Array.isArray(cls.attributes) ? cls.attributes : [];
  return attributes.filter((attr) => attr && Boolean(attr.isStatic)).length;
}

function calculateNIM(cls) {
  const operations = cls && Array.isArray(cls.operations) ? cls.operations : [];
  return operations.filter((op) => op && !op.isStatic).length;
}

function calculateNCM(cls) {
  const operations = cls && Array.isArray(cls.operations) ? cls.operations : [];
  return operations.filter((op) => op && Boolean(op.isStatic)).length;
}

function calculatePIM(cls) {
  const operations = cls && Array.isArray(cls.operations) ? cls.operations : [];
  return operations.filter(
    (op) => op && !op.isStatic && (op.visibility || "public") === "public"
  ).length;
}

function calculateInheritanceMethodMetrics(cls, classesById) {
  const map = classesById instanceof Map ? classesById : buildClassMap(classesById);
  const inheritableSignatures = collectInheritableAncestorSignatures(cls, map);

  const operations = cls && Array.isArray(cls.operations) ? cls.operations : [];
  const instanceOperations = operations.filter((op) => op && !op.isStatic);
  const NIM = instanceOperations.length;

  const overriddenSignatures = new Set();
  instanceOperations.forEach((op) => {
    const sig = getOperationSignature(op);
    if (inheritableSignatures.has(sig)) {
      overriddenSignatures.add(sig);
    }
  });

  const NMO = overriddenSignatures.size;
  let NMI = 0;
  inheritableSignatures.forEach((sig) => {
    if (!overriddenSignatures.has(sig)) {
      NMI++;
    }
  });

  const NMA = Math.max(0, NIM - NMO);
  const DIT = calculateDIT(cls, map);
  const totalMethods = NMO + NMA + NMI;
  const SIX = totalMethods > 0 ? roundMetric((NMO * DIT) / totalMethods) : 0;

  return {
    NIM,
    NMO,
    NMI,
    NMA,
    SIX
  };
}

function calculateAPPM(cls) {
  const operations = cls && Array.isArray(cls.operations) ? cls.operations : [];
  if (operations.length === 0) {
    return 0;
  }

  const totalParams = operations.reduce((sum, op) => {
    const params = op && Array.isArray(op.params) ? op.params : [];
    const nonReturnParams = params.filter((p) => !p || p.direction !== "return");
    return sum + nonReturnParams.length;
  }, 0);

  return roundMetric(totalParams / operations.length);
}

function calculateLKMetricsForClass(cls, allClasses, options = {}) {
  const classesById =
    options.classesById instanceof Map
      ? options.classesById
      : buildClassMap(allClasses, options.targetsById);

  const NIV = calculateNIV(cls);
  const NCV = calculateNCV(cls);
  const NCM = calculateNCM(cls);
  const PIM = calculatePIM(cls);
  const { NIM, NMO, NMI, NMA, SIX } = calculateInheritanceMethodMetrics(cls, classesById);
  const APPM = calculateAPPM(cls);

  return {
    NIV,
    NCV,
    NIM,
    NCM,
    PIM,
    NMO,
    NMI,
    NMA,
    SIX,
    APPM
  };
}

function calculateLKMetrics(allClasses, options = {}) {
  const classes = Array.isArray(allClasses) ? allClasses : [];
  const classesById = buildClassMap(classes, options.targetsById);

  return classes.map((cls) => ({
    id: cls.id,
    name: cls.name || "(sem nome)",
    ...calculateLKMetricsForClass(cls, classes, {
      ...options,
      classesById
    })
  }));
}

module.exports = {
  calculateNIV,
  calculateNCV,
  calculateNIM,
  calculateNCM,
  calculatePIM,
  calculateInheritanceMethodMetrics,
  calculateAPPM,
  calculateLKMetricsForClass,
  calculateLKMetrics
};

