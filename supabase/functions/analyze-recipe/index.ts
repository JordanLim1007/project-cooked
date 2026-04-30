import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { recipeId, all, force } = body as { recipeId?: string; all?: boolean; force?: boolean };
    if (!recipeId && !all) {
      return new Response(JSON.stringify({ error: "recipeId or all required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Resolve target recipe ids
    let targetIds: string[] = [];
    if (all) {
      const { data: rs } = await admin
        .from("recipes")
        .select("id")
        .eq("user_id", userData.user.id);
      targetIds = (rs ?? []).map((r) => r.id as string);
    } else if (recipeId) {
      const { data: r } = await admin
        .from("recipes")
        .select("id,user_id")
        .eq("id", recipeId)
        .maybeSingle();
      if (!r || r.user_id !== userData.user.id) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
      }
      targetIds = [r.id as string];
    }

    let analyzed = 0;
    let skipped = 0;
    for (const rid of targetIds) {
      const ok = await analyzeOne(admin, LOVABLE_API_KEY, rid, !!force);
      if (ok === "analyzed") analyzed++;
      else if (ok === "skipped") skipped++;
    }

    return new Response(JSON.stringify({ ok: true, analyzed, skipped, total: targetIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-recipe error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function analyzeOne(
  admin: ReturnType<typeof createClient>,
  LOVABLE_API_KEY: string,
  recipeId: string,
  force: boolean,
): Promise<"analyzed" | "skipped" | "empty"> {
  const { data: recipe } = await admin.from("recipes").select("id,title").eq("id", recipeId).maybeSingle();
  if (!recipe) return "skipped";
  const { data: steps } = await admin.from("recipe_steps").select("id,text,position,timer_seconds,title,emphasis").eq("recipe_id", recipeId).order("position");
  const { data: ingredients } = await admin.from("recipe_ingredients").select("id,name,quantity,is_optional,position").eq("recipe_id", recipeId).order("position");
  if (!steps || steps.length === 0) {
    await admin.from("recipes").update({ is_published: true }).eq("id", recipeId);
    return "empty";
  }
  // If not forcing, skip recipes that already have full annotations on every step
  if (!force) {
    const fullyAnnotated = steps.every(
      (s: any) => s.title && Array.isArray(s.emphasis) && s.emphasis.length > 0,
    );
    if (fullyAnnotated) return "skipped";
  }

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You analyze cooking recipes for a clean, scannable cooking UI. Do three things:\n\n1) For EACH step:\n- Write a 2-4 word title (Title Case, e.g. 'Sear the Beef').\n- Pick 2-6 short phrases inside the step text to visually emphasise. Phrases must be copied VERBATIM from the step. Tag each with a level: 'xl' for the single most critical token (a temperature, total time, or core action), 'lg' for important specifics (key ingredient quantities, secondary times), 'md' for normal emphasis. Keep each phrase 1-3 words.\n- If the step contains a clear active wait/cook duration (e.g. 'bake 20 minutes', 'simmer for 5 min', 'rest 10 minutes'), set timer_seconds to that duration in seconds. Otherwise omit timer_seconds.\n\n2) For EACH ingredient: decide if it's optional. Mark optional=true ONLY for things like garnishes, 'to taste' seasonings, decorative herbs, or anything explicitly described as optional/garnish/for serving. Staples that the recipe needs (flour, eggs, oil, main proteins, main vegetables) are NOT optional.\n\n3) Write 1-3 short, helpful cooking tips for the recipe overall.",
          },
          {
            role: "user",
            content:
              `Recipe: ${(recipe as any).title}\n\nIngredients:\n${(ingredients ?? []).map((ing: any) => `[${ing.id}] ${ing.quantity ?? ""} ${ing.name}`.trim()).join("\n")}\n\nSteps:\n${steps.map((s: any, i: number) => `${i + 1}. ${s.text}`).join("\n")}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "annotate_recipe",
              description: "Return per-step title, emphasized phrases, and overall tips.",
              parameters: {
                type: "object",
                properties: {
                   steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        position: { type: "number" },
                        title: { type: "string" },
                        timer_seconds: { type: "number" },
                        emphasis: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              phrase: { type: "string" },
                              level: { type: "string", enum: ["md", "lg", "xl"] },
                            },
                            required: ["phrase", "level"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["position", "title", "emphasis"],
                      additionalProperties: false,
                    },
                  },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        optional: { type: "boolean" },
                      },
                      required: ["id", "optional"],
                      additionalProperties: false,
                    },
                  },
                  tips: { type: "array", items: { type: "string" } },
                },
                required: ["steps", "tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "annotate_recipe" } },
      }),
    });

    if (!aiResp.ok) {
      console.error("AI gateway error", aiResp.status, await aiResp.text());
      await admin.from("recipes").update({ is_published: true }).eq("id", recipeId);
      return "skipped";
    }

    const aiJson = await aiResp.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: {
      steps: { position: number; title?: string; timer_seconds?: number; emphasis?: { phrase: string; level: "md" | "lg" | "xl" }[] }[];
      ingredients?: { id: string; optional: boolean }[];
      tips: string[];
    } = { steps: [], tips: [], ingredients: [] };
    try {
      parsed = JSON.parse(call?.function?.arguments ?? "{}");
    } catch (e) {
      console.error("parse error", e);
    }

  // Map by ordinal index — the AI receives steps in order, so parsed.steps[i] corresponds to steps[i].
  const parsedByOrdinal = (parsed.steps ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  for (let i = 0; i < steps.length; i++) {
    const s: any = steps[i];
    const match = parsedByOrdinal[i];
    const emphasis = (match?.emphasis ?? [])
      .map((e) => ({ phrase: String(e?.phrase ?? "").trim(), level: (e?.level ?? "md") as "md" | "lg" | "xl" }))
      .filter((e) => e.phrase)
      .slice(0, 8);
    const keywords = emphasis.map((e) => e.phrase);
    const title = (match?.title ?? "").toString().trim().slice(0, 60) || null;
    const timer_seconds =
      typeof match?.timer_seconds === "number" && match.timer_seconds > 0 && match.timer_seconds <= 60 * 60 * 6
        ? Math.round(match.timer_seconds)
        : null;
    await admin
      .from("recipe_steps")
      .update({ title, emphasis, keywords, timer_seconds })
      .eq("id", s.id);
  }

  if (parsed.ingredients && ingredients) {
    const validIds = new Set((ingredients as any[]).filter((i) => !i.is_optional).map((i) => i.id));
    const toMark = parsed.ingredients
      .filter((i) => i.optional && validIds.has(i.id))
      .map((i) => i.id);
    if (toMark.length > 0) {
      await admin.from("recipe_ingredients").update({ is_optional: true }).in("id", toMark);
    }
  }

  await admin
    .from("recipes")
    .update({ tips: (parsed.tips ?? []).slice(0, 5), is_published: true })
    .eq("id", recipeId);

  return "analyzed";
}