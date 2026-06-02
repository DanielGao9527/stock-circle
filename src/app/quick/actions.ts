"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/profiles/ensure-profile";
import { getOrCreateStockId } from "@/lib/stocks/get-or-create-stock";
import { createClient } from "@/lib/supabase/server";
import { postTypes, type PostType, type QuickPostActionState } from "@/lib/posts/types";

type CreatedPostRow = {
  id: string;
};

type SymbolMarketInput = {
  symbol?: unknown;
  market?: unknown;
};

function normalizeText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function normalizeSymbolList(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value : "";
  const symbols = raw
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  return Array.from(new Set(symbols));
}

function parseSymbolMarketMap(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim() : "";
  const symbolMarketMap = new Map<string, string>();

  if (!raw) {
    return symbolMarketMap;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return symbolMarketMap;
    }

    parsed.forEach((item: SymbolMarketInput | null) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const symbol = typeof item.symbol === "string" ? item.symbol.trim().toUpperCase() : "";
      const market = typeof item.market === "string" ? item.market.trim().toUpperCase() : "";

      if (symbol && market) {
        symbolMarketMap.set(symbol, market);
      }
    });
  } catch {
    return symbolMarketMap;
  }

  return symbolMarketMap;
}

function isValidPostType(value: string): value is PostType {
  return postTypes.includes(value as PostType);
}

function normalizeOptionalUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeOptionalPrice(value: string | null) {
  if (!value) {
    return null;
  }

  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export async function createQuickPost(
  _previousState: QuickPostActionState,
  formData: FormData,
): Promise<QuickPostActionState> {
  const title = normalizeText(formData.get("title"));
  const content = normalizeText(formData.get("content"));
  const rawPostType = normalizeText(formData.get("post_type"));
  const sourceUrl = normalizeOptionalUrl(normalizeText(formData.get("source_url")));
  const symbols = normalizeSymbolList(formData.get("symbols"));
  const symbolMarketMap = parseSymbolMarketMap(formData.get("symbol_markets"));
  const market = normalizeText(formData.get("market"))?.toUpperCase() ?? "US";
  const referencePrice = normalizeOptionalPrice(normalizeText(formData.get("reference_price")));
  const referenceCurrency =
    normalizeText(formData.get("reference_currency"))?.toUpperCase() ?? "USD";

  if (!content) {
    return { error: "请输入内容。" };
  }

  if (!rawPostType || !isValidPostType(rawPostType)) {
    return { error: "请选择有效的内容类型。" };
  }

  if (normalizeText(formData.get("source_url")) && !sourceUrl) {
    return { error: "来源链接必须是有效的 http 或 https 地址。" };
  }

  if (normalizeText(formData.get("reference_price")) && referencePrice === null) {
    return { error: "参考价格必须是大于或等于 0 的数字。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/quick");
  }

  await ensureProfile(supabase, user);

  let postId: string;

  try {
    const stockIds =
      symbols.length > 0
        ? await Promise.all(
            symbols.map((symbol) =>
              getOrCreateStockId(supabase, symbol, symbolMarketMap.get(symbol) ?? market),
            ),
          )
        : [];

    const { data: createdPost, error: postError } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        title,
        content,
        post_type: rawPostType,
        source_url: sourceUrl,
        market,
        reference_price: referencePrice,
        reference_currency: referenceCurrency,
      })
      .select("id")
      .single();

    if (postError) {
      throw new Error(postError.message);
    }

    postId = (createdPost as CreatedPostRow).id;

    if (stockIds.length > 0) {
      const relations = stockIds.map((stockId) => ({
        post_id: postId,
        stock_id: stockId,
      }));

      const { error: relationError } = await supabase.from("post_stocks").insert(relations);

      if (relationError) {
        throw new Error(relationError.message);
      }
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "发布失败，请稍后重试。",
    };
  }

  revalidatePath("/");
  revalidatePath("/quick");
  redirect(`/posts/${postId}`);
}
