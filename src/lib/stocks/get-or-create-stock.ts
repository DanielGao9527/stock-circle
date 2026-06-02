import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type StockRow = {
  id: string;
};

/**
 * Finds an existing stock by symbol and market, or creates it when missing.
 */
export async function getOrCreateStockId(
  supabase: SupabaseServerClient,
  symbol: string,
  market: string,
) {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const normalizedMarket = market.trim().toUpperCase();

  const { data: existingStock, error: selectError } = await supabase
    .from("stocks")
    .select("id")
    .eq("symbol", normalizedSymbol)
    .eq("market", normalizedMarket)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existingStock) {
    return (existingStock as StockRow).id;
  }

  const { data: createdStock, error: insertError } = await supabase
    .from("stocks")
    .insert({ symbol: normalizedSymbol, market: normalizedMarket })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: duplicatedStock, error: retryError } = await supabase
        .from("stocks")
        .select("id")
        .eq("symbol", normalizedSymbol)
        .eq("market", normalizedMarket)
        .single();

      if (retryError) {
        throw new Error(retryError.message);
      }

      return (duplicatedStock as StockRow).id;
    }

    throw new Error(insertError.message);
  }

  return (createdStock as StockRow).id;
}
