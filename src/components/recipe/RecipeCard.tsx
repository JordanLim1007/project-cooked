import { Link } from "react-router-dom";
import { Clock, Flame, Utensils, ImageIcon, Heart, Bookmark, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, MouseEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/format-time";

export type RecipeCardData = {
  id: string;
  title: string;
  cover_image_url: string | null;
  calories: number | null;
  spice_level: string | null;
  cuisine: string | null;
  cooking_style: string | null;
  time_minutes: number | null;
  /** Optional: total likes for ranking + display. */
  like_count?: number;
  /** Optional: whether the current user already liked this recipe. */
  liked_by_me?: boolean;
  /** Optional: whether the current user has saved this recipe. */
  saved_by_me?: boolean;
  /** Optional: author display name shown on the cover with moss-glass chip. */
  author_name?: string | null;
  /** Optional: pantry-match summary for the search "what's in my fridge" mode. */
  match?: {
    status: "full" | "partial" | "none";
    missingRequired: string[];
    missingOptional: string[];
    matchedCount: number;
    requiredCount: number;
  };
};

export const RecipeCard = ({ r }: { r: RecipeCardData }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!r.liked_by_me);
  const [count, setCount] = useState(r.like_count ?? 0);
  const [saved, setSaved] = useState(!!r.saved_by_me);
  const [busy, setBusy] = useState(false);

  const toggleLike = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    if (busy) return;
    setBusy(true);
    // optimistic
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    if (next) {
      const { error } = await supabase.from("recipe_likes").insert({ user_id: user.id, recipe_id: r.id });
      if (error) { setLiked(false); setCount((c) => c - 1); }
    } else {
      const { error } = await supabase.from("recipe_likes").delete().eq("user_id", user.id).eq("recipe_id", r.id);
      if (error) { setLiked(true); setCount((c) => c + 1); }
    }
    setBusy(false);
  };

  const toggleSave = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    const next = !saved;
    setSaved(next);
    if (next) {
      const { error } = await supabase.from("saved_recipes").insert({ user_id: user.id, recipe_id: r.id });
      if (error) setSaved(false);
    } else {
      const { error } = await supabase.from("saved_recipes").delete().eq("user_id", user.id).eq("recipe_id", r.id);
      if (error) setSaved(true);
    }
  };

  return (
    <Link to={`/recipe/${r.id}`} className="group block animate-fade-in">
      <div className="overflow-hidden rounded-2xl bg-card shadow-card transition-all group-hover:shadow-elevated group-hover:-translate-y-0.5">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
          {r.cover_image_url ? (
            <img src={r.cover_image_url} alt={r.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
              <ImageIcon className="h-8 w-8 opacity-40" />
            </div>
          )}
          {r.cuisine && (
            <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
              {r.cuisine}
            </span>
          )}

          {/* Like (heart) + Save (bookmark) — separate pills, top-right */}
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              onClick={toggleSave}
              aria-label={saved ? "Remove from saved" : "Save recipe"}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/85 text-foreground shadow-card backdrop-blur-md transition-transform hover:scale-105"
            >
              <Bookmark className={cn("h-3.5 w-3.5", saved ? "fill-foreground" : "")} />
            </button>
            <button
              onClick={toggleLike}
              aria-label={liked ? "Unlike" : "Like"}
              className="inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[11px] font-semibold text-foreground shadow-card backdrop-blur-md transition-transform hover:scale-105"
            >
              <Heart className={cn("h-3.5 w-3.5", liked ? "fill-primary text-primary" : "text-foreground")} />
              {count > 0 && <span>{count}</span>}
            </button>
          </div>

        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{r.title}</h3>
          {r.match && (
            <div className="mt-1.5">
              {r.match.status === "full" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                  <CheckCircle2 className="h-3 w-3" /> Full match
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                  <AlertTriangle className="h-3 w-3" /> Missing {r.match.missingRequired.length}
                </span>
              )}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {r.time_minutes != null && (<span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatMinutes(r.time_minutes)}</span>)}
            {r.calories != null && (<span>{r.calories} kcal</span>)}
            {r.spice_level && (<span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-primary" />{r.spice_level}</span>)}
            {r.cooking_style && (<span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{r.cooking_style}</span>)}
          </div>
        </div>
      </div>
    </Link>
  );
};
