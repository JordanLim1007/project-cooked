import { Link } from "react-router-dom";
import { Clock, Flame, Utensils } from "lucide-react";
import { StepAnimation } from "@/components/animations/CookingAnimations";

export type RecipeCardData = {
  id: string;
  title: string;
  cover_image_url: string | null;
  calories: number | null;
  spice_level: string | null;
  cuisine: string | null;
  cooking_style: string | null;
  time_minutes: number | null;
};

export const RecipeCard = ({ r }: { r: RecipeCardData }) => (
  <Link to={`/recipe/${r.id}`} className="group block animate-fade-in">
    <div className="overflow-hidden rounded-2xl bg-card shadow-card transition-all group-hover:shadow-elevated group-hover:-translate-y-0.5">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {r.cover_image_url ? (
          <img src={r.cover_image_url} alt={r.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full">
            <StepAnimation stepText={r.title} animationKey={null} />
          </div>
        )}
        {r.cuisine && (
          <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
            {r.cuisine}
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
