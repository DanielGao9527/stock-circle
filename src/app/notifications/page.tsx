import { markAllNotificationsRead, openNotification } from "@/app/notifications/actions";
import { requireUser } from "@/lib/auth/require-user";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
} from "@/lib/notifications/data";
import { createClient } from "@/lib/supabase/server";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const supabase = await createClient();
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(supabase, user.id),
    getUnreadNotificationCount(supabase, user.id),
  ]);

  return (
    <section className="space-y-4 md:space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">通知</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              查看别人对你的帖子、持仓快照，或评论回复留下的最新互动。
            </p>
          </div>
          {unreadCount > 0 ? (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 sm:w-auto"
              >
                全部标为已读
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
          暂时没有通知。
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const unread = !notification.read_at;

            return (
              <form key={notification.id} action={openNotification}>
                <input type="hidden" name="notification_id" value={notification.id} />
                <input type="hidden" name="target_type" value={notification.target_type} />
                <input type="hidden" name="target_id" value={notification.target_id} />
                <button
                  type="submit"
                  className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30 md:p-5 ${
                    unread ? "border-blue-200 bg-blue-50/60" : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-900">{notification.actorName}</span>
                        <span>评论了你的内容</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-zinc-700">
                          {notification.target_type === "post" ? "帖子" : "持仓快照"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            unread
                              ? "bg-blue-600 text-white"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {unread ? "未读" : "已读"}
                        </span>
                      </div>
                      <h2 className="mt-2 break-words text-base font-semibold text-zinc-900">
                        {notification.targetTitle}
                      </h2>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>

                  {notification.summary ? (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">
                      {notification.summary}
                    </p>
                  ) : null}
                </button>
              </form>
            );
          })}
        </div>
      )}
    </section>
  );
}
