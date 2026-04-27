import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RecipeCard, RecipeCardData } from "@/components/recipe/RecipeCard";
import { CUISINES, COOKING_STYLES, DIFFICULTIES } from "@/lib/recipe-options";
import { Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={cn(
    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
  )}>{children}</button>
);

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [results, setResults] = useState<RecipeCardData[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    let query = supabase
      .from("recipes")
      .select("id,title,cover_image_url,calories,spice_level,cuisine,cooking_style,time_minutes")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
    if (cuisine) query = query.eq("cuisine", cuisine);
    if (style) query = query.eq("cooking_style", style);
    if (difficulty) query = query.eq("difficulty", difficulty);
    const { data, error } = await query;
    if (error) console.error(error);
    setResults(data ?? []);
    setLoading(false);
  };

  // Debounced search on filter changes
  useEffect(() => {
    const t = setTimeout(runSearch, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cuisine, style, difficulty]);

  const hasFilters = !!(cuisine || style || difficulty);

  return (
    <AppShell>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-5 py-3">
          <h1 className="mb-3 text-xl">Search</h1>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes..." className="pl-9" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-4">
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
            <p className="py-16 text-center text-muted-foreground">No recipes match your search.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {results.map(r => <RecipeCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
