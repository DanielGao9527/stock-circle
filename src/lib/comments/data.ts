import { createClient } from "@/lib/supabase/server";

export type CommentTargetType = "post" | "snapshot";

export type CommentListItem = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  parentCommentId: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
};

type CommentRow = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  is_deleted: boolean | null;
  deleted_at: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export function isCommentTargetType(value: string): value is CommentTargetType {
  return value === "post" || value === "snapshot";
}

export async function isVisibleCommentTarget(
  supabase: SupabaseServerClient,
  targetType: CommentTargetType,
  targetId: string,
) {
  if (targetType === "post") {
    const { data, error } = await supabase
      .from("posts")
      .select("id")
      .eq("id", targetId)
      .is("deleted_at", null)
      .neq("status", "hidden")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data);
  }

  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("id")
    .eq("id", targetId)
    .is("deleted_at", null)
    .neq("status", "hidden")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function getCommentsForTarget(
  supabase: SupabaseServerClient,
  targetType: CommentTargetType,
  targetId: string,
) {
  const { data, error } = await supabase
    .from("comments")
    .select("id,author_id,content,created_at,parent_comment_id,is_deleted,deleted_at")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const comments = (data ?? []) as CommentRow[];
  const authorIds = Array.from(new Set(comments.map((comment) => comment.author_id)));
  let profileMap = new Map<string, string>();

  if (authorIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", authorIds);

    if (profileError) {
      throw new Error(profileError.message);
    }

    profileMap = new Map(
      ((profileData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.display_name]),
    );
  }

  return comments.map((comment) => ({
    id: comment.id,
    authorId: comment.author_id,
    authorName: profileMap.get(comment.author_id) ?? `成员 ${comment.author_id.slice(0, 8)}`,
    content: comment.content,
    createdAt: comment.created_at,
    parentCommentId: comment.parent_comment_id,
    isDeleted: Boolean(comment.is_deleted || comment.deleted_at),
    deletedAt: comment.deleted_at,
  })) satisfies CommentListItem[];
}

export async function getCommentCountsForTargets(
  supabase: SupabaseServerClient,
  targetType: CommentTargetType,
  targetIds: string[],
) {
  if (targetIds.length === 0) {
    return new Map<string, number>();
  }

  const { data, error } = await supabase
    .from("comments")
    .select("target_id")
    .eq("target_type", targetType)
    .in("target_id", targetIds)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as { target_id: string }[]).reduce((map, comment) => {
    map.set(comment.target_id, (map.get(comment.target_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
}
