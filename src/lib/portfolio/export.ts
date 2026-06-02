import {
  getSnapshotEffectiveDate,
  getSnapshotTitle,
  type PortfolioItemRow,
  type PortfolioSnapshotRow,
} from "@/lib/portfolio/data";

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
    lines.push("| 股票 | 市场 | 上一仓位 | 当前仓位 | 操作类型 | 成本价 | 现价 | 币种 | 变化原因 | 条目备注 |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");

    if (items.length === 0) {
      lines.push("| - | - | - | - | - | - | - | - | - | - |");
      return;
    }

    items.forEach((item) => {
      lines.push(
        [
          item.symbol,
          item.market ?? "US",
          stringifyValue(item.previous_percent) || "-",
          stringifyValue(item.position_percent) || "-",
          item.action_type ?? "-",
          stringifyValue(item.cost_price) || "-",
          stringifyValue(item.reference_price) || "-",
          item.currency ?? "-",
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
    "symbol",
    "market",
    "previous_percent",
    "position_percent",
    "action_type",
    "cost_price",
    "current_price",
    "currency",
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
      item.symbol,
      item.market ?? "US",
      stringifyValue(item.previous_percent),
      stringifyValue(item.position_percent),
      item.action_type ?? "",
      stringifyValue(item.cost_price),
      stringifyValue(item.reference_price),
      item.currency ?? "USD",
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
        `${itemIndex + 1}. ${item.symbol} (${item.market ?? "US"}) | 上一仓位：${
          stringifyValue(item.previous_percent) || "无"
        } | 当前仓位：${stringifyValue(item.position_percent) || "0"} | 操作类型：${
          item.action_type ?? "未填写"
        } | 成本价：${stringifyValue(item.cost_price) || "未填写"} | 现价：${
          stringifyValue(item.reference_price) || "未填写"
        } | 币种：${item.currency ?? "USD"} | 变化原因：${item.change_reason ?? "无"} | 条目备注：${
          item.note ?? "无"
        }`,
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
