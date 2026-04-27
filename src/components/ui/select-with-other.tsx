import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { OTHER } from "@/lib/recipe-options";

/** Select that lets the user pick from a preset list OR type a custom value via "Other…". */
export function SelectWithOther({
  value,
  onChange,
  options,
  placeholder = "Select",
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  const isPreset = !value || options.includes(value);
  const [mode, setMode] = useState<"preset" | "other">(isPreset ? "preset" : "other");

  useEffect(() => {
    setMode(value && !options.includes(value) ? "other" : "preset");
  }, [value, options]);

  return (
    <div className="space-y-1.5">
      <Select
        value={mode === "other" ? OTHER : value}
        onValueChange={(v) => {
          if (v === OTHER) {
            setMode("other");
            onChange("");
          } else {
            setMode("preset");
            onChange(v);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
          <SelectItem value={OTHER}>{OTHER}</SelectItem>
        </SelectContent>
      </Select>
      {mode === "other" && (
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your own…"
        />
      )}
    </div>
  );
}