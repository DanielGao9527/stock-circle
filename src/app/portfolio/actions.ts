"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/profiles/ensure-profile";
import { getOrCreateStockId } from "@/lib/stocks/get-or-create-stock";
import { createClient } from "@/lib/supabase/server";

export type PortfolioSnapshotActionState = {
  error?: string;
};

type CreatedSnapshotRow = {
  id: string;
};

type ParsedItem = {
  symbol: string;
  market: string;
  positionPercent: number;
  costPrice: number | null;
  referencePrice: number | null;
  currency: string;
  note: string | null;
};

function normalizeText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function normalizeNumber(value: FormDataEntryValue | null) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function getStringValue(values: FormDataEntryValue[], index: number) {
  const value = values[index];
  return typeof value === "string" ? value : "";
}

function parseItems(formData: FormData): ParsedItem[] | { error: string } {
  const symbols = formData.getAll("symbol");
  const markets = formData.getAll("market");
  const positionPercents = formData.getAll("position_percent");
  const costPrices = formData.getAll("cost_price");
  const referencePrices = formData.getAll("reference_price");
  const currencies = formData.getAll("currency");
  const notes = formData.getAll("item_note");

  const items = symbols
    .map((_, index) => {
      const symbol = getStringValue(symbols, index).trim().toUpperCase();
      const market = getStringValue(markets, index).trim().toUpperCase() || "US";
      const positionPercent = normalizeNumber(positionPercents[index]);
      const costPrice = normalizeNumber(costPrices[index]);
      const referencePrice = normalizeNumber(referencePrices[index]);
      const currency = getStringValue(currencies, index).trim().toUpperCase() || "USD";
      const note = normalizeText(notes[index] ?? null);

      return {
        symbol,
        market,
        positionPercent,
        costPrice,
        referencePrice,
        currency,
        note,
        hasAnyValue:
          symbol ||
          positionPercent !== null ||
          costPrice !== null ||
          referencePrice !== null ||
          note !== null,
      };
    })
    .filter((item) => item.hasAnyValue);

  if (items.length === 0) {
    return { error: "请至少添加一条持仓明细。" };
  }

  const invalidItem = items.find((item) => !item.symbol || item.positionPercent === null);

  if (invalidItem) {
    return { error: "每条持仓明细都需要填写股票代码和仓位百分比。" };
  }

  return items.map(({ hasAnyValue: _hasAnyValue, ...item }) => item as ParsedItem);
}

export async function createPortfolioSnapshot(
  _previousState: PortfolioSnapshotActionState,
  formData: FormData,
): Promise<PortfolioSnapshotActionState> {
  const title = normalizeText(formData.get("title"));
  const notes = normalizeText(formData.get("note"));
  const parsedItems = parseItems(formData);

  if ("error" in parsedItems) {
    return { error: parsedItems.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio");
  }

  await ensureProfile(supabase, user);

  let snapshotId: string;

  try {
    const { data: createdSnapshot, error: snapshotError } = await supabase
      .from("portfolio_snapshots")
      .insert({
        owner_id: user.id,
        created_by: user.id,
        title,
        notes,
      })
      .select("id")
      .single();

    if (snapshotError) {
      throw new Error(snapshotError.message);
    }

    snapshotId = (createdSnapshot as CreatedSnapshotRow).id;

    const portfolioItems = await Promise.all(
      parsedItems.map(async (item) => {
        const stockId = await getOrCreateStockId(supabase, item.symbol, item.market);

        return {
          snapshot_id: snapshotId,
          stock_id: stockId,
          symbol: item.symbol,
          market: item.market,
          position_percent: item.positionPercent,
          cost_price: item.costPrice,
          reference_price: item.referencePrice,
          currency: item.currency,
          note: item.note,
        };
      }),
    );

    const { error: itemError } = await supabase.from("portfolio_items").insert(portfolioItems);

    if (itemError) {
      throw new Error(itemError.message);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "创建持仓快照失败，请稍后重试。",
    };
  }

  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/stocks");
  redirect(`/portfolio/snapshots/${snapshotId}`);
}
