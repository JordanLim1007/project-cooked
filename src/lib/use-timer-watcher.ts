import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { playTimerSound } from "@/lib/timer-sound";
import { toast } from "sonner";

type Row = {
  recipe_id: string;
  timer_state: { stepIndex: number; endsAt: number | null; remaining: number | null } | null;
};

/**
 * Watches the user's persisted cooking timers across all recipes.
 * When a timer's endsAt has passed and the user is NOT currently on
 * that recipe's page, we:
 *  - play the chime,
 *  - show a browser notification (if granted),
 *  - insert an in-app `timer_done` notification referencing the recipe.
 * Then we clear the timer_state on that progress row so it won't re-fire.
 */
export function useTimerWatcher() {
  const { user } = useAuth();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  // Track which timers we've already fired for, keyed by `${recipeId}:${endsAt}`
  const firedRef = useRef<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fireFor = async (recipeId: string, endsAt: number) => {
      const key = `${recipeId}:${endsAt}`;
      if (firedRef.current.has(key)) return;
      firedRef.current.add(key);

      // If user is currently viewing this recipe, the in-page StepTimer handles it.
      const onThisRecipe = pathRef.current === `/recipe/${recipeId}`;
      if (onThisRecipe) return;

      // Look up recipe title + the matching step for richer notification copy.
      const [{ data: r }, { data: prog }] = await Promise.all([
        supabase.from("recipes").select("title").eq("id", recipeId).maybeSingle(),
        supabase
          .from("cooking_progress")
          .select("timer_state")
          .eq("user_id", user.id)
          .eq("recipe_id", recipeId)
          .maybeSingle(),
      ]);
      const title = (r as any)?.title ?? "your recipe";
      const stepIndex: number | null = (prog as any)?.timer_state?.stepIndex ?? null;
      let stepTitle: string | null = null;
      let durationSeconds: number | null = null;
      if (stepIndex != null) {
        const { data: stepRow } = await supabase
          .from("recipe_steps")
          .select("title,timer_seconds")
          .eq("recipe_id", recipeId)
          .eq("position", stepIndex)
          .maybeSingle();
        stepTitle = (stepRow as any)?.title ?? null;
        durationSeconds = (stepRow as any)?.timer_seconds ?? null;
      }
      const stepNum = stepIndex != null ? stepIndex + 1 : null;
      const label = stepNum
        ? (stepTitle ? `Step ${stepNum}: ${stepTitle}` : `Step ${stepNum}`)
        : null;

      try { await playTimerSound(); } catch { /* noop */ }
      toast("Timer finished! Check your recipe step.", {
        description: label ? `${title} — ${label}` : title,
      });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("Timer finished", {
            body: label ? `${title} — ${label}` : `Your timer for "${title}" is done.`,
          });
        } catch { /* noop */ }
      }

      await supabase.from("notifications").insert({
        user_id: user.id,
        recipe_id: recipeId,
        type: "timer_done",
        data: {
          title,
          stepIndex,
          stepNumber: stepNum,
          stepTitle,
          durationSeconds,
          completedAt: new Date(endsAt).toISOString(),
        },
      });

      // Clear the timer so it doesn't re-fire.
      await supabase
        .from("cooking_progress")
        .update({ timer_state: null })
        .eq("user_id", user.id)
        .eq("recipe_id", recipeId);
    };

    const schedule = (rows: Row[]) => {
      // Clear stale timeouts
      for (const [, t] of timeoutsRef.current) window.clearTimeout(t);
      timeoutsRef.current.clear();

      for (const row of rows) {
        const ends = row.timer_state?.endsAt;
        if (!ends || !row.recipe_id) continue;
        const delay = ends - Date.now();
        if (delay <= 0) {
          fireFor(row.recipe_id, ends);
        } else {
          const t = window.setTimeout(() => fireFor(row.recipe_id, ends), delay + 200);
          timeoutsRef.current.set(`${row.recipe_id}:${ends}`, t);
        }
      }
    };

    const refresh = async () => {
      const { data } = await supabase
        .from("cooking_progress")
        .select("recipe_id,timer_state")
        .eq("user_id", user.id);
      if (cancelled) return;
      schedule(((data ?? []) as unknown as Row[]).filter((r) => r.timer_state?.endsAt));
    };

    refresh();

    const channel = supabase
      .channel(`timer-watch-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cooking_progress", filter: `user_id=eq.${user.id}` },
        () => { refresh(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      for (const [, t] of timeoutsRef.current) window.clearTimeout(t);
      timeoutsRef.current.clear();
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}