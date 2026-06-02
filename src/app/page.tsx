import { PagePlaceholder } from "@/components/page-placeholder";
import { requireUser } from "@/lib/auth/require-user";

export default async function Home() {
  await requireUser("/");

  return (
    <PagePlaceholder
      title="首页"
      description="欢迎使用 StockCircle。这里将展示近期讨论、关注股票摘要和快速入口。"
    />
  );
}
