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

type OwnedSnapshotRow = {
  id: string;
  owner_id: string;
};

type ParsedItem = {
  symbol: string;
  market: string;
  assetType: "stock" | "option";
  underlyingSymbol: string | null;
  optionType: "call" | "put" | null;
  strikePrice: number | null;
  expirationDate: string | null;
  previousPercent: number | null;
  positionPercent: number;
  actionType: string;
  changeReason: string | null;
  costPrice: number | null;
  referencePrice: number | null;
  currency: string;
  note: string | null;
};

const actionTypes = ["new", "increase", "reduce", "hold", "clear"] as const;
const assetTypes = ["stock", "option"] as const;
const optionTypes = ["call", "put"] as const;

function isActionType(value: string): value is (typeof actionTypes)[number] {
  return actionTypes.includes(value as (typeof actionTypes)[number]);
}

function isAssetType(value: string): value is (typeof assetTypes)[number] {
  return assetTypes.includes(value as (typeof assetTypes)[number]);
}

function isOptionType(value: string): value is (typeof optionTypes)[number] {
  return optionTypes.includes(value as (typeof optionTypes)[number]);
}

function inferActionType(previousPercent: number | null, positionPercent: number) {
  if (positionPercent === 0) {
    return "clear";
  }

  if (previousPercent === null && positionPercent > 0) {
    return "new";
  }

  if (previousPercent !== null && positionPercent > previousPercent) {
    return "increase";
  }

  if (previousPercent !== null && positionPercent < previousPercent && positionPercent > 0) {
    return "reduce";
  }

  return "hold";
}

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

function normalizeDateText(value: FormDataEntryValue | null) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function getStringValue(values: FormDataEntryValue[], index: number) {
  const value = values[index];
  return typeof value === "string" ? value : "";
}

