type OptionLike = {
  symbol: string;
  market?: string | null;
  asset_type?: string | null;
  underlying_symbol?: string | null;
  option_type?: string | null;
  option_side?: string | null;
  strike_price?: number | string | null;
  expiration_date?: string | null;
};

function formatStrike(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  return numeric % 1 === 0 ? String(numeric) : numeric.toFixed(2).replace(/\.?0+$/, "");
}

export function isOptionItem(item: OptionLike) {
  return item.asset_type === "option";
}

export function getPortfolioItemDisplayName(item: OptionLike) {
  if (!isOptionItem(item)) {
    return item.symbol;
  }

  const base = (item.underlying_symbol ?? item.symbol).toUpperCase();
  const expiration = item.expiration_date ?? "未到期日";
  const strike = formatStrike(item.strike_price) || "未行权价";
  const optionType = item.option_type === "put" ? "Put" : item.option_type === "call" ? "Call" : "期权";

  return `${base} ${expiration} ${strike} ${optionType}`;
}

export function getPortfolioItemKindLabel(item: OptionLike) {
  return isOptionItem(item) ? "期权" : "股票";
}

export function splitPortfolioItems<T extends OptionLike>(items: T[]) {
  return {
    equityItems: items.filter((item) => !isOptionItem(item)),
    optionItems: items.filter((item) => isOptionItem(item)),
  };
}

export function getOptionSideLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    buy: "买入",
    sell: "卖出",
    long: "Long",
    short: "Short",
  };

  return value ? labels[value] ?? value : "未填写";
}
