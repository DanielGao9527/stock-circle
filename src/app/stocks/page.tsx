import { PagePlaceholder } from "@/components/page-placeholder";
import { requireUser } from "@/lib/auth/require-user";

export default async function StocksPage() {
  await requireUser("/stocks");

  return (
    <PagePlaceholder
      title="股票"
      description="这里将集中展示股票条目、标签筛选与历史笔记入口。"
    />
  );
}
