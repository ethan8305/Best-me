// claude-reflect — interpret the evening reflection and propose adjustments.
// This reasons about estimated-vs-actual time and how the day felt, so it uses
// adaptive thinking, and returns a structured result via structured outputs.
//
// POST body: {
//   date, ratings: [{category, estimatedMinutes, actualMinutes, completed, rating}],
//   estimationFactors: {category: number}, notes?
// }
// Response: { note: string, estimationFactors: {category: number}, suggestions: string[] }
import { anthropicClient, MODEL } from "../_shared/anthropic.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    note: { type: "string", description: "A short, supportive reflection back to the user." },
    estimationFactors: {
      type: "object",
      additionalProperties: false,
      description: "Updated per-category estimate multipliers (1.0 = neutral).",
      properties: {
        work: { type: "number" },
        movement: { type: "number" },
        family: { type: "number" },
        alone: { type: "number" },
        rest: { type: "number" },
      },
      required: ["work", "movement", "family", "alone", "rest"],
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "1-3 concrete, kind suggestions for tomorrow.",
    },
  },
  required: ["note", "estimationFactors", "suggestions"],
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const { date, ratings = [], estimationFactors = {}, notes } = await req.json();

    const client = anthropicClient();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: RESULT_SCHEMA } },
      system:
        "You are Best me, a thoughtful wellbeing coach. Given how a person's planned " +
        "blocks actually went, gently update their per-category time-estimation factors " +
        "so future plans fit reality (raise a category's factor when they consistently " +
        "ran over, lower it when they finished early; keep factors between 0.5 and 2.0 " +
        "and nudge gradually). Reward balance, never grind. Return the full factor set.",
      messages: [
        {
          role: "user",
          content:
            `Date: ${date}\n` +
            `Current estimation factors: ${JSON.stringify(estimationFactors)}\n` +
            `Block outcomes: ${JSON.stringify(ratings)}\n` +
            (notes ? `Their notes: ${notes}` : ""),
        },
      ],
    });

    // With output_config.format the model returns a single JSON text block.
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    return json(JSON.parse(text));
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
