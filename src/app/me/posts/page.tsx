import Link from "next/link";
import { PostDeleteButton } from "@/components/post-delete-button";
import { requireUser } from "@/lib/auth/require-user";
import { getCommentCountsForTargets } from "@/lib/comments/data";
import { postTypeLabels, type PostType } from "@/lib/posts/types";
import { createClient } from "@/lib/supabase/server";

type PostRow = {
  id: string;
  title: string | null;
  content: string;
  post_type: PostType;
  created_at: string;
};

type PostStockRow = {
  post_id: string;
  stock_id: string;
};

type StockRow = {
  id: string;
  symbol: string;
};

const MY_POSTS_LIMIT = 10;

function getPreview(content: string) {
  return content.length > 90 ? `${content.slice(0, 90)}...` : content;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function MyPostsPage() {
  const user = await requireUser("/me/posts");
  const supabase = await createClient();

  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("id,title,content,post_type,created_at")
    .eq("author_id", user.id)
    .is("deleted_at", null)
    .neq("status", "hidden")
    .order("created_at", { ascending: false })
    .limit(MY_POSTS_LIMIT);

  if (postError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        我的帖子加载失败：{postError.message}
      </section>
    );
  }

  const posts = (postData ?? []) as PostRow[];
  const postIds = posts.map((post) => post.id);
  let symbolsByPost = new Map<string, string[]>();
  let commentCountsByPost = new Map<string, number>();

  if (postIds.length > 0) {
    commentCountsByPost = await getCommentCountsForTargets(supabase, "post", postIds);

    const { data: relationData } = await supabase
      .from("post_stocks")
      .select("post_id,stock_id")
      .in("post_id", postIds);
    const relations = (relationData ?? []) as PostStockRow[];
    const stockIds = Array.from(new Set(relations.map((relation) => relation.stock_id)));

    if (stockIds.length > 0) {
      const { data: stockData } = await supabase.from("stocks").select("id,symbol").in("id", stockIds);
      const stockMap = new Map(((stockData ?? []) as StockRow[]).map((stock) => [stock.id, stock.symbol]));

      symbolsByPost = relations.reduce((map, relation) => {
        const symbol = stockMap.get(relation.stock_id);

        if (!symbol) {
          return map;
        }

        map.set(relation.post_id, [...(map.get(relation.post_id) ?? []), symbol]);
        return map;
      }, new Map<string, string[]>());
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">我的帖子</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          管理你已经发布的股票想法、链接、新闻和复盘记录。
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center">
          <h2 className="text-base font-medium">还没有发布内容</h2>
          <p className="mt-2 text-sm text-zinc-600">先去快速发布保存一条记录。</p>
          <Link
            href="/quick"
            className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            去发布
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                  {postTypeLabels[post.post_type]}
                </span>
                <span>{formatTime(post.created_at)}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
                  评论 {commentCountsByPost.get(post.id) ?? 0}
                </span>
              </div>

              <h2 className="mt-3 text-base font-semibold text-zinc-900">
                {post.title ?? getPreview(post.content)}
              </h2>
              {post.title ? (
                <p className="mt-2 text-sm leading-6 text-zinc-600">{getPreview(post.content)}</p>
              ) : null}

              {(symbolsByPost.get(post.id) ?? []).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(symbolsByPost.get(post.id) ?? []).map((symbol) => (
                    <span
                      key={symbol}
                      className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-700"
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/posts/${post.id}`}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
                >
                  查看
                </Link>
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
                >
                  编辑
                </Link>
                <PostDeleteButton postId={post.id} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
