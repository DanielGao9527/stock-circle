import { PortfolioJsonImport } from "@/components/portfolio-json-import";
import { requireUser } from "@/lib/auth/require-user";
import { getActivePortfolioSnapshots, getPortfolioItemsForSnapshots } from "@/lib/portfolio/data";
import { createClient } from "@/lib/supabase/server";

type LatestPositionSeed = {
  symbol: string;
  market: string;
  previousPercent: string;
};

export default async function ImportPage() {
  const user = await requireUser("/import");
  const supabase = await createClient();

  const snapshots = await getActivePortfolioSnapshots(supabase, {
    ownerId: user.id,
    limit: 1,
  });
  const latestSnapshot = snapshots[0] ?? null;

  let latestPositions: LatestPositionSeed[] = [];

  if (latestSnapshot) {
    const items = await getPortfolioItemsForSnapshots(supabase, [latestSnapshot.id]);
    latestPositions = items.map((item) => ({
      symbol: item.symbol,
      market: item.market ?? "US",
      previousPercent: String(item.position_percent),
    }));
  }

  return <PortfolioJsonImport latestPositions={latestPositions} />;
}
