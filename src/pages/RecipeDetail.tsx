import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Bookmark, Clock, Flame, Utensils, Trash2, Lightbulb, Loader2, CalendarPlus, Check, Pencil, MonitorSmartphone, Volume2, VolumeX, Leaf, AlertTriangle } from "lucide-react";
import { isMuted, setMuted } from "@/lib/timer-sound";
import { requestWakeLock, type WakeLockHandle } from "@/lib/wake-lock";
import { InstructionList } from "@/components/recipe/InstructionList";
import { IngredientChecklist } from "@/components/recipe/IngredientChecklist";
import { Reviews } from "@/components/recipe/Reviews";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { loadProgress, saveProgress, clearProgress, type TimerState } from "@/lib/cooking-progress";
import { format } from "date-fns";
import { formatMinutes } from "@/lib/format-time";

type Recipe = { id: string; user_id: string; title: string; description: string | null; cover_image_url: string | null; calories: number | null; spice_level: string | null; cuisine: string | null; cooking_style: string | null; time_minutes: number | null; food_type: string | null; meal_type: string | null; difficulty: string | null; tips: string[] | null; is_published: boolean; is_vegan?: boolean | null; allergens?: string[] | null; profiles?: { display_name: string | null; avatar_url: string | null } | null };
type Ingredient = { id: string; name: string; quantity: string | null; image_url: string | null; position: number; is_optional: boolean };
type Step = { id: string; text: string; position: number; title: string | null; keywords: string[] | null; emphasis: { phrase: string; level: "md" | "lg" | "xl" }[] | null; timer_seconds: number | null };
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
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [mutedState, setMutedFlag] = useState(isMuted());
  const [wakeLock, setWakeLock] = useState<WakeLockHandle | null>(null);
  const [loading, setLoading] = useState(true);

  // Cooking progress
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [timer, setTimer] = useState<TimerState>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const hydrated = useRef(false);
  const stepsRef = useRef<HTMLDivElement>(null);

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
        const { data: myLike } = await supabase.from("recipe_likes").select("recipe_id").eq("user_id", user.id).eq("recipe_id", id).maybeSingle();
        setLiked(!!myLike);
      }
      const { count: lc } = await supabase.from("recipe_likes").select("recipe_id", { count: "exact", head: true }).eq("recipe_id", id);
      setLikeCount(lc ?? 0);
      // Hydrate progress (cloud if logged in, else local)
      const prog = await loadProgress(id, user?.id ?? null);
      if (prog) {
        setCheckedIds(prog.checked_ingredient_ids ?? []);
        setCurrentStep(prog.current_step ?? 0);
        setTimer((prog.timer_state as TimerState) ?? null);
      }
      hydrated.current = true;

      // Backfill AI analysis for older recipes that never got it
      const stepsList = ((st as any) ?? []) as Step[];
      const needsAnalysis =
        stepsList.length > 0 &&
        stepsList.every((s) => !s.emphasis || s.emphasis.length === 0) &&
        stepsList.every((s) => !s.title) &&
        stepsList.every((s) => !s.timer_seconds);
      const ownerViewing = (r as any)?.user_id === user?.id;
      if (needsAnalysis && ownerViewing) {
        supabase.functions
          .invoke("analyze-recipe", { body: { recipeId: id } })
          .then(async () => {
            const [{ data: st2 }, { data: r2 }] = await Promise.all([
              supabase.from("recipe_steps").select("*").eq("recipe_id", id).order("position"),
              supabase.from("recipes").select("tips,is_published").eq("id", id).maybeSingle(),
            ]);
            if (st2) setSteps(st2 as any);
            if (r2) setRecipe((prev) => (prev ? { ...prev, tips: (r2 as any).tips, is_published: (r2 as any).is_published } : prev));
          })
          .catch((err) => console.error("re-analyze failed", err));
      }
    })();
  }, [id, user?.id]);

  // Smart resume: scroll to last step
  useEffect(() => {
    if (!hydrated.current || currentStep <= 0) return;
    const el = document.getElementById(`step-${currentStep}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Only on initial hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated.current]);

  const persist = (patch: Partial<{ checked_ingredient_ids: string[]; current_step: number; timer_state: TimerState; is_complete: boolean }>) => {
    if (!id) return;
    saveProgress(id, user?.id ?? null, patch).catch((e) => console.error("save progress", e));
  };

  const toggleChecked = (ingId: string) => {
    setCheckedIds((prev) => {
      const next = prev.includes(ingId) ? prev.filter((x) => x !== ingId) : [...prev, ingId];
      persist({ checked_ingredient_ids: next });
      return next;
    });
  };

  const markStepDone = (idx: number) => {
    const next = idx < currentStep ? idx : idx + 1;
    setCurrentStep(next);
    const complete = next >= steps.length;
    persist({ current_step: next, is_complete: complete });
    if (complete) toast.success("Recipe complete! Great job 🎉");
  };

  const handleTimerChange = (
    stepIndex: number,
    payload: { endsAt: number | null; remaining: number | null },
  ) => {
    const next: TimerState =
      payload.endsAt == null && payload.remaining == null
        ? null
        : { stepIndex, endsAt: payload.endsAt, remaining: payload.remaining };
    setTimer(next);
    persist({ timer_state: next });
  };

  const resetCookingProgress = async () => {
    if (!id) return;
    setCheckedIds([]); setCurrentStep(0); setTimer(null);
    await clearProgress(id, user?.id ?? null);
    toast.success("Progress cleared");
  };

  const scheduleForDate = async (date: Date | undefined) => {
    if (!user) { navigate("/auth"); return; }
    if (!date || !id) return;
    setScheduleBusy(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const { error } = await supabase.from("recipe_schedule").insert({
      user_id: user.id,
      recipe_id: id,
      scheduled_date: dateStr,
    });
    setScheduleBusy(false);
    setScheduleDate(undefined);
    if (error) toast.error(error.message);
    else toast.success(`Scheduled for ${format(date, "EEE, MMM d")}`);
  };

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

  const toggleLike = async () => {
    if (!user) { navigate("/auth"); return; }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next) {
      const { error } = await supabase.from("recipe_likes").insert({ user_id: user.id, recipe_id: id! });
      if (error) { setLiked(false); setLikeCount((c) => c - 1); }
    } else {
      const { error } = await supabase.from("recipe_likes").delete().eq("user_id", user.id).eq("recipe_id", id!);
      if (error) { setLiked(true); setLikeCount((c) => c + 1); }
    }
  };

  const toggleWakeLock = async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      toast("Screen can sleep again");
    } else {
      const w = await requestWakeLock();
      if (!w) { toast.error("Keep awake not supported on this browser"); return; }
      setWakeLock(w);
      toast.success("Screen will stay awake");
    }
  };

  // Release wake lock on unmount
  useEffect(() => () => { wakeLock?.release(); }, [wakeLock]);

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
            <button onClick={toggleLike} aria-label={liked ? "Unlike" : "Like"} className="flex h-10 items-center gap-1 rounded-full bg-background/90 px-3 backdrop-blur-md shadow-card">
              <Heart className={cn("h-5 w-5", liked ? "fill-primary text-primary" : "")} />
              {likeCount > 0 && <span className="text-xs font-semibold">{likeCount}</span>}
            </button>
            <button onClick={toggleSave} className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-md shadow-card">
              <Bookmark className={cn("h-5 w-5", saved ? "fill-foreground" : "")} />
            </button>
            {isOwner && (
              <button onClick={() => navigate(`/recipe/${recipe.id}/edit`)} aria-label="Edit recipe" className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-md shadow-card">
                <Pencil className="h-5 w-5" />
              </button>
            )}
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
          <div className="flex flex-wrap items-center gap-2">
            {recipe.cuisine && (
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{recipe.cuisine}</p>
            )}
            {recipe.is_vegan && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                <Leaf className="h-3 w-3" /> Vegan
              </span>
            )}
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{recipe.title}</h1>
          {recipe.description && <p className="text-base leading-relaxed text-muted-foreground">{recipe.description}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1 text-sm text-muted-foreground">
            {recipe.time_minutes && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /><strong className="font-semibold text-foreground">{formatMinutes(recipe.time_minutes)}</strong></span>}
            {recipe.calories && <span><strong className="font-semibold text-foreground">{recipe.calories}</strong> kcal</span>}
            {recipe.spice_level && <span className="inline-flex items-center gap-1.5"><Flame className="h-4 w-4" />{recipe.spice_level}</span>}
            {recipe.cooking_style && <span className="inline-flex items-center gap-1.5"><Utensils className="h-4 w-4" />{recipe.cooking_style}</span>}
          </div>
          {recipe.allergens && recipe.allergens.length > 0 && (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" /> Contains allergens
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recipe.allergens.map((a) => (
                  <span key={a} className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[11px] font-medium text-white">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
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

        {/* Schedule action */}
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarPlus className="mr-2 h-4 w-4" /> Schedule
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={scheduleDate}
                onSelect={(d) => { setScheduleDate(d); if (d) scheduleForDate(d); }}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant={wakeLock ? "default" : "outline"}
            size="sm"
            onClick={toggleWakeLock}
          >
            <MonitorSmartphone className="mr-2 h-4 w-4" />
            {wakeLock ? "Screen awake" : "Keep awake"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { const next = !mutedState; setMuted(next); setMutedFlag(next); }}
            aria-label={mutedState ? "Unmute timer" : "Mute timer"}
          >
            {mutedState ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
            {mutedState ? "Sound off" : "Sound on"}
          </Button>
          {(checkedIds.length > 0 || currentStep > 0) && (
            <Button variant="ghost" size="sm" onClick={resetCookingProgress} disabled={scheduleBusy}>
              Reset progress
            </Button>
          )}
        </div>

        <hr className="border-border" />

        {/* Ingredients — interactive checklist */}
        {ingredients.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ingredients</h2>
              <span className="text-xs text-muted-foreground">
                {checkedIds.length}/{ingredients.length} ticked
              </span>
            </div>
            <IngredientChecklist
              ingredients={ingredients}
              checkedIds={checkedIds}
              onToggle={toggleChecked}
            />
          </section>
        )}

        <hr className="border-border" />

        {/* Instructions */}
        <section ref={stepsRef}>
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Instructions</h2>
          <InstructionList
            steps={steps}
            interactive={{
              currentStep,
              onStepDone: markStepDone,
              timerEndsAt: timer?.endsAt ?? null,
              timerStepIndex: timer?.stepIndex ?? null,
              timerRemaining: timer?.remaining ?? null,
              onTimerChange: handleTimerChange,
            }}
          />
          {currentStep >= steps.length && steps.length > 0 && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-300/50 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-950/40 dark:text-emerald-100">
              <Check className="h-4 w-4" /> All steps complete!
            </div>
          )}
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
