import {
  getSnapshotEffectiveDate,
  getSnapshotTitle,
  type PortfolioItemRow,
  type PortfolioSnapshotRow,
} from "@/lib/portfolio/data";
import { getPortfolioItemDisplayName } from "@/lib/portfolio/item-display";

export type PortfolioExportFormat = "markdown" | "json" | "csv" | "text";

export type PortfolioExportSnapshot = {
  snapshot: PortfolioSnapshotRow;
  items: PortfolioItemRow[];
};

type PortfolioExportContext = {
  userDisplayName: string;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  snapshots: PortfolioExportSnapshot[];
};

function stringifyValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function csvCell(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function getSnapshotSummary(snapshot: PortfolioSnapshotRow) {
  return {
    title: getSnapshotTitle(snapshot),
    date: getSnapshotEffectiveDate(snapshot),
    note: snapshot.notes ?? "",
  };
}

function buildMarkdownExport(context: PortfolioExportContext) {
  const lines = [
    "# 持仓操作流导出",
    "",
    `- 用户：${context.userDisplayName}`,
    `- 日期区间：${context.rangeLabel}`,
    `- 快照数量：${context.snapshots.length}`,
    "- 排序方式：按快照创建时间升序",
  ];

  if (context.snapshots.length === 0) {
    lines.push("", "当前区间没有可导出的持仓快照。");
    return lines.join("\n");
  }

  context.snapshots.forEach(({ snapshot, items }, index) => {
    const summary = getSnapshotSummary(snapshot);

    lines.push("");
    lines.push(`## 快照 ${index + 1}`);
    lines.push(`- 标题：${summary.title}`);
    lines.push(`- 日期：${summary.date}`);
    lines.push(`- 备注：${summary.note || "无"}`);
    lines.push("");
    lines.push(
      "| 标的 | 资产类型 | 市场 | 上一仓位 | 当前仓位 | 操作类型 | 成本价 | 现价 | 币种 | 期权方向 | 行权价 | 到期日 | 变化原因 | 条目备注 |",
    );
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");

    if (items.length === 0) {
      lines.push("| - | - | - | - | - | - | - | - | - | - | - | - | - | - |");
      return;
    }

    items.forEach((item) => {
      lines.push(
        [
          getPortfolioItemDisplayName(item),
          item.asset_type ?? "stock",
          item.market ?? "US",
          stringifyValue(item.previous_percent) || "-",
          stringifyValue(item.position_percent) || "-",
          item.action_type ?? "-",
          stringifyValue(item.cost_price) || "-",
          stringifyValue(item.reference_price) || "-",
          item.currency ?? "-",
          item.option_type ?? "-",
          stringifyValue(item.strike_price) || "-",
          item.expiration_date ?? "-",
          item.change_reason ?? "-",
          item.note ?? "-",
        ]
          .map((cell) => ` ${cell} `)
          .join("|")
          .replace(/^/, "|")
          .concat("|"),
      );
    });
  });

  return lines.join("\n");
}

function buildJsonExport(context: PortfolioExportContext) {
  return JSON.stringify(
    {
      userDisplayName: context.userDisplayName,
      dateRange: {
        label: context.rangeLabel,
        startDate: context.startDate,
        endDate: context.endDate,
      },
      sortOrder: "created_at_asc",
      snapshots: context.snapshots.map(({ snapshot, items }) => {
        const summary = getSnapshotSummary(snapshot);

        return {
          snapshotId: snapshot.id,
          snapshotTitle: summary.title,
          snapshotDate: summary.date,
          snapshotNote: summary.note,
          createdAt: snapshot.created_at,
            items: items.map((item) => ({
            symbol: item.symbol,
            displayName: getPortfolioItemDisplayName(item),
            market: item.market ?? "US",
            assetType: item.asset_type ?? "stock",
            underlyingSymbol: item.underlying_symbol,
            optionType: item.option_type,
            optionSide: item.option_side,
            strikePrice: item.strike_price,
            expirationDate: item.expiration_date,
            contractCount: item.contract_count,
            premium: item.premium,
            previousPercent: item.previous_percent,
            positionPercent: item.position_percent,
            actionType: item.action_type,
            costPrice: item.cost_price,
            currentPrice: item.reference_price,
            referencePrice: item.reference_price,
            currency: item.currency ?? "USD",
            marginNote: item.margin_note,
            riskNote: item.risk_note,
            changeReason: item.change_reason,
            itemNote: item.note,
          })),
          equityItems: items
            .filter((item) => item.asset_type !== "option")
            .map((item) => ({
              symbol: item.symbol,
              displayName: getPortfolioItemDisplayName(item),
              market: item.market ?? "US",
              previousPercent: item.previous_percent,
              positionPercent: item.position_percent,
              actionType: item.action_type,
              costPrice: item.cost_price,
              currentPrice: item.reference_price,
              referencePrice: item.reference_price,
              currency: item.currency ?? "USD",
              changeReason: item.change_reason,
              itemNote: item.note,
            })),
          optionItems: items
            .filter((item) => item.asset_type === "option")
            .map((item) => ({
              symbol: item.symbol,
              displayName: getPortfolioItemDisplayName(item),
              market: item.market ?? "US",
              underlyingSymbol: item.underlying_symbol,
              optionType: item.option_type,
              optionSide: item.option_side,
              strikePrice: item.strike_price,
              expirationDate: item.expiration_date,
              contractCount: item.contract_count,
              premium: item.premium,
              costPrice: item.cost_price,
              currentPrice: item.reference_price,
              referencePrice: item.reference_price,
              currency: item.currency ?? "USD",
              marginNote: item.margin_note,
              riskNote: item.risk_note,
              changeReason: item.change_reason,
              itemNote: item.note,
            })),
        };
      }),
    },
    null,
    2,
  );
}

function buildCsvExport(context: PortfolioExportContext) {
  const header = [
    "user_display_name",
    "date_range_start",
    "date_range_end",
    "snapshot_title",
    "snapshot_date",
    "snapshot_note",
    "display_name",
    "symbol",
    "market",
    "asset_type",
    "underlying_symbol",
    "option_type",
    "option_side",
    "strike_price",
    "expiration_date",
    "contract_count",
    "premium",
    "previous_percent",
    "position_percent",
    "action_type",
    "cost_price",
    "current_price",
    "currency",
    "margin_note",
    "risk_note",
    "change_reason",
    "item_note",
  ];

  const rows = context.snapshots.flatMap(({ snapshot, items }) => {
    const summary = getSnapshotSummary(snapshot);

    if (items.length === 0) {
      return [
        [
          context.userDisplayName,
          context.startDate,
          context.endDate,
          summary.title,
          summary.date,
          summary.note,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ],
      ];
    }

    return items.map((item) => [
      context.userDisplayName,
      context.startDate,
      context.endDate,
      summary.title,
      summary.date,
      summary.note,
      getPortfolioItemDisplayName(item),
      item.symbol,
      item.market ?? "US",
      item.asset_type ?? "stock",
      item.underlying_symbol ?? "",
      item.option_type ?? "",
      item.option_side ?? "",
      stringifyValue(item.strike_price),
      item.expiration_date ?? "",
      stringifyValue(item.contract_count),
      stringifyValue(item.premium),
      stringifyValue(item.previous_percent),
      stringifyValue(item.position_percent),
      item.action_type ?? "",
      stringifyValue(item.cost_price),
      stringifyValue(item.reference_price),
      item.currency ?? "USD",
      item.margin_note ?? "",
      item.risk_note ?? "",
      item.change_reason ?? "",
      item.note ?? "",
    ]);
  });

  return [header, ...rows]
    .map((row) => row.map((value) => csvCell(value)).join(","))
    .join("\n");
}

function buildTextExport(context: PortfolioExportContext) {
  const lines = [
    "持仓操作流导出",
    `用户：${context.userDisplayName}`,
    `日期区间：${context.rangeLabel}`,
    `快照数量：${context.snapshots.length}`,
    "排序方式：按快照创建时间升序",
  ];

  if (context.snapshots.length === 0) {
    lines.push("当前区间没有可导出的持仓快照。");
    return lines.join("\n");
  }

  context.snapshots.forEach(({ snapshot, items }, index) => {
    const summary = getSnapshotSummary(snapshot);

    lines.push("");
    lines.push(`快照 ${index + 1}`);
    lines.push(`标题：${summary.title}`);
    lines.push(`日期：${summary.date}`);
    lines.push(`备注：${summary.note || "无"}`);

    if (items.length === 0) {
      lines.push("明细：无");
      return;
    }

    items.forEach((item, itemIndex) => {
      lines.push(
        `${itemIndex + 1}. ${getPortfolioItemDisplayName(item)} | 资产类型：${
          item.asset_type ?? "stock"
        } | 上一仓位：${stringifyValue(item.previous_percent) || "无"} | 当前仓位：${
          stringifyValue(item.position_percent) || "0"
        } | 操作类型：${item.action_type ?? "未填写"} | 成本价：${
          stringifyValue(item.cost_price) || "未填写"
        } | 现价：${stringifyValue(item.reference_price) || "未填写"} | 币种：${
          item.currency ?? "USD"
        } | 期权方向：${item.option_type ?? "无"} | 行权价：${
          stringifyValue(item.strike_price) || "无"
        } | 到期日：${item.expiration_date ?? "无"} | 变化原因：${
          item.change_reason ?? "无"
        } | 条目备注：${item.note ?? "无"}`,
      );
    });
  });

  return lines.join("\n");
}

export function buildPortfolioExportOutputs(context: PortfolioExportContext) {
  return {
    markdown: buildMarkdownExport(context),
    json: buildJsonExport(context),
    csv: buildCsvExport(context),
    text: buildTextExport(context),
  } satisfies Record<PortfolioExportFormat, string>;
}
