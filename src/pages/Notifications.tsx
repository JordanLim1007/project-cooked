import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { fetchNotifications, markAllRead, markRead, deleteNotification, type AppNotification } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, Heart, UserPlus, ChefHat, Timer, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const ICONS = {
  like: { icon: Heart, color: "text-red-500" },
  follow: { icon: UserPlus, color: "text-blue-500" },
  new_recipe: { icon: ChefHat, color: "text-amber-600" },
  timer_done: { icon: Timer, color: "text-emerald-600" },
} as const;

const GROUP_LABEL: Record<string, string> = {
  like: "Likes",
  follow: "New followers",
  new_recipe: "From people you follow",
  timer_done: "Timers",
};

function describe(n: AppNotification): string {
  const who = n.actor?.display_name || "Someone";
  switch (n.type) {
    case "like": return `${who} liked “${n.recipe?.title ?? "your recipe"}”`;
    case "follow": return `${who} started following you`;
    case "new_recipe": return `${who} shared “${n.recipe?.title ?? "a new recipe"}”`;
    case "timer_done": return `Timer finished${n.data?.label ? `: ${n.data.label as string}` : ""}`;
  }
}

function targetHref(n: AppNotification): string | null {
  if (n.type === "follow" && n.actor) return `/profile/${n.actor.id}`;
  if (n.recipe) return `/recipe/${n.recipe.id}`;
  return null;
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const list = await fetchNotifications(user.id);
      setItems(list);
      setFetching(false);
      await markAllRead(user.id);
    })();

    if (!user) return;
    const channel = supabase
      .channel(`notif-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async () => {
          const list = await fetchNotifications(user.id);
          setItems(list);
          await markAllRead(user.id);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loading, navigate]);

  const grouped = items.reduce<Record<string, AppNotification[]>>((acc, n) => {
    (acc[n.type] ??= []).push(n);
    return acc;
  }, {});

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-3">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold">Notifications</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-5">
        {fetching ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Bell className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You're all caught up.</p>
          </div>
        ) : (
          <div className="space-y-7">
            {(["like", "follow", "new_recipe", "timer_done"] as const).map((type) => {
              const list = grouped[type];
              if (!list || list.length === 0) return null;
              const { icon: Icon, color } = ICONS[type];
              return (
                <section key={type}>
                  <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <Icon className={cn("h-3.5 w-3.5", color)} /> {GROUP_LABEL[type]}
                  </h2>
                  <ul className="space-y-1.5">
                    {list.map((n) => {
                      const href = targetHref(n);
                      const body = (
                        <div className="flex flex-1 items-center gap-3">
                          {n.actor?.avatar_url ? (
                            <img src={n.actor.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted")}>
                              <Icon className={cn("h-4 w-4", color)} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug">{describe(n)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {n.recipe?.cover_image_url && (
                            <img src={n.recipe.cover_image_url} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
                          )}
                        </div>
                      );
                      return (
                        <li key={n.id} className={cn("group flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-muted/50", !n.is_read && "bg-primary/5")}>
                          {href ? (
                            <Link to={href} onClick={() => markRead(n.id)} className="flex flex-1 items-center gap-3">{body}</Link>
                          ) : body}
                          <button onClick={() => remove(n.id)} aria-label="Delete" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <div className="mt-10">
          <PushOptIn />
        </div>
      </main>
    </AppShell>
  );
}

function PushOptIn() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  if (perm === "unsupported") return null;

  if (perm === "granted") {
    return (
      <p className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
        ✅ Browser notifications are enabled. We'll alert you when timers finish even if you're on another tab.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-2 text-sm font-semibold">Enable browser notifications</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Get pinged when a timer finishes or someone interacts with your recipes — even with the tab in the background.
      </p>
      <Button
        size="sm"
        onClick={async () => {
          const p = await Notification.requestPermission();
          setPerm(p);
        }}
      >
        Turn on notifications
      </Button>
    </div>
  );
}