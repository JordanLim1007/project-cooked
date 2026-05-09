import { useState } from "react";
import { ALLERGENS } from "@/lib/recipe-options";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

/** Multi-select chips for common allergens. */
export function AllergenSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [customInput, setCustomInput] = useState("");
  const presetSet = new Set<string>(ALLERGENS as readonly string[]);
  const customs = value.filter((v) => !presetSet.has(v));

  const toggle = (a: string) => {
    const has = value.includes(a);
    onChange(has ? value.filter((x) => x !== a) : [...value, a]);
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    if (value.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setCustomInput("");
      return;
    }
    onChange([...value, v]);
    setCustomInput("");
  };

  return (
    <div className="space-y-2">
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
        {customs.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-full border border-amber-500 bg-amber-500 px-3 py-1 text-xs font-medium text-white"
          >
            {c}
            <button
              type="button"
              onClick={() => toggle(c)}
              aria-label={`Remove ${c}`}
              className="rounded-full p-0.5 hover:bg-white/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Other allergen (e.g. Mustard)"
          className="h-8 text-xs"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="rounded-md border border-border bg-background px-3 text-xs font-medium hover:border-foreground/30 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}