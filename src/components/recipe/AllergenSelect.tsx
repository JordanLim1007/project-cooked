import { ALLERGENS } from "@/lib/recipe-options";
import { cn } from "@/lib/utils";

/** Multi-select chips for common allergens. */
export function AllergenSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (a: string) => {
    const has = value.includes(a);
    onChange(has ? value.filter((x) => x !== a) : [...value, a]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {ALLERGENS.map((a) => {
        const active = value.includes(a);
        return (
          <button
            key={a}
            type="button"
            onClick={() => toggle(a)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-border bg-background text-foreground hover:border-foreground/30",
            )}
          >
            {a}
          </button>
        );
      })}
    </div>
  );
}