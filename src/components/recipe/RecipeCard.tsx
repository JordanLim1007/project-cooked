import { Link } from "react-router-dom";
import { Clock, Flame, Utensils, ImageIcon, Heart } from "lucide-react";
import { useState, MouseEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  /** Optional: author display name shown on the cover with moss-glass chip. */
  author_name?: string | null;
};

export const RecipeCard = ({ r }: { r: RecipeCardData }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!r.liked_by_me);
  const [count, setCount] = useState(r.like_count ?? 0);
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

          {/* Like button — top-right glass pill */}
          <button
            onClick={toggleLike}
            aria-label={liked ? "Unlike" : "Like"}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[11px] font-semibold text-foreground shadow-card backdrop-blur-md transition-transform hover:scale-105"
          >
            <Heart className={cn("h-3.5 w-3.5", liked ? "fill-primary text-primary" : "text-foreground")} />
            {count > 0 && <span>{count}</span>}
          </button>

          {/* Author chip — bottom-left moss glassmorphism */}
          {r.author_name && (
            <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded-full border border-white/40 bg-white/55 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-xl backdrop-saturate-150">
              {r.author_name}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{r.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {r.time_minutes != null && (<span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{r.time_minutes}m</span>)}
            {r.calories != null && (<span>{r.calories} kcal</span>)}
            {r.spice_level && (<span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-primary" />{r.spice_level}</span>)}
            {r.cooking_style && (<span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{r.cooking_style}</span>)}
          </div>
        </div>
      </div>
    </Link>
  );
};
