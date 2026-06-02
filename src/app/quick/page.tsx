import { QuickPostForm } from "@/components/quick-post-form";
import { requireUser } from "@/lib/auth/require-user";

export default async function QuickPage() {
  await requireUser("/quick");

  return <QuickPostForm />;
}
