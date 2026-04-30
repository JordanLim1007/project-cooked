import { supabase } from "@/integrations/supabase/client";

export type TimerState = { stepIndex: number; endsAt: number } | null;

export type Progress = {
  recipe_id: string;
  checked_ingredient_ids: string[];
  current_step: number;
  timer_state: TimerState;
  is_complete: boolean;
  updated_at: string;
};

const localKey = (recipeId: string) => `cookprog:${recipeId}`;
const localIndexKey = "cookprog:index";

function readLocal(recipeId: string): Progress | null {
  try {
    const raw = localStorage.getItem(localKey(recipeId));
    return raw ? (JSON.parse(raw) as Progress) : null;
  } catch {
    return null;
  }
}

function writeLocal(p: Progress) {
  try {
    localStorage.setItem(localKey(p.recipe_id), JSON.stringify(p));
    const idx = JSON.parse(localStorage.getItem(localIndexKey) || "[]") as string[];
    if (!idx.includes(p.recipe_id)) {
      idx.push(p.recipe_id);
      localStorage.setItem(localIndexKey, JSON.stringify(idx));
    }
  } catch {
    // ignore
  }
}

function removeLocal(recipeId: string) {
  try {
    localStorage.removeItem(localKey(recipeId));
    const idx = (JSON.parse(localStorage.getItem(localIndexKey) || "[]") as string[]).filter(
      (id) => id !== recipeId,
    );
    localStorage.setItem(localIndexKey, JSON.stringify(idx));
  } catch {
    // ignore
  }
}

export async function loadProgress(
  recipeId: string,
  userId: string | null,
): Promise<Progress | null> {
  if (userId) {
    const { data } = await supabase
      .from("cooking_progress")
      .select("recipe_id,checked_ingredient_ids,current_step,timer_state,is_complete,updated_at")
      .eq("user_id", userId)
      .eq("recipe_id", recipeId)
      .maybeSingle();
    if (data) return data as unknown as Progress;
  }
  return readLocal(recipeId);
}

export async function saveProgress(
  recipeId: string,
  userId: string | null,
  patch: Partial<Omit<Progress, "recipe_id" | "updated_at">>,
): Promise<void> {
  const prev = (await loadProgress(recipeId, userId)) ?? {
    recipe_id: recipeId,
    checked_ingredient_ids: [],
    current_step: 0,
    timer_state: null,
    is_complete: false,
    updated_at: new Date().toISOString(),
  };
  const next: Progress = {
    ...prev,
    ...patch,
    recipe_id: recipeId,
    updated_at: new Date().toISOString(),
  };

  if (userId) {
    await supabase
      .from("cooking_progress")
      .upsert(
        {
          user_id: userId,
          recipe_id: recipeId,
          checked_ingredient_ids: next.checked_ingredient_ids,
          current_step: next.current_step,
          timer_state: next.timer_state as never,
          is_complete: next.is_complete,
        },
        { onConflict: "user_id,recipe_id" },
      );
  } else {
    writeLocal(next);
  }
}

export async function clearProgress(recipeId: string, userId: string | null) {
  if (userId) {
    await supabase.from("cooking_progress").delete().eq("user_id", userId).eq("recipe_id", recipeId);
  }
  removeLocal(recipeId);
}

export async function listInProgress(userId: string | null) {
  if (userId) {
    const { data } = await supabase
      .from("cooking_progress")
      .select("recipe_id,checked_ingredient_ids,current_step,is_complete,updated_at,recipes(id,title,cover_image_url,time_minutes)")
      .eq("user_id", userId)
      .eq("is_complete", false)
      .order("updated_at", { ascending: false });
    return (data ?? []) as unknown as (Progress & { recipes: { id: string; title: string; cover_image_url: string | null; time_minutes: number | null } | null })[];
  }
  return [];
}