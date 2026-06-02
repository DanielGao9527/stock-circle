"use client";

import { useFormStatus } from "react-dom";
import { deletePortfolioSnapshot } from "@/app/portfolio/actions";

type PortfolioSnapshotDeleteButtonProps = {
  snapshotId: string;
};

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "删除中..." : "删除"}
    </button>
  );
}

export function PortfolioSnapshotDeleteButton({ snapshotId }: PortfolioSnapshotDeleteButtonProps) {
  return (
    <form
      action={deletePortfolioSnapshot}
      onSubmit={(event) => {
        if (!window.confirm("确定要删除这个持仓快照吗？删除后默认不再显示。")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="snapshot_id" value={snapshotId} />
      <DeleteSubmitButton />
    </form>
  );
}
