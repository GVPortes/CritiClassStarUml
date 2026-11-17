function getOperationSignature(op) {
  if (!op) {
    return "";
  }
  const name = (op.name || "").trim();
  const params = Array.isArray(op.params) ? op.params : [];
  const paramTypes = params
    .map((p) => ((p && p.type) || "").trim().toLowerCase())
    .join(",");
  return `${name}(${params.length}:${paramTypes})`;
}

function buildClassMap(allClasses, extraTargetsById = {}) {
  const map = new Map();
  if (Array.isArray(allClasses)) {
    allClasses.forEach((cls) => {
      if (cls && cls.id) {
        map.set(cls.id, cls);
      }
    });
  }
  if (extraTargetsById && typeof extraTargetsById === "object") {
    Object.values(extraTargetsById).forEach((target) => {
      if (target && target.id && !map.has(target.id)) {
        map.set(target.id, target);
      }
    });
  }
  return map;
}

/**
 * WMC: Weighted Methods per Class.
 * Default weight is 1 per operation; accepts an optional weightFn(op) extension point.
 */
function calculateWMC(cls, weightFn = () => 1) {
  const operations = cls && Array.isArray(cls.operations) ? cls.operations : [];
  return operations.reduce((total, op) => total + Number(weightFn(op) || 0), 0);
}

/**
 * DIT: Depth of Inheritance Tree.
 * Longest path from the class to the root via Generalization (parents).
 * Supports multiple inheritance and protects against cycles.
 */
function calculateDIT(cls, classesById) {
  if (!cls || !cls.id) {
    return 0;
  }

  const map = classesById instanceof Map ? classesById : buildClassMap(classesById);

  function longestPathToRoot(currentId, pathVisited) {
    const current = map.get(currentId);
    if (!current || !Array.isArray(current.parents) || current.parents.length === 0) {
      return 0;
    }

    let maxDepth = 0;
    for (const parentId of current.parents) {
      if (!parentId || parentId === currentId || pathVisited.has(parentId)) {
        continue;
      }
      if (!map.has(parentId)) {
        continue;
      }
      const nextVisited = new Set(pathVisited);
      nextVisited.add(parentId);
      const depth = 1 + longestPathToRoot(parentId, nextVisited);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }

    return maxDepth;
  }

  return longestPathToRoot(cls.id, new Set([cls.id]));
}

/**
 * NOC: Number of Children (direct subclasses).
 */
function calculateNOC(cls, allClasses) {
  if (!cls || !cls.id || !Array.isArray(allClasses)) {
    return 0;
  }

  const directChildren = new Set();
  allClasses.forEach((candidate) => {
    if (!candidate || !candidate.id || candidate.id === cls.id) {
      return;
    }
    if (Array.isArray(candidate.parents) && candidate.parents.includes(cls.id)) {
      directChildren.add(candidate.id);
    }
  });

  return directChildren.size;
}

/**
 * Coupling metrics:
 * - CBO: distinct coupled classes/interfaces in either direction (excluding self and Generalization)
 * - Ce: distinct outgoing coupled classes/interfaces (direction === "out")
 * - Ca: distinct incoming coupled classes/interfaces (direction === "in")
 */
function calculateCoupling(cls) {
  const coupledAll = new Set();
  const coupledOut = new Set();
  const coupledIn = new Set();

  const relations = cls && Array.isArray(cls.relations) ? cls.relations : [];
  relations.forEach((rel) => {
    if (!rel || !rel.targetId || rel.targetId === cls.id) {
      return;
    }
    if (rel.kind === "generalization") {
      return;
    }

    coupledAll.add(rel.targetId);
    if (rel.direction === "out") {
      coupledOut.add(rel.targetId);
    } else if (rel.direction === "in") {
      coupledIn.add(rel.targetId);
    }
  });

  return {
    CBO: coupledAll.size,
    Ce: coupledOut.size,
    Ca: coupledIn.size,
    coupledTargetIds: Array.from(coupledAll)
  };
}

/**
 * RFC (approximation):
 * Own operations + distinct operations of directly coupled classes/interfaces.
 */
function calculateRFC(cls, classesById) {
  if (!cls) {
    return 0;
  }

  const map = classesById instanceof Map ? classesById : buildClassMap(classesById);
  const ownOperations = Array.isArray(cls.operations) ? cls.operations : [];
  const { coupledTargetIds } = calculateCoupling(cls);

  let remoteOperationsCount = 0;
  coupledTargetIds.forEach((targetId) => {
    const targetClassifier = map.get(targetId);
    if (!targetClassifier || !Array.isArray(targetClassifier.operations)) {
      return;
    }
    const distinctTargetOps = new Set();
    targetClassifier.operations.forEach((op) => {
      distinctTargetOps.add(getOperationSignature(op));
    });
    remoteOperationsCount += distinctTargetOps.size;
  });

  return ownOperations.length + remoteOperationsCount;
}

/**
 * LCOM: Not calculable from class diagram alone (no method body / attribute access graph).
 */
function calculateLCOM() {
  return "N/A";
}

function calculateCKMetricsForClass(cls, allClasses, options = {}) {
  const classesById =
    options.classesById instanceof Map
      ? options.classesById
      : buildClassMap(allClasses, options.targetsById);

  const WMC = calculateWMC(cls, options.weightFn);
  const DIT = calculateDIT(cls, classesById);
  const NOC = calculateNOC(cls, allClasses);
  const { CBO, Ce, Ca } = calculateCoupling(cls);
  const RFC = calculateRFC(cls, classesById);
  const LCOM = calculateLCOM();

  return {
    WMC,
    DIT,
    NOC,
    CBO,
    Ce,
    Ca,
    RFC,
    LCOM
  };
}

function calculateCKMetrics(allClasses, options = {}) {
  const classes = Array.isArray(allClasses) ? allClasses : [];
  const classesById = buildClassMap(classes, options.targetsById);

  return classes.map((cls) => ({
    id: cls.id,
    name: cls.name || "(sem nome)",
    ...calculateCKMetricsForClass(cls, classes, {
      ...options,
      classesById
    })
  }));
}

module.exports = {
  getOperationSignature,
  buildClassMap,
  calculateWMC,
  calculateDIT,
  calculateNOC,
  calculateCoupling,
  calculateRFC,
  calculateLCOM,
  calculateCKMetricsForClass,
  calculateCKMetrics
};
