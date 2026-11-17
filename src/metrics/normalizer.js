const NUMERIC_METRIC_KEYS = [
  "WMC",
  "DIT",
  "NOC",
  "CBO",
  "Ce",
  "Ca",
  "RFC",
  "NIV",
  "NCV",
  "NIM",
  "NCM",
  "PIM",
  "NMO",
  "NMI",
  "NMA",
  "SIX",
  "APPM"
];

function roundNormalized(value, decimals = 3) {
  if (!Number.isFinite(value) || value === 0) {
    return 0;
  }
  return Number(value.toFixed(decimals));
}

/**
 * Computes { min, max } bounds for each numeric metric across all rows.
 */
function computeMinMaxBounds(metricsRows, metricKeys = NUMERIC_METRIC_KEYS) {
  const rows = Array.isArray(metricsRows) ? metricsRows : [];
  const bounds = {};

  metricKeys.forEach((key) => {
    if (rows.length === 0) {
      bounds[key] = { min: 0, max: 0 };
      return;
    }

    let min = Infinity;
    let max = -Infinity;

    rows.forEach((row) => {
      const val = row && typeof row[key] === "number" && Number.isFinite(row[key]) ? row[key] : 0;
      if (val < min) {
        min = val;
      }
      if (val > max) {
        max = val;
      }
    });

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      bounds[key] = { min: 0, max: 0 };
    } else {
      bounds[key] = { min, max };
    }
  });

  return bounds;
}

/**
 * Normalizes a single value into [0, 1] using min-max normalization.
 * Returns 0 when max === min to avoid division by zero.
 */
function minMaxNormalizeValue(value, min, max) {
  const num = typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return 0;
  }
  const raw = (num - min) / (max - min);
  if (raw <= 0) {
    return 0;
  }
  if (raw >= 1) {
    return 1;
  }
  return raw;
}

/**
 * Applies min-max normalization to all rows across the specified metricKeys.
 * Returns { bounds, rows } where each row has both exact and rounded normalized metrics.
 */
function normalizeMetrics(metricsRows, metricKeys = NUMERIC_METRIC_KEYS) {
  const rows = Array.isArray(metricsRows) ? metricsRows : [];
  const bounds = computeMinMaxBounds(rows, metricKeys);

  const normalizedRows = rows.map((row) => {
    const normalized = {};
    const normalizedRaw = {};

    metricKeys.forEach((key) => {
      const { min, max } = bounds[key] || { min: 0, max: 0 };
      const rawNorm = minMaxNormalizeValue(row[key], min, max);
      normalizedRaw[key] = rawNorm;
      normalized[key] = roundNormalized(rawNorm);
    });

    return {
      ...row,
      normalized,
      normalizedRaw
    };
  });

  return {
    bounds,
    rows: normalizedRows
  };
}

module.exports = {
  NUMERIC_METRIC_KEYS,
  roundNormalized,
  computeMinMaxBounds,
  minMaxNormalizeValue,
  normalizeMetrics
};
