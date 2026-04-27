type Step = { id: string; text: string; position: number; keywords: string[] | null };

/** Wrap any occurrence of keywords in <strong>. Case-insensitive, longest-first to avoid nesting. */
function highlightKeywords(text: string, keywords: string[] | null) {
  if (!keywords || keywords.length === 0) return <>{text}</>;
  const sorted = [...keywords].filter(Boolean).sort((a, b) => b.length - a.length);
  const escaped = sorted.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) return <>{text}</>;
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export const InstructionList = ({ steps }: { steps: Step[] }) => {
  if (steps.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No steps yet.</p>;
  }
  return (
    <ol className="space-y-6">
      {steps.map((s, i) => (
        <li key={s.id} className="flex gap-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
            {i + 1}
          </span>
          <p className="flex-1 pt-0.5 text-base leading-relaxed text-foreground/80">
            {highlightKeywords(s.text, s.keywords)}
          </p>
        </li>
      ))}
    </ol>
  );
};