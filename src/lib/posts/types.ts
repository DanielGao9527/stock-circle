export const postTypes = ["idea", "link", "news", "review", "other"] as const;

export type PostType = (typeof postTypes)[number];

export const postTypeLabels: Record<PostType, string> = {
  idea: "想法",
  link: "链接",
  news: "新闻",
  review: "复盘",
  other: "其他",
};

export type QuickPostActionState = {
  error?: string;
};
