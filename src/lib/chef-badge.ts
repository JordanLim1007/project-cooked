/** Returns the chef tier badge for a given number of published recipes. */
export type ChefBadge = {
  label: string;
  emoji: string;
  /** tailwind classes for the badge chip */
  className: string;
};

export function getChefBadge(recipeCount: number): ChefBadge | null {
  if (recipeCount >= 50) return { label: "Master Chef", emoji: "👑", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" };
  if (recipeCount >= 20) return { label: "Head Chef", emoji: "🏅", className: "bg-primary/15 text-primary border-primary/30" };
  if (recipeCount >= 10) return { label: "Sous Chef", emoji: "🥈", className: "bg-secondary/40 text-secondary-foreground border-secondary" };
  if (recipeCount >= 5)  return { label: "Line Cook", emoji: "🍳", className: "bg-muted text-foreground border-border" };
  if (recipeCount >= 1)  return { label: "Home Cook", emoji: "🥄", className: "bg-muted text-muted-foreground border-border" };
  return null;
}