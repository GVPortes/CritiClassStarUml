const {
  NUMERIC_METRIC_KEYS,
  roundNormalized,
  normalizeMetrics
} = require("./normalizer");

const DEFAULT_METRIC_WEIGHTS = Object.freeze({
  WMC: 1,
  DIT: 1,
  NOC: 1,
  CBO: 1,
  Ce: 1,
  Ca: 1,
  RFC: 1,
  NIV: 1,
  NCV: 1,
  NIM: 1,
  NCM: 1,
  PIM: 1,
  NMO: 1,
  NMI: 1,
  NMA: 1,
  SIX: 1,
  APPM: 1
});

const DEFAULT_TOP_RATIO = 0.2;

function resolveWeights(customWeights = {}) {
  const resolved = { ...DEFAULT_METRIC_WEIGHTS };
  if (!customWeights || typeof customWeights !== "object") {
    return resolved;
  }

  NUMERIC_METRIC_KEYS.forEach((key) => {
    if (key in customWeights) {
      const num = Number(customWeights[key]);
      if (Number.isFinite(num) && num >= 0) {
        resolved[key] = num;
      }
    }
  });

  return resolved;
}

function calculateClassScore(normalizedRow, weights = DEFAULT_METRIC_WEIGHTS) {
  const normSource =
    (normalizedRow && (normalizedRow.normalizedRaw || normalizedRow.normalized)) || {};

  let weightedSum = 0;
  let totalWeight = 0;

  NUMERIC_METRIC_KEYS.forEach((key) => {
    const weight = typeof weights[key] === "number" && weights[key] > 0 ? weights[key] : 0;
    if (weight <= 0) {
      return;
    }
    const val = typeof normSource[key] === "number" && Number.isFinite(normSource[key]) ? normSource[key] : 0;
    weightedSum += weight * val;
    totalWeight += weight;
  });

  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return {
    score: roundNormalized(rawScore, 3),
    weightedSum: roundNormalized(weightedSum, 3),
    totalWeight: roundNormalized(totalWeight, 3)
  };
}

function comparePriorityRows(a, b) {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  if (b.weightedSum !== a.weightedSum) {
    return b.weightedSum - a.weightedSum;
  }
  if ((b.CBO || 0) !== (a.CBO || 0)) {
    return (b.CBO || 0) - (a.CBO || 0);
  }
  if ((b.RFC || 0) !== (a.RFC || 0)) {
    return (b.RFC || 0) - (a.RFC || 0);
  }
  if ((b.WMC || 0) !== (a.WMC || 0)) {
    return (b.WMC || 0) - (a.WMC || 0);
  }
  return String(a.name || "").localeCompare(String(b.name || ""));
}

/**
 * Normalizes metrics, applies configurable weights, computes criticality score,
 * ranks classes descending, and flags the Top ~20% most critical classes.
 */
function prioritizeClasses(metricsRows, options = {}) {
  const rows = Array.isArray(metricsRows) ? metricsRows : [];
  const weights = resolveWeights(options.weights);
  const rawRatio = Number(options.topRatio);
  const topRatio =
    Number.isFinite(rawRatio) && rawRatio > 0 && rawRatio <= 1
      ? rawRatio
      : DEFAULT_TOP_RATIO;

  const { bounds, rows: normalizedRows } = normalizeMetrics(rows);

  const scoredRows = normalizedRows.map((row) => {
    const { score, weightedSum, totalWeight } = calculateClassScore(row, weights);
    return {
      ...row,
      score,
      weightedSum,
      totalWeight
    };
  });

  const sortedRows = [...scoredRows].sort(comparePriorityRows);
  const topCount = sortedRows.length > 0 ? Math.max(1, Math.ceil(sortedRows.length * topRatio)) : 0;

  const rankedRows = sortedRows.map((row, index) => {
    const rank = index + 1;
    const isCritical = index < topCount;
    return {
      ...row,
      rank,
      isCritical,
      priorityLabel: isCritical ? "ALTA (Top 20%)" : "Normal"
    };
  });

  const byId = {};
  rankedRows.forEach((row) => {
    if (row.id) {
      byId[row.id] = row;
    }
  });

  return {
    weights,
    topRatio,
    topCount,
    bounds,
    rankedRows,
    criticalClasses: rankedRows.filter((row) => row.isCritical),
    byId
  };
}

module.exports = {
  DEFAULT_METRIC_WEIGHTS,
  DEFAULT_TOP_RATIO,
  resolveWeights,
  calculateClassScore,
  prioritizeClasses
};

