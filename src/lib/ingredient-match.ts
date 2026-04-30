/**
 * Lightweight fuzzy ingredient matcher.
 * Normalises plurals, punctuation and whitespace so "Eggs" matches "egg".
 */
export function normalizeIngredient(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(es|s)$/, ""); // crude singularise
}

/** Returns true if pantry item loosely matches the recipe ingredient name. */
export function ingredientMatches(pantryItem: string, recipeIngredient: string): boolean {
  const a = normalizeIngredient(pantryItem);
  const b = normalizeIngredient(recipeIngredient);
  if (!a || !b) return false;
  if (a === b) return true;
  return b.includes(a) || a.includes(b);
}

export type MatchStatus = "full" | "partial" | "none";

export type RecipeMatch = {
  status: MatchStatus;
  missingRequired: string[];
  missingOptional: string[];
  matchedCount: number;
  requiredCount: number;
};

/** Classify a recipe based on the user's pantry list. */
export function classifyRecipe(
  pantry: string[],
  ingredients: { name: string; is_optional: boolean }[],
): RecipeMatch {
  const required = ingredients.filter((i) => !i.is_optional);
  const optional = ingredients.filter((i) => i.is_optional);

  const has = (name: string) => pantry.some((p) => ingredientMatches(p, name));

  const missingRequired = required.filter((i) => !has(i.name)).map((i) => i.name);
  const missingOptional = optional.filter((i) => !has(i.name)).map((i) => i.name);
  const matchedCount = required.length - missingRequired.length;

  let status: MatchStatus = "none";
  if (required.length > 0 && missingRequired.length === 0) status = "full";
  else if (matchedCount > 0) status = "partial";

  return {
    status,
    missingRequired,
    missingOptional,
    matchedCount,
    requiredCount: required.length,
  };
}

/** Common pantry suggestions for the curated list. */
export const COMMON_PANTRY = [
  "Eggs", "Milk", "Butter", "Flour", "Sugar", "Salt", "Pepper", "Olive oil",
  "Garlic", "Onion", "Tomato", "Chicken", "Beef", "Pork", "Rice", "Pasta",
  "Cheese", "Yogurt", "Lemon", "Lime", "Soy sauce", "Vinegar", "Honey",
  "Carrot", "Potato", "Spinach", "Mushroom", "Bread", "Ginger", "Chili",
  "Coriander", "Basil", "Parsley", "Cumin", "Paprika",
] as const;