import { supabase } from "@/integrations/supabase/client";
import type { FeedRecipe } from "@/lib/recipe-feed";
import { fetchRecipeFeed } from "@/lib/recipe-feed";
import { ingredientMatches } from "@/lib/ingredient-match";

export type UserPrefs = {
  cuisines: string[];
  cooking_styles: string[];
  spice_level: string | null;
  time_preference: string | null;
  /** Allergens to AVOID */
  allergens?: string[];
  /** Diet: "vegan" | null */
  diet?: string | null;
  /** Ingredients the user has on hand */
  pantry?: string[];
};

export type RecReason =
  | { kind: "cuisine"; label: string }
  | { kind: "style"; label: string }
  | { kind: "spice"; label: string }
  | { kind: "time"; label: string }
  | { kind: "vegan"; label: string }
  | { kind: "allergen_safe"; label: string }
  | { kind: "pantry"; label: string };

export type Recommended = FeedRecipe & {
  score: number;
  reasons: RecReason[];
  /** True when recipe contains an allergen the user wants to avoid (filtered out). */
  blockedByAllergen?: boolean;
};

const SPICE_RANK: Record<string, number> = {
  "Not spicy": 0, "Mild": 1, "Medium": 2, "Hot": 3, "Fiery": 4,
};

function timePrefRange(pref: string | null): [number, number] | null {
  switch (pref) {
    case "Under 15 min": return [0, 15];
    case "15-30 min": return [15, 30];
    case "30-60 min": return [30, 60];
    case "Over 1 hour": return [60, Infinity];
    default: return null;
  }
}

/** Load merged preferences for a user (DB prefs + local pantry). */
export async function loadUserPrefs(userId: string): Promise<UserPrefs | null> {
  const { data } = await supabase
    .from("user_preferences")
    .select("cuisines,cooking_styles,spice_level,time_preference")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  let pantry: string[] = [];
  let allergens: string[] = [];
  let diet: string | null = null;
  try {
    const p = localStorage.getItem("cooked.pantry");
    if (p) pantry = JSON.parse(p);
    const a = localStorage.getItem("cooked.allergens");
    if (a) allergens = JSON.parse(a);
    diet = localStorage.getItem("cooked.diet");
  } catch { /* noop */ }
  return {
    cuisines: (data as any).cuisines ?? [],
    cooking_styles: (data as any).cooking_styles ?? [],
    spice_level: (data as any).spice_level ?? null,
    time_preference: (data as any).time_preference ?? null,
    allergens,
    diet,
    pantry,
  };
}

function scoreRecipe(r: FeedRecipe, prefs: UserPrefs): { score: number; reasons: RecReason[]; blocked: boolean } {
  const reasons: RecReason[] = [];
  let score = 0;
  let blocked = false;

  // Cuisine
  if (prefs.cuisines.length > 0 && r.cuisine && prefs.cuisines.includes(r.cuisine)) {
    score += 30;
    reasons.push({ kind: "cuisine", label: `Matches your ${r.cuisine} taste` });
  }
  // Style
  if (prefs.cooking_styles.length > 0 && r.cooking_style && prefs.cooking_styles.includes(r.cooking_style)) {
    score += 12;
    reasons.push({ kind: "style", label: `${r.cooking_style} style you like` });
  }
  // Spice tolerance
  if (prefs.spice_level && r.spice_level) {
    const u = SPICE_RANK[prefs.spice_level] ?? 2;
    const v = SPICE_RANK[r.spice_level] ?? 2;
    if (v <= u) {
      score += Math.max(0, 12 - (u - v) * 3);
      reasons.push({ kind: "spice", label: "Fits your spice tolerance" });
    } else {
      score -= (v - u) * 5;
    }
  }
  // Time
  const range = timePrefRange(prefs.time_preference);
  if (range && r.time_minutes != null) {
    const [lo, hi] = range;
    if (r.time_minutes <= hi) {
      score += 14;
      reasons.push({ kind: "time", label: `Ready within your time (${r.time_minutes} min)` });
    } else {
      score -= Math.min(20, (r.time_minutes - hi) / 5);
    }
  }
  // Vegan diet
  if (prefs.diet === "vegan") {
    if (r.is_vegan) {
      score += 18;
      reasons.push({ kind: "vegan", label: "Vegan friendly" });
    } else {
      blocked = true;
    }
  }
  // Allergens
  if (prefs.allergens && prefs.allergens.length > 0) {
    const hit = (r.allergens ?? []).some((a) =>
      prefs.allergens!.some((u) => u.toLowerCase() === a.toLowerCase()),
    );
    if (hit) blocked = true;
    else {
      score += 8;
      reasons.push({ kind: "allergen_safe", label: "Avoids your allergens" });
    }
  }
  // Pantry match (uses pre-computed match if available)
  if (prefs.pantry && prefs.pantry.length > 0 && r.match) {
    if (r.match.status === "full") {
      score += 22;
      reasons.push({ kind: "pantry", label: "You have all the ingredients" });
    } else if (r.match.status === "partial") {
      score += 8 + r.match.matchedCount;
      reasons.push({
        kind: "pantry",
        label: `You have ${r.match.matchedCount} of ${r.match.requiredCount} ingredients`,
      });
    }
  }
  // Light popularity boost
  score += Math.min(10, (r.like_count ?? 0) * 0.5);
  return { score, reasons, blocked };
}

/** Returns top recommendations for the user, with reason chips. */
export async function fetchRecommendations(userId: string, limit = 8): Promise<Recommended[]> {
  const prefs = await loadUserPrefs(userId);
  if (!prefs) return [];

  // Pull a wide pool to rank.
  const pool = await fetchRecipeFeed({
    sort: "recent",
    limit: 80,
    viewerId: userId,
    pantry: prefs.pantry && prefs.pantry.length > 0 ? prefs.pantry : null,
  });

  const scored: Recommended[] = pool.map((r) => {
    const { score, reasons, blocked } = scoreRecipe(r, prefs);
    return { ...r, score, reasons, blockedByAllergen: blocked };
  });

  return scored
    .filter((r) => !r.blockedByAllergen && r.reasons.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function hasAnyPreferences(prefs: UserPrefs | null): boolean {
  if (!prefs) return false;
  return (
    prefs.cuisines.length > 0 ||
    prefs.cooking_styles.length > 0 ||
    !!prefs.spice_level ||
    !!prefs.time_preference ||
    (prefs.allergens?.length ?? 0) > 0 ||
    !!prefs.diet ||
    (prefs.pantry?.length ?? 0) > 0
  );
}

// Re-export so consumers can use it without an extra import.
export { ingredientMatches };