import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Clock, Flame, Utensils, Trash2, Lightbulb, Loader2 } from "lucide-react";
import { InstructionList } from "@/components/recipe/InstructionList";
import { Reviews } from "@/components/recipe/Reviews";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Recipe = { id: string; user_id: string; title: string; description: string | null; cover_image_url: string | null; calories: number | null; spice_level: string | null; cuisine: string | null; cooking_style: string | null; time_minutes: number | null; food_type: string | null; meal_type: string | null; difficulty: string | null; tips: string[] | null; is_published: boolean; profiles?: { display_name: string | null; avatar_url: string | null } | null };
type Ingredient = { id: string; name: string; quantity: string | null; image_url: string | null; position: number };
type Step = { id: string; text: string; position: number; title: string | null; keywords: string[] | null; emphasis: { phrase: string; level: "md" | "lg" | "xl" }[] | null };
type RecipeImage = { id: string; image_url: string; position: number };

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [images, setImages] = useState<RecipeImage[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: r }, { data: ing }, { data: st }, { data: imgs }] = await Promise.all([
        supabase.from("recipes").select("*,profiles!recipes_author_profile_fkey(display_name,avatar_url)").eq("id", id).maybeSingle(),
        supabase.from("recipe_ingredients").select("*").eq("recipe_id", id).order("position"),
        supabase.from("recipe_steps").select("*").eq("recipe_id", id).order("position"),
        supabase.from("recipe_images").select("*").eq("recipe_id", id).order("position"),
      ]);
      setRecipe(r as any);
      setIngredients(ing ?? []);
      setSteps((st as any) ?? []);
      setImages(imgs ?? []);
      setLoading(false);
      if (user) {
        const { data } = await supabase.from("saved_recipes").select("recipe_id").eq("user_id", user.id).eq("recipe_id", id).maybeSingle();
        setSaved(!!data);
      }
    })();
  }, [id, user?.id]);

  const toggleSave = async () => {
    if (!user) { navigate("/auth"); return; }
    if (saved) {
      await supabase.from("saved_recipes").delete().eq("user_id", user.id).eq("recipe_id", id!);
      setSaved(false);
    } else {
      await supabase.from("saved_recipes").insert({ user_id: user.id, recipe_id: id! });
      setSaved(true);
      toast.success("Saved!");
    }
  };

  const deleteRecipe = async () => {
    if (!recipe) return;
    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
    if (error) return toast.error(error.message);
    toast.success("Recipe deleted");
    navigate("/profile");
  };

  if (loading) return <AppShell><div className="p-6">Loading...</div></AppShell>;
  if (!recipe) return <AppShell><div className="p-6">Recipe not found.</div></AppShell>;

  const isOwner = user?.id === recipe.user_id;
  const isAnalyzing = !recipe.is_published;

  return (
    <AppShell>
      {/* Cover */}
      <div className="relative">
        {recipe.cover_image_url ? (
          <img src={recipe.cover_image_url} alt={recipe.title} className="h-64 w-full object-cover md:h-80" />
        ) : (
          <div className="h-64 w-full bg-muted md:h-80" />
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-md shadow-card">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            <button onClick={toggleSave} className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-md shadow-card">
              <Heart className={cn("h-5 w-5 transition-colors", saved ? "fill-primary text-primary" : "")} />
            </button>
            {isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-md shadow-card">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this recipe?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently remove it from the homepage, search, and your profile.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteRecipe} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Author chip overlay — bottom-left, moss glassmorphism */}
        {recipe.profiles && (
          <Link
            to={`/profile/${recipe.user_id}`}
            className="absolute bottom-3 left-3 inline-flex max-w-[70%] items-center gap-2 rounded-full border border-white/45 bg-white/55 py-1 pl-1 pr-3 shadow-card backdrop-blur-xl backdrop-saturate-150 transition-transform hover:scale-[1.02]"
          >
            {recipe.profiles.avatar_url ? (
              <img
                src={recipe.profiles.avatar_url}
                alt={recipe.profiles.display_name ?? ""}
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                {recipe.profiles.display_name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            <span className="truncate text-xs font-semibold text-foreground">
              {recipe.profiles.display_name || "Anonymous"}
            </span>
          </Link>
        )}
      </div>

      <main className="mx-auto max-w-2xl space-y-10 px-5 py-8">
        {/* Title block */}
        <header className="space-y-3">
          {recipe.cuisine && (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{recipe.cuisine}</p>
          )}
          <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{recipe.title}</h1>
          {recipe.description && <p className="text-base leading-relaxed text-muted-foreground">{recipe.description}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1 text-sm text-muted-foreground">
            {recipe.time_minutes && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /><strong className="font-semibold text-foreground">{recipe.time_minutes} min</strong></span>}
            {recipe.calories && <span><strong className="font-semibold text-foreground">{recipe.calories}</strong> kcal</span>}
            {recipe.spice_level && <span className="inline-flex items-center gap-1.5"><Flame className="h-4 w-4" />{recipe.spice_level}</span>}
            {recipe.cooking_style && <span className="inline-flex items-center gap-1.5"><Utensils className="h-4 w-4" />{recipe.cooking_style}</span>}
          </div>
        </header>

        {/* Extra photos gallery */}
        {images.length > 1 && (
          <section>
            <div className="grid grid-cols-3 gap-2">
              {images.slice(1).map((img) => (
                <div key={img.id} className="aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={img.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Analyzing notice */}
        {isAnalyzing && isOwner && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            We're analysing your recipe to highlight the important parts. It will appear on the homepage shortly.
          </div>
        )}

        <hr className="border-border" />

        {/* Ingredients — bullet list */}
        {ingredients.length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ingredients</h2>
            <ul className="space-y-2.5">
              {ingredients.map((ing) => (
                <li key={ing.id} className="flex items-baseline gap-3 text-base">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                  <span className="flex-1">
                    {ing.quantity && <strong className="font-semibold">{ing.quantity}</strong>}
                    {ing.quantity && " "}
                    <span className="text-foreground/80">{ing.name}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <hr className="border-border" />

        {/* Instructions */}
        <section>
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Instructions</h2>
          <InstructionList steps={steps} />
        </section>

        {/* Tips */}
        {recipe.tips && recipe.tips.length > 0 && (
          <>
            <hr className="border-border" />
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Lightbulb className="h-4 w-4" /> Tips
              </h2>
              <ul className="space-y-2.5 rounded-xl bg-muted/40 p-5">
                {recipe.tips.map((t, i) => (
                  <li key={i} className="flex items-baseline gap-3 text-sm leading-relaxed text-foreground/80">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <hr className="border-border" />

        {/* Reviews */}
        <Reviews recipeId={recipe.id} />

        {/* Author */}
        <Link to={`/profile/${recipe.user_id}`} className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {recipe.profiles?.display_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Shared by</p>
            <p className="text-sm font-semibold">{recipe.profiles?.display_name || "Anonymous"}</p>
          </div>
        </Link>
      </main>
    </AppShell>
  );
}
