import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Clock, Flame, Utensils, Trash2 } from "lucide-react";
import { StepPlayer } from "@/components/recipe/StepPlayer";
import { Reviews } from "@/components/recipe/Reviews";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Recipe = { id: string; user_id: string; title: string; description: string | null; cover_image_url: string | null; calories: number | null; spice_level: string | null; cuisine: string | null; cooking_style: string | null; time_minutes: number | null; food_type: string | null; meal_type: string | null; difficulty: string | null; profiles?: { display_name: string | null; avatar_url: string | null } | null };
type Ingredient = { id: string; name: string; quantity: string | null; image_url: string | null; position: number };
type Step = { id: string; text: string; position: number; animation_key: string | null };

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: r }, { data: ing }, { data: st }] = await Promise.all([
        supabase.from("recipes").select("*,profiles(display_name,avatar_url)").eq("id", id).maybeSingle(),
        supabase.from("recipe_ingredients").select("*").eq("recipe_id", id).order("position"),
        supabase.from("recipe_steps").select("*").eq("recipe_id", id).order("position"),
      ]);
      setRecipe(r as any);
      setIngredients(ing ?? []);
      setSteps(st ?? []);
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

  return (
    <AppShell>
      {/* Cover */}
      <div className="relative">
        {recipe.cover_image_url ? (
          <img src={recipe.cover_image_url} alt={recipe.title} className="h-64 w-full object-cover md:h-80" />
        ) : (
          <div className="h-64 w-full gradient-warm md:h-80" />
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
      </div>

      <main className="mx-auto max-w-2xl space-y-6 p-5">
        <div>
          {recipe.cuisine && <span className="mb-2 inline-block rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-semibold text-secondary-deep">{recipe.cuisine}</span>}
          <h1 className="text-3xl">{recipe.title}</h1>
          {recipe.description && <p className="mt-2 text-muted-foreground">{recipe.description}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {recipe.time_minutes && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{recipe.time_minutes} min</span>}
            {recipe.calories && <span>{recipe.calories} kcal</span>}
            {recipe.spice_level && <span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-primary" />{recipe.spice_level}</span>}
            {recipe.cooking_style && <span className="inline-flex items-center gap-1"><Utensils className="h-4 w-4" />{recipe.cooking_style}</span>}
          </div>
        </div>

        {/* Ingredients horizontal scroll */}
        {ingredients.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-bold">Ingredients</h2>
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
              {ingredients.map(ing => (
                <div key={ing.id} className="flex w-20 shrink-0 flex-col items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-bold text-primary">
                    {ing.image_url ? <img src={ing.image_url} alt={ing.name} className="h-full w-full object-cover" /> : ing.name[0]?.toUpperCase()}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold">{ing.name}</p>
                  {ing.quantity && <p className="text-[10px] text-muted-foreground">{ing.quantity}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Step Player */}
        <section>
          <h2 className="mb-3 text-xl font-bold">Cook it step by step</h2>
          <StepPlayer steps={steps} />
        </section>

        {/* Reviews */}
        <Reviews recipeId={recipe.id} />

        {/* Author */}
        <Link to={`/profile/${recipe.user_id}`} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-4 transition-colors hover:bg-muted">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
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
