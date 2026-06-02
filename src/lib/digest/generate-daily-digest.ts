import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type GenerateDailyDigestOptions = {
  from?: Date;
  to?: Date;
  supabase?: SupabaseServerClient;
};

type PostRow = {
  id: string;
  author_id: string;
  title: string | null;
  content: string;
  created_at: string;
};

type SnapshotRow = {
  id: string;
  owner_id: string | null;
  created_by: string | null;
  title: string | null;
  created_at: string;
};

type CommentRow = {
  id: string;
  author_id: string;
  target_type: "post" | "snapshot";
  target_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
};

type RecentCommentItem = {
  id: string;
  actorName: string;
  targetOwnerName: string;
  summary: string;
  isReply: boolean;
  createdAt: string;
};

export type DailyDigestResult = {
  from: string;
  to: string;
  text: string;
  html: string;
  stats: {
    posts: number;
    snapshots: number;
    comments: number;
  };
};

function getDefaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  return { from, to };
}

function toIsoString(value: Date) {
  return value.toISOString();
}

function getPreview(value: string, limit = 36) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function displayNameFor(profileMap: Map<string, string>, userId: string | null | undefined) {
  if (!userId) {
    return "未知成员";
  }

  return profileMap.get(userId) ?? `成员 ${userId.slice(0, 8)}`;
}

