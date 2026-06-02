"use client";

import { useActionState } from "react";
import { saveDailyDigestPreference, type DailyDigestPreferenceActionState } from "@/app/me/actions";

type DailyDigestSettingsFormProps = {
  defaultEnabled: boolean;
  defaultDigestEmail: string;
  accountEmail: string;
};

const initialState: DailyDigestPreferenceActionState = {};

export function DailyDigestSettingsForm({
  defaultEnabled,
  defaultDigestEmail,
  accountEmail,
}: DailyDigestSettingsFormProps) {
  const [state, formAction, pending] = useActionState(saveDailyDigestPreference, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium text-zinc-900">订阅每日摘要</div>
            <p className="text-sm leading-6 text-zinc-600">
              发送时间：美股开盘前 10 分钟（9:20 AM ET）
            </p>
          </div>

          <label className="inline-flex items-center gap-3">
            <input
              name="daily_email_enabled"
              type="checkbox"
              defaultChecked={defaultEnabled}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-700">开启</span>
          </label>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">接收邮箱</span>
        <input
          name="digest_email"
          type="email"
          defaultValue={defaultDigestEmail}
          placeholder={accountEmail || "you@example.com"}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <p className="text-sm leading-6 text-zinc-500">
          如果不填写，将优先使用账号邮箱。
        </p>
      </label>

      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          每日邮件摘要设置已保存。
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
        >
          {pending ? "保存中..." : "保存设置"}
        </button>
      </div>
    </form>
  );
}
