import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Trash2, Upload as UploadIcon, X, ImagePlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Ingredient = { name: string; quantity: string; is_optional: boolean };
type Step = { text: string };

export default function UploadPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", quantity: "", is_optional: false }]);
  const [steps, setSteps] = useState<Step[]>([{ text: "" }]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  if (!loading && !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md p-6 pt-16 text-center">
          <h1 className="mb-3 text-2xl">Sign in to upload</h1>
          <p className="mb-6 text-muted-foreground">You need an account to share recipes.</p>
          <Button onClick={() => navigate("/auth")} size="lg">Sign in</Button>
        </div>
      </AppShell>
    );
  }

  const addIngredient = () => setIngredients([...ingredients, { name: "", quantity: "", is_optional: false }]);
  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i));
  const addStep = () => setSteps([...steps, { text: "" }]);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setFiles([...files, ...list].slice(0, 12));
    e.target.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) return toast.error("Title is required");
    const validIngredients = ingredients.filter(i => i.name.trim());
    const validSteps = steps.filter(s => s.text.trim());
    if (validIngredients.length === 0) return toast.error("Add at least one ingredient");
    if (validSteps.length === 0) return toast.error("Add at least one step");

    setBusy(true);
    try {
      // Upload images
      const uploaded: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("recipe-images").upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }

      // Create recipe
      const { data: recipe, error: recipeErr } = await supabase.from("recipes").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        cover_image_url: uploaded[0] || null,
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
      }).select().single();
      if (recipeErr) throw recipeErr;

      const recipeId = recipe.id;
      // Insert ingredients, steps, images
      if (validIngredients.length) {
        await supabase.from("recipe_ingredients").insert(
          validIngredients.map((ing, idx) => ({
            recipe_id: recipeId,
            name: ing.name.trim(),
            quantity: ing.quantity.trim() || null,
            position: idx,
            is_optional: ing.is_optional,
          })),
        );
      }
      if (validSteps.length) {
        await supabase.from("recipe_steps").insert(
          validSteps.map((s, idx) => ({ recipe_id: recipeId, text: s.text.trim(), position: idx }))
        );
      }
      if (uploaded.length) {
        await supabase.from("recipe_images").insert(uploaded.map((url, idx) => ({ recipe_id: recipeId, image_url: url, position: idx })));
      }

      // Fire AI analysis (non-blocking) — recipe will publish to homepage when done
      supabase.functions.invoke("analyze-recipe", { body: { recipeId } }).catch((err) => {
        console.error("analyze-recipe failed", err);
      });

      toast.success("Recipe saved! Analysing before publishing…");
      navigate(`/recipe/${recipeId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-5 py-3"><h1 className="text-xl">Share a recipe</h1></div>
      </header>

      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 p-5">
        <Card className="space-y-4 p-5 shadow-card">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spicy Beef Rendang" required />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short intro..." rows={3} />
          </div>

          {/* Images */}
          <div>
            <Label>Photos</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < 12 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary">
                  <ImagePlus className="h-5 w-5" />
                  Add photo
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
                </label>
              )}
            </div>
          </div>
        </Card>

        {/* Meta */}
        <Card className="grid grid-cols-2 gap-3 p-5 shadow-card">
          <div><Label>Calories</Label><Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="450" /></div>
          <div><Label>Time (min)</Label><Input type="number" value={timeMin} onChange={(e) => setTimeMin(e.target.value)} placeholder="45" /></div>
          <div><Label>Cuisine</Label>
            <SelectWithOther value={cuisine} onChange={setCuisine} options={CUISINES} />
          </div>
          <div><Label>Style</Label>
            <SelectWithOther value={style} onChange={setStyle} options={COOKING_STYLES} />
          </div>
          <div><Label>Spice</Label>
            <Select value={spice} onValueChange={setSpice}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{SPICE_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Food type</Label>
            <SelectWithOther value={foodType} onChange={setFoodType} options={FOOD_TYPES} />
          </div>
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

        {/* Ingredients */}
        <Card className="p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ingredients</h2>
            <Button type="button" size="sm" variant="outline" onClick={addIngredient}><Plus className="h-4 w-4" /></Button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Tick "Optional" for garnishes or items not strictly needed. Our AI will also flag obvious optionals automatically.</p>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex gap-2">
                  <Input placeholder="Name (e.g. Onion)" value={ing.name} onChange={(e) => { const c = [...ingredients]; c[i].name = e.target.value; setIngredients(c); }} />
                  <Input className="w-28" placeholder="200g" value={ing.quantity} onChange={(e) => { const c = [...ingredients]; c[i].quantity = e.target.value; setIngredients(c); }} />
                  {ingredients.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(i)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
                <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={ing.is_optional}
                    onCheckedChange={(v) => { const c = [...ingredients]; c[i].is_optional = !!v; setIngredients(c); }}
                  />
                  Optional
                </label>
              </div>
            ))}
          </div>
        </Card>

        {/* Steps */}
        <Card className="p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Steps</h2>
            <Button type="button" size="sm" variant="outline" onClick={addStep}><Plus className="h-4 w-4" /></Button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Write one short, clear action per step. Our AI will give it a title and highlight the key parts (times, temperatures, ingredients).</p>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-2 w-6 text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
                <Textarea rows={2} placeholder="e.g. Chop the onion finely" value={s.text} onChange={(e) => { const c = [...steps]; c[i].text = e.target.value; setSteps(c); }} />
                {steps.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(i)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
          </div>
        </Card>

        <Button type="submit" disabled={busy} size="lg" className="w-full">
          <UploadIcon className="mr-2 h-4 w-4" />
          {busy ? "Publishing..." : "Publish recipe"}
        </Button>
      </form>
    </AppShell>
  );
}