function countByAuthor<T extends { authorId: string }>(items: T[]) {
  return items.reduce((map, item) => {
    map.set(item.authorId, (map.get(item.authorId) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
}

async function getProfileMap(supabase: SupabaseServerClient, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name")
    .in("id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.display_name]),
  );
}

function buildRecentComments(
  comments: CommentRow[],
  posts: PostRow[],
  snapshots: SnapshotRow[],
  profileMap: Map<string, string>,
) {
  const postOwnerMap = new Map(posts.map((post) => [post.id, post.author_id]));
  const snapshotOwnerMap = new Map(
    snapshots.map((snapshot) => [snapshot.id, snapshot.owner_id ?? snapshot.created_by]),
  );
  const commentMap = new Map(comments.map((comment) => [comment.id, comment]));

  return comments
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((comment) => {
      const actorName = displayNameFor(profileMap, comment.author_id);
      const parentComment = comment.parent_comment_id
        ? commentMap.get(comment.parent_comment_id) ?? null
        : null;
      const targetOwnerId = parentComment
        ? parentComment.author_id
        : comment.target_type === "post"
          ? postOwnerMap.get(comment.target_id) ?? null
          : snapshotOwnerMap.get(comment.target_id) ?? null;

      return {
        id: comment.id,
        actorName,
        targetOwnerName: displayNameFor(profileMap, targetOwnerId),
        summary: getPreview(comment.content, 48),
        isReply: Boolean(parentComment),
        createdAt: comment.created_at,
      } satisfies RecentCommentItem;
    });
}

function renderTextDigest(args: {
  postCounts: Map<string, number>;
  snapshotCounts: Map<string, number>;
  commentCounts: Map<string, number>;
  latestPosts: PostRow[];
  latestSnapshots: SnapshotRow[];
  recentComments: RecentCommentItem[];
  profileMap: Map<string, string>;
}) {
  const {
    postCounts,
    snapshotCounts,
    commentCounts,
    latestPosts,
    latestSnapshots,
    recentComments,
    profileMap,
  } = args;

  const activityLines = [
    ...Array.from(postCounts.entries()).map(
      ([authorId, count]) => `- ${displayNameFor(profileMap, authorId)} 发布了 ${count} 条观点`,
    ),
    ...Array.from(snapshotCounts.entries()).map(
      ([authorId, count]) => `- ${displayNameFor(profileMap, authorId)} 更新了 ${count} 次持仓`,
    ),
    ...Array.from(commentCounts.entries()).map(
      ([authorId, count]) => `- ${displayNameFor(profileMap, authorId)} 回复了 ${count} 条内容`,
    ),
  ];

  if (
    activityLines.length === 0 &&
    latestPosts.length === 0 &&
    latestSnapshots.length === 0 &&
    recentComments.length === 0
  ) {
    return "今日暂无新的观点、持仓更新或评论。";
  }

  const sections = ["今日持仓圈摘要", ""];

  if (activityLines.length > 0) {
    sections.push("圈内动态：", ...activityLines, "");
  }

  if (latestPosts.length > 0) {
    sections.push(
      "最新观点：",
      ...latestPosts.slice(0, 5).map((post, index) => {
        const title = post.title ?? getPreview(post.content);
        return `${index + 1}. ${displayNameFor(profileMap, post.author_id)}：${title}`;
      }),
      "",
    );
  }

  if (latestSnapshots.length > 0) {
    sections.push(
      "持仓更新：",
      ...latestSnapshots.slice(0, 5).map((snapshot, index) => {
        const authorId = snapshot.owner_id ?? snapshot.created_by;
        const title = snapshot.title ?? "未命名持仓快照";
        return `${index + 1}. ${displayNameFor(profileMap, authorId)}：${title}`;
      }),
      "",
    );
  }

  if (recentComments.length > 0) {
    sections.push(
      "最新评论：",
      ...recentComments.map((comment, index) => {
        const actionText = comment.isReply ? "回复了" : "评论了";
        return `${index + 1}. ${comment.actorName} ${actionText} ${comment.targetOwnerName} 的内容：${comment.summary}`;
      }),
    );
  }

  return sections.join("\n").trim();
}

function renderHtmlDigest(args: {
  postCounts: Map<string, number>;
  snapshotCounts: Map<string, number>;
  commentCounts: Map<string, number>;
  latestPosts: PostRow[];
  latestSnapshots: SnapshotRow[];
  recentComments: RecentCommentItem[];
  profileMap: Map<string, string>;
}) {
  const {
    postCounts,
    snapshotCounts,
    commentCounts,
    latestPosts,
    latestSnapshots,
    recentComments,
    profileMap,
  } = args;

  if (
    postCounts.size === 0 &&
    snapshotCounts.size === 0 &&
    commentCounts.size === 0 &&
    latestPosts.length === 0 &&
    latestSnapshots.length === 0 &&
    recentComments.length === 0
  ) {
    return "<div><h1>今日持仓圈摘要</h1><p>今日暂无新的观点、持仓更新或评论。</p></div>";
  }

  const activityItems = [
    ...Array.from(postCounts.entries()).map(
      ([authorId, count]) =>
        `<li>${escapeHtml(displayNameFor(profileMap, authorId))} 发布了 ${count} 条观点</li>`,
    ),
    ...Array.from(snapshotCounts.entries()).map(
      ([authorId, count]) =>
        `<li>${escapeHtml(displayNameFor(profileMap, authorId))} 更新了 ${count} 次持仓</li>`,
    ),
    ...Array.from(commentCounts.entries()).map(
      ([authorId, count]) =>
        `<li>${escapeHtml(displayNameFor(profileMap, authorId))} 回复了 ${count} 条内容</li>`,
    ),
  ];

  const postItems = latestPosts
    .slice(0, 5)
    .map((post) => {
      const title = post.title ?? getPreview(post.content);
      return `<li>${escapeHtml(displayNameFor(profileMap, post.author_id))}：${escapeHtml(title)}</li>`;
    })
    .join("");

  const snapshotItems = latestSnapshots
    .slice(0, 5)
    .map((snapshot) => {
      const authorId = snapshot.owner_id ?? snapshot.created_by;
      const title = snapshot.title ?? "未命名持仓快照";
      return `<li>${escapeHtml(displayNameFor(profileMap, authorId))}：${escapeHtml(title)}</li>`;
    })
    .join("");

  const commentItems = recentComments
    .map((comment) => {
      const actionText = comment.isReply ? "回复了" : "评论了";
      return `<li>${escapeHtml(comment.actorName)} ${actionText} ${escapeHtml(comment.targetOwnerName)} 的内容：${escapeHtml(comment.summary)}</li>`;
    })
    .join("");

  return [
    "<div>",
    "<h1>今日持仓圈摘要</h1>",
    activityItems.length > 0 ? `<h2>圈内动态：</h2><ul>${activityItems.join("")}</ul>` : "",
    postItems ? `<h2>最新观点：</h2><ol>${postItems}</ol>` : "",
    snapshotItems ? `<h2>持仓更新：</h2><ol>${snapshotItems}</ol>` : "",
    commentItems ? `<h2>最新评论：</h2><ol>${commentItems}</ol>` : "",
    "</div>",
  ].join("");
}

export async function generateDailyDigest(
  options: GenerateDailyDigestOptions = {},
): Promise<DailyDigestResult> {
  const defaultRange = getDefaultRange();
  const from = options.from ?? defaultRange.from;
  const to = options.to ?? defaultRange.to;
  const supabase = options.supabase ?? (await createClient());
  const fromIso = toIsoString(from);
  const toIso = toIsoString(to);

  const [
    { data: postData, error: postError },
    { data: snapshotData, error: snapshotError },
    { data: commentData, error: commentError },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id,author_id,title,content,created_at")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .is("deleted_at", null)
      .neq("status", "hidden")
      .order("created_at", { ascending: false }),
    supabase
      .from("portfolio_snapshots")
      .select("id,owner_id,created_by,title,created_at")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .is("deleted_at", null)
      .neq("status", "hidden")
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id,author_id,target_type,target_id,parent_comment_id,content,created_at")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (postError) {
    throw new Error(postError.message);
  }

  if (snapshotError) {
    throw new Error(snapshotError.message);
  }

  if (commentError) {
    throw new Error(commentError.message);
  }

  const posts = (postData ?? []) as PostRow[];
  const snapshots = (snapshotData ?? []) as SnapshotRow[];
  const comments = (commentData ?? []) as CommentRow[];

  const allAuthorIds = Array.from(
    new Set([
      ...posts.map((post) => post.author_id),
      ...snapshots.map((snapshot) => snapshot.owner_id ?? snapshot.created_by).filter(Boolean),
      ...comments.map((comment) => comment.author_id),
    ] as string[]),
  );

  const profileMap = await getProfileMap(supabase, allAuthorIds);

  const postCounts = countByAuthor(posts.map((post) => ({ authorId: post.author_id })));
  const snapshotCounts = countByAuthor(
    snapshots
      .map((snapshot) => ({ authorId: snapshot.owner_id ?? snapshot.created_by }))
      .filter((item): item is { authorId: string } => Boolean(item.authorId)),
  );
  const commentCounts = countByAuthor(comments.map((comment) => ({ authorId: comment.author_id })));
  const recentComments = buildRecentComments(comments, posts, snapshots, profileMap);

  return {
    from: fromIso,
    to: toIso,
    text: renderTextDigest({
      postCounts,
      snapshotCounts,
      commentCounts,
      latestPosts: posts,
      latestSnapshots: snapshots,
      recentComments,
      profileMap,
    }),
    html: renderHtmlDigest({
      postCounts,
      snapshotCounts,
      commentCounts,
      latestPosts: posts,
      latestSnapshots: snapshots,
      recentComments,
      profileMap,
    }),
    stats: {
      posts: posts.length,
      snapshots: snapshots.length,
      comments: comments.length,
    },
  };
}
