import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { recipeId } = await req.json();
    if (!recipeId) {
      return new Response(JSON.stringify({ error: "recipeId required" }), {
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

    // Fetch recipe + steps; verify ownership
    const { data: recipe } = await admin.from("recipes").select("id,user_id,title").eq("id", recipeId).maybeSingle();
    if (!recipe || recipe.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
    }
    const { data: steps } = await admin.from("recipe_steps").select("id,text,position").eq("recipe_id", recipeId).order("position");
    if (!steps || steps.length === 0) {
      await admin.from("recipes").update({ is_published: true }).eq("id", recipeId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ask AI to extract a short title, emphasized phrases (with size hint), and tips
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You analyze cooking recipe steps for a clean, scannable cooking UI. For EACH step you must:\n- Write a 2-4 word title summarising the step (Title Case, e.g. 'Sear the Beef').\n- Pick 2-6 short phrases inside the step text to visually emphasise. Phrases must be copied VERBATIM from the step. Tag each with a level: 'xl' for the single most critical token (a temperature, total time, or core action), 'lg' for important specifics (key ingredient quantities, secondary times), 'md' for normal emphasis. Keep each phrase 1-3 words.\nAlso write 1-3 short helpful cooking tips for the recipe overall.",
          },
          {
            role: "user",
            content: `Recipe: ${recipe.title}\n\nSteps:\n${steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n")}`,
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
      // Fail open: publish without analysis
      await admin.from("recipes").update({ is_published: true }).eq("id", recipeId);
      return new Response(JSON.stringify({ ok: true, analyzed: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { steps: { position: number; title?: string; emphasis?: { phrase: string; level: "md" | "lg" | "xl" }[] }[]; tips: string[] } = { steps: [], tips: [] };
    try {
      parsed = JSON.parse(call?.function?.arguments ?? "{}");
    } catch (e) {
      console.error("parse error", e);
    }

    // Update each step with title, emphasis, and a flat keywords list (for backwards compat)
    for (const s of steps) {
      const match = parsed.steps?.find((p) => p.position === s.position);
      const emphasis = (match?.emphasis ?? [])
        .map((e) => ({ phrase: String(e?.phrase ?? "").trim(), level: (e?.level ?? "md") as "md" | "lg" | "xl" }))
        .filter((e) => e.phrase)
        .slice(0, 8);
      const keywords = emphasis.map((e) => e.phrase);
      const title = (match?.title ?? "").toString().trim().slice(0, 60) || null;
      await admin
        .from("recipe_steps")
        .update({ title, emphasis, keywords })
        .eq("id", s.id);
    }

    await admin
      .from("recipes")
      .update({ tips: (parsed.tips ?? []).slice(0, 5), is_published: true })
      .eq("id", recipeId);

    return new Response(JSON.stringify({ ok: true, analyzed: true }), {
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