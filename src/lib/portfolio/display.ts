import { splitPortfolioItems } from "@/lib/portfolio/item-display";
import { formatPositionChange } from "@/lib/portfolio/position-change";
import type { PortfolioItemRow } from "@/lib/portfolio/data";

export const portfolioActionLabels: Record<string, string> = {
  new: "建仓",
  increase: "增仓",
  reduce: "减仓",
  hold: "持有",
  clear: "清仓",
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function splitPortfolioDisplayItems(items: PortfolioItemRow[]) {
  return splitPortfolioItems(items);
}

export function getTopEquityHoldings(items: PortfolioItemRow[], limit = 5) {
  const { equityItems } = splitPortfolioDisplayItems(items);

  return [...equityItems]
    .sort((a, b) => toNumber(b.position_percent) - toNumber(a.position_percent))
    .slice(0, limit);
}

export function formatPortfolioPositionChange(item: PortfolioItemRow) {
  return formatPositionChange(item.previous_percent, item.position_percent);
}

export function getActionLabel(actionType: string | null | undefined) {
  return actionType ? portfolioActionLabels[actionType] ?? actionType : null;
}

export function getOptionSummary(optionItems: PortfolioItemRow[]) {
  return optionItems.length > 0 ? `含 ${optionItems.length} 个期权持仓` : null;
}
