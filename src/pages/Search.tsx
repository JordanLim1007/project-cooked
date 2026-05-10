import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RecipeCard, RecipeCardData } from "@/components/recipe/RecipeCard";
import { CUISINES, COOKING_STYLES, DIFFICULTIES } from "@/lib/recipe-options";
import { Search as SearchIcon, X, Plus, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { fetchRecipeFeed } from "@/lib/recipe-feed";
import { COMMON_PANTRY } from "@/lib/ingredient-match";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSearch } from "@/components/search/UserSearch";

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={cn(
    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
  )}>{children}</button>
);

export default function SearchPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<"recipes" | "users">("recipes");
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [results, setResults] = useState<RecipeCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"all" | "pantry">("all");
  const [pantry, setPantry] = useState<string[]>([]);
  const [pantryInput, setPantryInput] = useState("");

  const togglePantry = (name: string) => {
    setPantry((prev) =>
      prev.some((p) => p.toLowerCase() === name.toLowerCase())
        ? prev.filter((p) => p.toLowerCase() !== name.toLowerCase())
        : [...prev, name],
    );
  };
  const addPantryFromInput = () => {
    const t = pantryInput.trim();
    if (!t) return;
    if (!pantry.some((p) => p.toLowerCase() === t.toLowerCase())) setPantry((prev) => [...prev, t]);
    setPantryInput("");
  };

  const runSearch = async () => {
    setLoading(true);
    const data = await fetchRecipeFeed({
      q,
      cuisine,
      cooking_style: style,
      difficulty,
      sort: "top",
      viewerId: user?.id ?? null,
      pantry: mode === "pantry" && pantry.length > 0 ? pantry : null,
    });
    setResults(data);
    setLoading(false);
  };

  // Debounced search on filter changes
  useEffect(() => {
    const t = setTimeout(runSearch, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cuisine, style, difficulty, user?.id, mode, pantry.join("|")]);

  const hasFilters = !!(cuisine || style || difficulty);

  return (
    <AppShell>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-5 py-3">
          <h1 className="mb-3 text-xl">Search</h1>
          <Tabs value={scope} onValueChange={(v) => setScope(v as "recipes" | "users")} className="mb-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recipes">Recipes</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
          </Tabs>
          {scope === "recipes" && (
          <Tabs value={mode} onValueChange={(v) => setMode(v as "all" | "pantry")} className="mb-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All recipes</TabsTrigger>
              <TabsTrigger value="pantry">What's in my pantry</TabsTrigger>
            </TabsList>
          </Tabs>
          )}
          {scope === "recipes" && (
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes..." className="pl-9" />
          </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-4">
        {scope === "users" ? (
          <div className="mx-auto max-w-2xl">
            <UserSearch />
          </div>
        ) : (
          <>
        {mode === "pantry" && (
          <section className="mb-5 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-start gap-2">
              <ChefHat className="mt-0.5 h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">What do you have?</p>
                <p className="text-xs text-muted-foreground">We'll show recipes you can make right now or with just a few extras.</p>
              </div>
            </div>
            {/* Selected chips */}
            {pantry.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pantry.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePantry(p)}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-xs font-medium text-background"
                  >
                    {p}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}
            {/* Free-text add */}
            <div className="flex gap-2">
              <Input
                value={pantryInput}
                onChange={(e) => setPantryInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPantryFromInput(); } }}
                placeholder="Type an ingredient (e.g. tomato)..."
              />
              <Button type="button" size="sm" onClick={addPantryFromInput}><Plus className="h-4 w-4" /></Button>
            </div>
            {/* Curated list */}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Common</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PANTRY.map((c) => {
                  const active = pantry.some((p) => p.toLowerCase() === c.toLowerCase());
                  return (
                    <button
                      key={c}
                      onClick={() => togglePantry(c)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            {pantry.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setPantry([])}>
                <X className="mr-1 h-3 w-3" /> Clear pantry
              </Button>
            )}
          </section>
        )}

        {/* Filter rows */}
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cuisine</p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {CUISINES.map(c => <Pill key={c} active={cuisine === c} onClick={() => setCuisine(cuisine === c ? null : c)}>{c}</Pill>)}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Style</p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {COOKING_STYLES.map(s => <Pill key={s} active={style === s} onClick={() => setStyle(style === s ? null : s)}>{s}</Pill>)}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Difficulty</p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {DIFFICULTIES.map(d => <Pill key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>{d}</Pill>)}
            </div>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setCuisine(null); setStyle(null); setDifficulty(null); }}>
              <X className="mr-1 h-3 w-3" /> Clear filters
            </Button>
          )}
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : results.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              {mode === "pantry" && pantry.length === 0
                ? "Add ingredients above to find matching recipes."
                : "No recipes match your search."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {results.map(r => <RecipeCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
