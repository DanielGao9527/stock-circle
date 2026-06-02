import Link from "next/link";
import { notFound } from "next/navigation";
import { PostEditForm } from "@/components/post-edit-form";
import { requireUser } from "@/lib/auth/require-user";
import { type PostType } from "@/lib/posts/types";
import { createClient } from "@/lib/supabase/server";

type PostRow = {
  id: string;
  author_id: string;
  title: string | null;
  content: string;
  post_type: PostType;
  source_url: string | null;
  reference_price: number | string | null;
  reference_currency: string;
};

type PostStockRow = {
  stock_id: string;
};

type StockRow = {
  id: string;
  symbol: string;
};

type EditPostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params;
  const user = await requireUser(`/posts/${id}/edit`);
  const supabase = await createClient();

  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("id,author_id,title,content,post_type,source_url,reference_price,reference_currency")
    .eq("id", id)
    .eq("author_id", user.id)
    .is("deleted_at", null)
    .neq("status", "hidden")
    .maybeSingle();

  if (postError) {
    throw new Error(postError.message);
  }

  if (!postData) {
    notFound();
  }

  const post = postData as PostRow;
  const { data: relationData, error: relationError } = await supabase
    .from("post_stocks")
    .select("stock_id")
    .eq("post_id", id);

  if (relationError) {
    throw new Error(relationError.message);
  }

  const stockIds = ((relationData ?? []) as PostStockRow[]).map((relation) => relation.stock_id);
  let symbols: string[] = [];

  if (stockIds.length > 0) {
    const { data: stockData, error: stockError } = await supabase
      .from("stocks")
      .select("id,symbol")
      .in("id", stockIds)
      .order("symbol");

    if (stockError) {
      throw new Error(stockError.message);
    }

    symbols = ((stockData ?? []) as StockRow[]).map((stock) => stock.symbol);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">编辑帖子</h1>
            <p className="mt-2 text-sm text-zinc-600">只能编辑你自己发布的内容。</p>
          </div>
          <Link
            href={`/posts/${id}`}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            返回详情
          </Link>
        </div>
      </div>

      <PostEditForm post={post} symbols={symbols} />
    </section>
  );
}
