import { supabase } from "@/integrations/supabase/client";
import type { RecipeCardData } from "@/components/recipe/RecipeCard";
import { classifyRecipe, type RecipeMatch } from "@/lib/ingredient-match";

type FeedOptions = {
  /** Optional title ilike filter */
  q?: string | null;
  cuisine?: string | null;
  cooking_style?: string | null;
  difficulty?: string | null;
  user_id?: string | null;
  /** Sort mode: 'top' = by likes desc then recency, 'recent' = by created_at desc */
  sort?: "top" | "recent";
  limit?: number;
  /** Current user id, to compute liked_by_me */
  viewerId?: string | null;
  /** Pantry items the user currently has — enables match classification + filtering. */
  pantry?: string[] | null;
};

export type FeedRecipe = RecipeCardData & { match?: RecipeMatch };

/** Fetch recipes plus author + like counts, ready for RecipeCard. */
export async function fetchRecipeFeed(opts: FeedOptions = {}): Promise<FeedRecipe[]> {
  const { sort = "top", limit = 50, viewerId } = opts;

  let query = supabase
    .from("recipes")
    .select(
      "id,title,cover_image_url,calories,spice_level,cuisine,cooking_style,time_minutes,is_vegan,allergens,user_id,created_at," +
        "profiles!recipes_author_profile_fkey(display_name)"
    )
    .eq("is_published", true)
    .limit(limit);

  if (opts.q && opts.q.trim()) query = query.ilike("title", `%${opts.q.trim()}%`);
  if (opts.cuisine) query = query.eq("cuisine", opts.cuisine);
  if (opts.cooking_style) query = query.eq("cooking_style", opts.cooking_style);
  if (opts.difficulty) query = query.eq("difficulty", opts.difficulty);
  if (opts.user_id) query = query.eq("user_id", opts.user_id);

  // Always order by created_at as a tiebreaker / fallback; we'll re-sort by likes after counting.
  query = query.order("created_at", { ascending: false });

  const { data: rows, error } = await query;
  if (error) {
    console.error("fetchRecipeFeed", error);
    return [];
  }
  const recipes = rows ?? [];
  if (recipes.length === 0) return [];

  const ids = recipes.map((r: any) => r.id);
  const wantPantry = !!(opts.pantry && opts.pantry.length > 0);
  const [{ data: likes }, { data: myLikes }, ingResp] = await Promise.all([
    supabase.from("recipe_likes").select("recipe_id").in("recipe_id", ids),
    viewerId
      ? supabase.from("recipe_likes").select("recipe_id").eq("user_id", viewerId).in("recipe_id", ids)
      : Promise.resolve({ data: [] as { recipe_id: string }[] }),
    wantPantry
      ? supabase.from("recipe_ingredients").select("recipe_id,name,is_optional").in("recipe_id", ids)
      : Promise.resolve({ data: [] as { recipe_id: string; name: string; is_optional: boolean }[] }),
  ]);

  const counts = new Map<string, number>();
  for (const l of likes ?? []) counts.set(l.recipe_id, (counts.get(l.recipe_id) ?? 0) + 1);
  const liked = new Set((myLikes ?? []).map((l) => l.recipe_id));

  // Group ingredients by recipe for classification
  const ingByRecipe = new Map<string, { name: string; is_optional: boolean }[]>();
  for (const ing of ingResp.data ?? []) {
    const arr = ingByRecipe.get(ing.recipe_id) ?? [];
    arr.push({ name: ing.name, is_optional: ing.is_optional });
    ingByRecipe.set(ing.recipe_id, arr);
  }

  const enriched: FeedRecipe[] = recipes.map((r: any) => ({
    id: r.id,
    title: r.title,
    cover_image_url: r.cover_image_url,
    calories: r.calories,
    spice_level: r.spice_level,
    cuisine: r.cuisine,
    cooking_style: r.cooking_style,
    time_minutes: r.time_minutes,
    is_vegan: !!r.is_vegan,
    allergens: (r.allergens ?? []) as string[],
    like_count: counts.get(r.id) ?? 0,
    liked_by_me: liked.has(r.id),
    author_name: r.profiles?.display_name ?? null,
    match: wantPantry
      ? classifyRecipe(opts.pantry!, ingByRecipe.get(r.id) ?? [])
      : undefined,
  }));

  if (wantPantry) {
    // Drop "none" matches and sort: full > partial, then by matchedCount desc, then likes
    const filtered = enriched.filter((r) => r.match && r.match.status !== "none");
    filtered.sort((a, b) => {
      const order = { full: 0, partial: 1, none: 2 } as const;
      const sa = order[a.match!.status];
      const sb = order[b.match!.status];
      if (sa !== sb) return sa - sb;
      const m = (b.match!.matchedCount - a.match!.matchedCount);
      if (m !== 0) return m;
      return (b.like_count ?? 0) - (a.like_count ?? 0);
    });
    return filtered;
  }

  if (sort === "top") {
    enriched.sort((a, b) => (b.like_count! - a.like_count!));
  }
  return enriched;
}