function parseItems(formData: FormData): ParsedItem[] | { error: string } {
  const symbols = formData.getAll("symbol");
  const markets = formData.getAll("market");
  const assetTypeValues = formData.getAll("asset_type");
  const underlyingSymbols = formData.getAll("underlying_symbol");
  const optionTypeValues = formData.getAll("option_type");
  const strikePrices = formData.getAll("strike_price");
  const expirationDates = formData.getAll("expiration_date");
  const previousPercents = formData.getAll("previous_percent");
  const positionPercents = formData.getAll("position_percent");
  const actionTypeValues = formData.getAll("action_type");
  const changeReasons = formData.getAll("change_reason");
  const costPrices = formData.getAll("cost_price");
  const referencePrices = formData.getAll("reference_price");
  const currencies = formData.getAll("currency");
  const notes = formData.getAll("item_note");

  const items = symbols
    .map((_, index) => {
      const symbol = getStringValue(symbols, index).trim().toUpperCase();
      const market = getStringValue(markets, index).trim().toUpperCase() || "US";
      const rawAssetType = getStringValue(assetTypeValues, index).trim().toLowerCase();
      const assetType = isAssetType(rawAssetType) ? rawAssetType : "stock";
      const typedUnderlyingSymbol = getStringValue(underlyingSymbols, index).trim().toUpperCase();
      const underlyingSymbol = typedUnderlyingSymbol || symbol || null;
      const rawOptionType = getStringValue(optionTypeValues, index).trim().toLowerCase();
      const optionType = isOptionType(rawOptionType) ? rawOptionType : null;
      const strikePrice = normalizeNumber(strikePrices[index]);
      const expirationDate = normalizeDateText(expirationDates[index]);
      const previousPercent = normalizeNumber(previousPercents[index]);
      const positionPercent = normalizeNumber(positionPercents[index]);
      const rawActionType = getStringValue(actionTypeValues, index).trim();
      const costPrice = normalizeNumber(costPrices[index]);
      const referencePrice = normalizeNumber(referencePrices[index]);
      const currency = getStringValue(currencies, index).trim().toUpperCase() || "USD";
      const changeReason = normalizeText(changeReasons[index] ?? null);
      const note = normalizeText(notes[index] ?? null);
      const actionType =
        rawActionType && isActionType(rawActionType)
          ? rawActionType
          : positionPercent === null
            ? ""
            : inferActionType(previousPercent, positionPercent);

      return {
        symbol,
        market,
        assetType,
        rawAssetType,
        underlyingSymbol,
        rawOptionType,
        optionType,
        strikePrice,
        expirationDate,
        previousPercent,
        positionPercent,
        actionType,
        rawActionType,
        changeReason,
        costPrice,
        referencePrice,
        currency,
        note,
        hasAnyValue:
          symbol ||
          rawAssetType ||
          typedUnderlyingSymbol ||
          rawOptionType ||
          strikePrice !== null ||
          expirationDate !== null ||
          previousPercent !== null ||
          positionPercent !== null ||
          rawActionType ||
          changeReason !== null ||
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
    return { error: "每条持仓明细都需要填写代码和仓位百分比。" };
  }

  const invalidAssetType = items.find((item) => item.rawAssetType && !isAssetType(item.rawAssetType));

  if (invalidAssetType) {
    return { error: "资产类型只能是 stock 或 option。" };
  }

  const invalidActionType = items.find(
    (item) => item.rawActionType && !isActionType(item.rawActionType),
  );

  if (invalidActionType) {
    return { error: "操作类型只能是 new、increase、reduce、hold 或 clear。" };
  }

  const invalidOptionType = items.find(
    (item) => item.assetType === "option" && item.rawOptionType && !isOptionType(item.rawOptionType),
  );

  if (invalidOptionType) {
    return { error: "期权方向只能是 call 或 put。" };
  }

  const invalidOptionItem = items.find(
    (item) =>
      item.assetType === "option" &&
      (!item.underlyingSymbol || !item.optionType || item.strikePrice === null || !item.expirationDate),
  );

  if (invalidOptionItem) {
    return { error: "期权持仓需要填写标的代码、到期日、行权价和 Call/Put。" };
  }

  return items.map((item) => ({
    symbol: item.assetType === "option" ? item.underlyingSymbol ?? item.symbol : item.symbol,
    market: item.market,
    assetType: item.assetType,
    underlyingSymbol: item.assetType === "option" ? item.underlyingSymbol ?? item.symbol : item.symbol,
    optionType: item.assetType === "option" ? item.optionType : null,
    strikePrice: item.assetType === "option" ? item.strikePrice : null,
    expirationDate: item.assetType === "option" ? item.expirationDate : null,
    previousPercent: item.previousPercent,
    positionPercent: item.positionPercent!,
    actionType: item.actionType,
    changeReason: item.changeReason,
    costPrice: item.costPrice,
    referencePrice: item.referencePrice,
    currency: item.currency,
    note: item.note,
  }));
}

function buildPortfolioItemPayload(
  snapshotId: string,
  stockId: string,
  item: ParsedItem,
) {
  return {
    snapshot_id: snapshotId,
    stock_id: stockId,
    symbol: item.symbol,
    market: item.market,
    asset_type: item.assetType,
    underlying_symbol: item.underlyingSymbol,
    option_type: item.optionType,
    strike_price: item.strikePrice,
    expiration_date: item.expirationDate,
    previous_percent: item.previousPercent,
    position_percent: item.positionPercent,
    action_type: item.actionType,
    change_reason: item.changeReason,
    cost_price: item.costPrice,
    reference_price: item.referencePrice,
    currency: item.currency,
    note: item.note,
  };
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
        status: "published",
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
        return buildPortfolioItemPayload(snapshotId, stockId, item);
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

async function getOwnedActiveSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  snapshotId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("id,owner_id")
    .eq("id", snapshotId)
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .neq("status", "hidden")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as OwnedSnapshotRow | null;
}

export async function updatePortfolioSnapshot(
  _previousState: PortfolioSnapshotActionState,
  formData: FormData,
): Promise<PortfolioSnapshotActionState> {
  const snapshotId = normalizeText(formData.get("snapshot_id"));
  const title = normalizeText(formData.get("title"));
  const notes = normalizeText(formData.get("note"));
  const parsedItems = parseItems(formData);

  if (!snapshotId) {
    return { error: "缺少持仓快照 ID。" };
  }

  if ("error" in parsedItems) {
    return { error: parsedItems.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/portfolio/snapshots/${snapshotId}/edit`);
  }

  try {
    const snapshot = await getOwnedActiveSnapshot(supabase, snapshotId, user.id);

    if (!snapshot) {
      return { error: "你只能编辑自己创建且未删除的持仓快照。" };
    }

    const { error: snapshotError } = await supabase
      .from("portfolio_snapshots")
      .update({
        title,
        notes,
        status: "published",
        is_deleted: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", snapshotId)
      .eq("owner_id", user.id);

    if (snapshotError) {
      throw new Error(snapshotError.message);
    }

    const { error: deleteItemsError } = await supabase
      .from("portfolio_items")
      .delete()
      .eq("snapshot_id", snapshotId);

    if (deleteItemsError) {
      throw new Error(deleteItemsError.message);
    }

    const portfolioItems = await Promise.all(
      parsedItems.map(async (item) => {
        const stockId = await getOrCreateStockId(supabase, item.symbol, item.market);
        return buildPortfolioItemPayload(snapshotId, stockId, item);
      }),
    );

    const { error: itemError } = await supabase.from("portfolio_items").insert(portfolioItems);

    if (itemError) {
      throw new Error(itemError.message);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "保存持仓快照失败，请稍后重试。",
    };
  }

  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/stocks");
  revalidatePath(`/portfolio/snapshots/${snapshotId}`);
  redirect(`/portfolio/snapshots/${snapshotId}`);
}

export async function deletePortfolioSnapshot(formData: FormData) {
  const snapshotId = normalizeText(formData.get("snapshot_id"));

  if (!snapshotId) {
    redirect("/portfolio");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio");
  }

  const snapshot = await getOwnedActiveSnapshot(supabase, snapshotId, user.id);

  if (snapshot) {
    await supabase
      .from("portfolio_snapshots")
      .update({
        deleted_at: new Date().toISOString(),
        status: "hidden",
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", snapshotId)
      .eq("owner_id", user.id);
  }

  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/stocks");
  redirect("/portfolio");
}
