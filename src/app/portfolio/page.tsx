import { PagePlaceholder } from "@/components/page-placeholder";
import { requireUser } from "@/lib/auth/require-user";

export default async function PortfolioPage() {
  await requireUser("/portfolio");

  return (
    <PagePlaceholder
      title="持仓"
      description="这里将展示持仓快照、时间轴回顾和分组记录。"
    />
  );
}
