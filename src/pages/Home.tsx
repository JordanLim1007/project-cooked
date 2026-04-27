import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { RecipeCard, RecipeCardData } from "@/components/recipe/RecipeCard";
import { Button } from "@/components/ui/button";
import { ChefHat, LogIn } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [recipes, setRecipes] = useState<RecipeCardData[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    // First-time visitors → onboarding
    if (!loading && !user && !localStorage.getItem("cooked.onboarded") && !localStorage.getItem("cooked.preferences.draft")) {
      navigate("/onboarding", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("recipes")
        .select("id,title,cover_image_url,calories,spice_level,cuisine,cooking_style,time_minutes")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      setRecipes(data ?? []);
      setFetching(false);
    })();
  }, []);

  return (
    <AppShell>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full gradient-warm shadow-card">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="font-heading text-2xl font-bold tracking-tight">COOKED</span>
          </div>
          {!user ? (
            <Link to="/auth"><Button size="sm" variant="outline"><LogIn className="mr-1.5 h-4 w-4" />Sign in</Button></Link>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        <h1 className="mb-5 text-2xl">Discover recipes</h1>

        {fetching ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="mb-3 text-muted-foreground">No recipes yet. Be the first to share!</p>
            <Link to="/upload"><Button>Upload a recipe</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {recipes.map(r => <RecipeCard key={r.id} r={r} />)}
          </div>
        )}
      </main>
    </AppShell>
  );
}
