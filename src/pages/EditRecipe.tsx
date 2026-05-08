import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CUISINES, COOKING_STYLES, SPICE_LEVELS, DIFFICULTIES, FOOD_TYPES } from "@/lib/recipe-options";
import { SelectWithOther } from "@/components/ui/select-with-other";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MealTypeSelect } from "@/components/recipe/MealTypeSelect";
import { Plus, Trash2, ImagePlus, X, ArrowLeft, Sparkles, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Ingredient = { id?: string; name: string; quantity: string; is_optional: boolean };
type Step = { id?: string; text: string };
type ExistingImg = { id: string; image_url: string; position: number };

export default function EditRecipe() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [timeMin, setTimeMin] = useState("");
  const [cuisine, setCuisine] = useState<string>("");
  const [style, setStyle] = useState<string>("");
  const [spice, setSpice] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [foodType, setFoodType] = useState<string>("");
  const [mealTypes, setMealTypes] = useState<string[]>([]);
  const [isVegan, setIsVegan] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImg[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    if (loading || !id) return;
    (async () => {
      const [{ data: r }, { data: ing }, { data: st }, { data: imgs }] = await Promise.all([
        supabase.from("recipes").select("*").eq("id", id).maybeSingle(),
        supabase.from("recipe_ingredients").select("*").eq("recipe_id", id).order("position"),
        supabase.from("recipe_steps").select("*").eq("recipe_id", id).order("position"),
        supabase.from("recipe_images").select("*").eq("recipe_id", id).order("position"),
      ]);
      if (!r) { setAllowed(false); return; }
      if (!user || (r as any).user_id !== user.id) { setAllowed(false); return; }
      setAllowed(true);
      setTitle((r as any).title ?? "");
      setDescription((r as any).description ?? "");
      setCalories((r as any).calories?.toString() ?? "");
      setTimeMin((r as any).time_minutes?.toString() ?? "");
      setCuisine((r as any).cuisine ?? "");
      setStyle((r as any).cooking_style ?? "");
      setSpice((r as any).spice_level ?? "");
      setDifficulty((r as any).difficulty ?? "");
      setFoodType((r as any).food_type ?? "");
      const mts: string[] = (r as any).meal_types ?? [];
      setMealTypes(mts.length > 0 ? mts : (r as any).meal_type ? [(r as any).meal_type] : []);
      setIsVegan(!!(r as any).is_vegan);
      setIngredients((ing ?? []).map((i: any) => ({ id: i.id, name: i.name, quantity: i.quantity ?? "", is_optional: !!i.is_optional })));
      setSteps((st ?? []).map((s: any) => ({ id: s.id, text: s.text })));
      setExistingImages((imgs ?? []) as any);
    })();
  }, [id, user, loading]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setNewFiles((prev) => [...prev, ...list].slice(0, 12 - existingImages.length));
    e.target.value = "";
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    if (!title.trim()) return toast.error("Title is required");
    const validIngs = ingredients.filter((i) => i.name.trim());
    const validSteps = steps.filter((s) => s.text.trim());
    if (validIngs.length === 0) return toast.error("Add at least one ingredient");
    if (validSteps.length === 0) return toast.error("Add at least one step");

    setBusy(true);
    try {
      // Upload new images
      const newUrls: string[] = [];
      for (const file of newFiles) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("recipe-images").upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }

      // Build ordered final image list
      const remainingImgs = existingImages.filter((i) => !removedImageIds.includes(i.id));
      const allImageUrls = [...remainingImgs.map((i) => i.image_url), ...newUrls];
      const cover = allImageUrls[0] ?? null;

      // Update recipe
      const { error: rerr } = await supabase.from("recipes").update({
        title: title.trim(),
        description: description.trim() || null,
        cover_image_url: cover,
        calories: calories ? parseInt(calories) : null,
        time_minutes: timeMin ? parseInt(timeMin) : null,
        cuisine: cuisine || null,
        cooking_style: style || null,
        spice_level: spice || null,
        difficulty: difficulty || null,
        food_type: foodType || null,
        meal_type: mealTypes[0] || null,
        meal_types: mealTypes,
        is_vegan: isVegan,
      }).eq("id", id);
      if (rerr) throw rerr;

      // Replace ingredients & steps (simple, robust): delete + reinsert.
      // Cooking progress checked_ingredient_ids may go stale — acceptable trade-off.
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
      await supabase.from("recipe_ingredients").insert(
        validIngs.map((i, idx) => ({
          recipe_id: id,
          name: i.name.trim(),
          quantity: i.quantity.trim() || null,
          position: idx,
          is_optional: i.is_optional,
        })),
      );
      await supabase.from("recipe_steps").delete().eq("recipe_id", id);
      await supabase.from("recipe_steps").insert(
        validSteps.map((s, idx) => ({ recipe_id: id, text: s.text.trim(), position: idx })),
      );

      // Image table sync: remove deleted, reinsert all positions in order
      if (removedImageIds.length > 0) {
        await supabase.from("recipe_images").delete().in("id", removedImageIds);
      }
      // Re-position remaining + insert new
      for (let i = 0; i < remainingImgs.length; i++) {
        await supabase.from("recipe_images").update({ position: i }).eq("id", remainingImgs[i].id);
      }
      if (newUrls.length > 0) {
        await supabase.from("recipe_images").insert(
          newUrls.map((url, i) => ({ recipe_id: id, image_url: url, position: remainingImgs.length + i })),
        );
      }

      toast.success("Recipe updated");
      navigate(`/recipe/${id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const reAnalyze = async () => {
    if (!id) return;
    setReanalyzing(true);
    const tid = toast.loading("Re-analyzing recipe…");
    const { error } = await supabase.functions.invoke("analyze-recipe", { body: { recipeId: id, force: true } });
    setReanalyzing(false);
    if (error) return toast.error(error.message, { id: tid });
    toast.success("Recipe re-analyzed", { id: tid });
  };

  if (allowed === false) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md p-6 pt-16 text-center">
          <h1 className="mb-3 text-2xl">Can't edit this recipe</h1>
          <p className="mb-6 text-muted-foreground">You can only edit recipes you've shared.</p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </AppShell>
    );
  }
  if (allowed === null) {
    return <AppShell><div className="p-6">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-3">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl">Edit recipe</h1>
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={reAnalyze} disabled={reanalyzing}>
              <Sparkles className="mr-1.5 h-4 w-4" /> {reanalyzing ? "Analyzing…" : "Re-analyze"}
            </Button>
          </div>
        </div>
      </header>

      <form onSubmit={save} className="mx-auto max-w-2xl space-y-5 p-5">
        <Card className="space-y-4 p-5 shadow-card">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div>
            <Label>Photos</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {existingImages.filter((i) => !removedImageIds.includes(i.id)).map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setRemovedImageIds((p) => [...p, img.id])} className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={`new-${i}`} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setNewFiles(newFiles.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {existingImages.length - removedImageIds.length + newFiles.length < 12 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary">
                  <ImagePlus className="h-5 w-5" />
                  Add photo
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
                </label>
              )}
            </div>
          </div>
        </Card>

        <Card className="grid grid-cols-2 gap-3 p-5 shadow-card">
          <div><Label>Calories</Label><Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} /></div>
          <div><Label>Time (min)</Label><Input type="number" value={timeMin} onChange={(e) => setTimeMin(e.target.value)} /></div>
          <div><Label>Cuisine</Label><SelectWithOther value={cuisine} onChange={setCuisine} options={CUISINES} /></div>
          <div><Label>Style</Label><SelectWithOther value={style} onChange={setStyle} options={COOKING_STYLES} /></div>
          <div><Label>Spice</Label>
            <Select value={spice} onValueChange={setSpice}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{SPICE_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Food type</Label><SelectWithOther value={foodType} onChange={setFoodType} options={FOOD_TYPES} /></div>
          <div className="col-span-2">
            <Label>Meal</Label>
            <p className="mb-2 text-xs text-muted-foreground">Tap any that apply.</p>
            <MealTypeSelect value={mealTypes} onChange={setMealTypes} />
          </div>
          <div className="col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={isVegan} onCheckedChange={(v) => setIsVegan(!!v)} />
              <span className="font-medium">Vegan</span>
              <span className="text-xs text-muted-foreground">— show a vegan badge on this recipe.</span>
            </label>
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ingredients</h2>
            <Button type="button" size="sm" variant="outline" onClick={() => setIngredients([...ingredients, { name: "", quantity: "", is_optional: false }])}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex gap-2">
                  <Input placeholder="Name" value={ing.name} onChange={(e) => { const c = [...ingredients]; c[i].name = e.target.value; setIngredients(c); }} />
                  <Input className="w-28" placeholder="200g" value={ing.quantity} onChange={(e) => { const c = [...ingredients]; c[i].quantity = e.target.value; setIngredients(c); }} />
                  {ingredients.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>}
                </div>
                <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={ing.is_optional} onCheckedChange={(v) => { const c = [...ingredients]; c[i].is_optional = !!v; setIngredients(c); }} />
                  Optional
                </label>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Steps</h2>
            <Button type="button" size="sm" variant="outline" onClick={() => setSteps([...steps, { text: "" }])}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-2 w-6 text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
                <Textarea rows={2} value={s.text} onChange={(e) => { const c = [...steps]; c[i].text = e.target.value; setSteps(c); }} />
                {steps.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
          </div>
        </Card>

        <Button type="submit" disabled={busy} size="lg" className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          After editing steps or ingredients, tap "Re-analyze" above to refresh AI titles, highlights, and timers.
        </p>
      </form>
    </AppShell>
  );
}