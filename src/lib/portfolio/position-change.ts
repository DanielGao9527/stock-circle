export const actionTypeLabels: Record<string, string> = {
  new: "新建",
  increase: "加仓",
  reduce: "减仓",
  hold: "持有不变",
  clear: "清仓",
};

function formatPercentValue(value: number | string | null) {
  if (value === null || value === "") {
    return null;
  }

  return `${value}%`;
}

/**
 * Formats a position change as "10% -> 15%" or a single current value.
 */
export function formatPositionChange(
  previousPercent: number | string | null,
  positionPercent: number | string,
) {
  const previous = formatPercentValue(previousPercent);
  const current = formatPercentValue(positionPercent) ?? "0%";

  return previous ? `${previous} → ${current}` : current;
}
