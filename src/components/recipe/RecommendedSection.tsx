import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Settings2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchRecommendations, type Recommended } from "@/lib/recommend";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { Button } from "@/components/ui/button";

export function RecommendedSection() {
  const { user } = useAuth();
  const [items, setItems] = useState<Recommended[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setItems([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const recs = await fetchRecommendations(user.id, 8);
      if (!cancelled) { setItems(recs); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!user) return null;

  if (loading) {
    return (
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Recommended for you</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  // Empty: prompt to set preferences
  if (!items || items.length === 0) {
    return (
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Recommended for you</h2>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Set your preferences to get smarter recipe recommendations.
          </p>
          <Link to="/onboarding">
            <Button size="sm"><Settings2 className="mr-1.5 h-4 w-4" /> Set preferences</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Recommended for you</h2>
        </div>
        <Link to="/onboarding" className="text-xs text-muted-foreground hover:text-foreground">
          Edit preferences
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {items.map((r) => (
          <div key={r.id} className="space-y-1.5">
            <RecipeCard r={r} />
            <div className="flex flex-wrap gap-1 px-0.5">
              {r.reasons.slice(0, 2).map((reason, i) => (
                <span
                  key={i}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  {reason.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}