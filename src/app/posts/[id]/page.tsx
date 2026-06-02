import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsSection } from "@/components/comments-section";
import { requireUser } from "@/lib/auth/require-user";
import { getCommentsForTarget } from "@/lib/comments/data";
import { postTypeLabels, type PostType } from "@/lib/posts/types";
import { createClient } from "@/lib/supabase/server";

type PostRow = {
  id: string;
  title: string | null;
  content: string;
  post_type: PostType;
  source_url: string | null;
  market: string;
  reference_price: number | null;
  reference_currency: string;
  created_at: string;
};

type PostStockRow = {
  stock_id: string;
};

type StockRow = {
  id: string;
  symbol: string;
  market: string;
};

type PostDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;
  const user = await requireUser(`/posts/${id}`);

  const supabase = await createClient();
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select(
      "id,title,content,post_type,source_url,market,reference_price,reference_currency,created_at",
    )
    .eq("id", id)
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

  const stockIds = ((relationData ?? []) as PostStockRow[]).map((item) => item.stock_id);
  let stocks: StockRow[] = [];

  if (stockIds.length > 0) {
    const { data: stockData, error: stockError } = await supabase
      .from("stocks")
      .select("id,symbol,market")
      .in("id", stockIds)
      .order("symbol");

    if (stockError) {
      throw new Error(stockError.message);
    }

    stocks = (stockData ?? []) as StockRow[];
  }

  const comments = await getCommentsForTarget(supabase, "post", post.id);

  return (
    <article className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
            {postTypeLabels[post.post_type]}
          </span>
          <span>{formatTime(post.created_at)}</span>
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {post.title ?? "未命名记录"}
        </h1>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-700">{post.content}</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-medium">关联信息</h2>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">市场</dt>
            <dd className="mt-1 text-zinc-900">{post.market}</dd>
          </div>

          <div>
            <dt className="text-zinc-500">关联股票</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {stocks.length > 0 ? (
                stocks.map((stock) => (
                  <Link
                    key={stock.id}
                    href={`/stocks/${encodeURIComponent(stock.market)}/${encodeURIComponent(stock.symbol)}`}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    {stock.symbol}
                  </Link>
                ))
              ) : (
                <span className="text-zinc-500">未关联股票</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-zinc-500">参考价格</dt>
            <dd className="mt-1 text-zinc-900">
              {post.reference_price === null
                ? "未填写"
                : `${post.reference_price} ${post.reference_currency}`}
            </dd>
          </div>

          <div>
            <dt className="text-zinc-500">来源链接</dt>
            <dd className="mt-1">
              {post.source_url ? (
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-blue-700 hover:underline"
                >
                  {post.source_url}
                </a>
              ) : (
                <span className="text-zinc-500">未填写</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <CommentsSection
        targetType="post"
        targetId={post.id}
        comments={comments}
        currentUserId={user.id}
      />
    </article>
  );
}
