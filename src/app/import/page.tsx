import { PagePlaceholder } from "@/components/page-placeholder";
import { requireUser } from "@/lib/auth/require-user";

export default async function ImportPage() {
  await requireUser("/import");

  return (
    <PagePlaceholder
      title="导入"
      description="这里将用于导入 JSON 数据并展示校验与导入结果。"
    />
  );
}
