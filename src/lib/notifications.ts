import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "like" | "follow" | "new_recipe" | "timer_done";

export type AppNotification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  recipe_id: string | null;
  type: NotificationType;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  actor?: { id: string; display_name: string | null; avatar_url: string | null } | null;
  recipe?: { id: string; title: string; cover_image_url: string | null } | null;
};

export async function fetchNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,actor_id,recipe_id,type,data,is_read,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  const list = data as unknown as AppNotification[];

  const actorIds = Array.from(new Set(list.map((n) => n.actor_id).filter(Boolean) as string[]));
  const recipeIds = Array.from(new Set(list.map((n) => n.recipe_id).filter(Boolean) as string[]));

  const [{ data: actors }, { data: recipes }] = await Promise.all([
    actorIds.length
      ? supabase.from("profiles").select("id,display_name,avatar_url").in("id", actorIds)
      : Promise.resolve({ data: [] as any[] }),
    recipeIds.length
      ? supabase.from("recipes").select("id,title,cover_image_url").in("id", recipeIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const actorMap = new Map((actors ?? []).map((a: any) => [a.id, a]));
  const recipeMap = new Map((recipes ?? []).map((r: any) => [r.id, r]));
  return list.map((n) => ({
    ...n,
    actor: n.actor_id ? (actorMap.get(n.actor_id) as any) ?? null : null,
    recipe: n.recipe_id ? (recipeMap.get(n.recipe_id) as any) ?? null : null,
  }));
}

export async function unreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}

export async function markAllRead(userId: string) {
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
}

export async function markRead(id: string) {
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
}

export async function deleteNotification(id: string) {
  await supabase.from("notifications").delete().eq("id", id);
}

/** Local-only timer notification (not in DB; just a transient record). */
export function localTimerNotification(label: string): AppNotification {
  return {
    id: `local-timer-${Date.now()}`,
    user_id: "local",
    actor_id: null,
    recipe_id: null,
    type: "timer_done",
    data: { label },
    is_read: false,
    created_at: new Date().toISOString(),
  };
}