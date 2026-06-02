import { PortfolioJsonImport } from "@/components/portfolio-json-import";
import { requireUser } from "@/lib/auth/require-user";

export default async function ImportPage() {
  await requireUser("/import");

  return <PortfolioJsonImport />;
}
