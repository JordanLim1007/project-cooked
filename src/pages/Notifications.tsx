import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { fetchNotifications, markAllRead, markRead, deleteNotification, type AppNotification } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, Heart, UserPlus, ChefHat, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const ICONS = {
  like: { icon: Heart, color: "text-red-500" },
  follow: { icon: UserPlus, color: "text-blue-500" },
  new_recipe: { icon: ChefHat, color: "text-amber-600" },
  timer_done: { icon: Timer, color: "text-emerald-600" },
} as const;

function describe(n: AppNotification): string {
  const who = n.actor?.display_name || "Someone";
  switch (n.type) {
    case "like": return `${who} liked “${n.recipe?.title ?? "your recipe"}”`;
    case "follow": return `${who} started following you`;
    case "new_recipe": return `${who} shared “${n.recipe?.title ?? "a new recipe"}”`;
    case "timer_done": {
      const d = (n.data ?? {}) as Record<string, any>;
      const recipeTitle = n.recipe?.title ?? d.title ?? "your recipe";
      const stepNum: number | null = typeof d.stepNumber === "number" ? d.stepNumber : null;
      const stepTitle: string | null = typeof d.stepTitle === "string" && d.stepTitle ? d.stepTitle : null;
      const dur: number | null = typeof d.durationSeconds === "number" ? d.durationSeconds : null;
      const stepLabel = stepNum
        ? (stepTitle ? `Step ${stepNum}: ${stepTitle}` : `Step ${stepNum}`)
        : null;
      const durLabel = dur ? formatDuration(dur) : null;
      const parts: string[] = [];
      if (stepLabel && durLabel) parts.push(`${stepLabel} — ${durLabel}`);
      else if (stepLabel) parts.push(stepLabel);
      else if (durLabel) parts.push(durLabel);
      const suffix = parts.length ? ` (${parts.join(" · ")})` : "";
      // Legacy entries used `label`.
      const legacy = d.label ? ` (${d.label as string})` : "";
      return `Timer finished for “${recipeTitle}”${suffix || legacy}`;
    }
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m} min`;
}

function timerCompletedAt(n: AppNotification): string {
  const iso = (n.data as any)?.completedAt as string | undefined;
  const d = iso ? new Date(iso) : new Date(n.created_at);
  return formatDistanceToNow(d, { addSuffix: true });
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

  const sorted = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

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
          <ul className="space-y-1.5">
            {sorted.map((n) => {
              const { icon: Icon, color } = ICONS[n.type];
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
                      {n.type === "timer_done" ? `Completed ${timerCompletedAt(n)}` : formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                    {n.type === "timer_done" && n.recipe && (
                      <Link to={`/recipe/${n.recipe.id}`} onClick={() => markRead(n.id)} className="mt-1 inline-flex">
                        <Button size="sm" variant="outline" className="h-7 text-xs">Open recipe</Button>
                      </Link>
                    )}
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