"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrCreateStockId } from "@/lib/stocks/get-or-create-stock";
import { createClient } from "@/lib/supabase/server";
import { postTypes, type PostType } from "@/lib/posts/types";

export type PostActionState = {
  error?: string;
};

type OwnedPostRow = {
  id: string;
  author_id: string;
  market: string;
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

function normalizeOptionalUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
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

function isPostType(value: string | null): value is PostType {
  return value !== null && postTypes.includes(value as PostType);
}

async function getOwnedActivePost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("posts")
    .select("id,author_id,market")
    .eq("id", postId)
    .eq("author_id", userId)
    .is("deleted_at", null)
    .neq("status", "hidden")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as OwnedPostRow | null;
}

export async function updatePost(
  _previousState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const postId = normalizeText(formData.get("post_id"));
  const title = normalizeText(formData.get("title"));
  const content = normalizeText(formData.get("content"));
  const postType = normalizeText(formData.get("post_type"));
  const sourceUrl = normalizeOptionalUrl(normalizeText(formData.get("source_url")));
  const rawSourceUrl = normalizeText(formData.get("source_url"));
  const symbols = normalizeSymbolList(formData.get("symbols"));
  const referencePrice = normalizeOptionalPrice(normalizeText(formData.get("reference_price")));
  const rawReferencePrice = normalizeText(formData.get("reference_price"));
  const referenceCurrency =
    normalizeText(formData.get("reference_currency"))?.toUpperCase() ?? "USD";

  if (!postId) {
    return { error: "缺少帖子 ID。" };
  }

  if (!content) {
    return { error: "请输入内容。" };
  }

  if (!isPostType(postType)) {
    return { error: "请选择有效的内容类型。" };
  }

  if (rawSourceUrl && !sourceUrl) {
    return { error: "来源链接必须是有效的 http 或 https 地址。" };
  }

  if (rawReferencePrice && referencePrice === null) {
    return { error: "参考价格必须是大于或等于 0 的数字。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/posts/${postId}/edit`);
  }

  try {
    const post = await getOwnedActivePost(supabase, postId, user.id);

    if (!post) {
      return { error: "你只能编辑自己发布且未删除的帖子。" };
    }

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        title,
        content,
        post_type: postType,
        source_url: sourceUrl,
        reference_price: referencePrice,
        reference_currency: referenceCurrency,
        status: "published",
        visibility: "group",
        is_deleted: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("author_id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: deleteRelationsError } = await supabase
      .from("post_stocks")
      .delete()
      .eq("post_id", postId);

    if (deleteRelationsError) {
      throw new Error(deleteRelationsError.message);
    }

    if (symbols.length > 0) {
      const stockIds = await Promise.all(
        symbols.map((symbol) => getOrCreateStockId(supabase, symbol, post.market ?? "US")),
      );
      const relations = stockIds.map((stockId) => ({
        post_id: postId,
        stock_id: stockId,
      }));
      const { error: insertRelationsError } = await supabase.from("post_stocks").insert(relations);

      if (insertRelationsError) {
        throw new Error(insertRelationsError.message);
      }
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "保存失败，请稍后重试。",
    };
  }

  revalidatePath("/");
  revalidatePath("/stocks");
  revalidatePath("/me/posts");
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}`);
}

export async function deletePost(formData: FormData) {
  const postId = normalizeText(formData.get("post_id"));

  if (!postId) {
    redirect("/me/posts");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/posts");
  }

  const post = await getOwnedActivePost(supabase, postId, user.id);

  if (post) {
    await supabase
      .from("posts")
      .update({
        deleted_at: new Date().toISOString(),
        status: "hidden",
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("author_id", user.id);
  }

  revalidatePath("/");
  revalidatePath("/stocks");
  revalidatePath("/me/posts");
  redirect("/me/posts");
}
