// claude-summary — turn a structured day plan into a short, motivating
// narrative the user reads each morning. Simple, short output: no thinking.
//
// POST body: { date, blocks: [{title, category, start, end}], checkin?, profileName? }
// Response:  { summary: string }
import { anthropicClient, MODEL, textOf } from "../_shared/anthropic.ts";
import { corsHeaders, json } from "../_shared/cors.ts";

const minToClock = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const { date, blocks = [], checkin, profileName } = await req.json();

    const timeline = blocks
      .map(
        (b: { title: string; category: string; start: number; end: number }) =>
          `- ${minToClock(b.start)}–${minToClock(b.end)} ${b.title} (${b.category})`
      )
      .join("\n");

    const client = anthropicClient();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system:
        "You are Best me, a warm, grounded daily coach. Given a time-blocked plan, " +
        "write a short (3-5 sentence) motivating brief for the day. Acknowledge the " +
        "balance between work and wellbeing. Be encouraging without being saccharine. " +
        "Do not list every block back; speak to the shape and intention of the day.",
      messages: [
        {
          role: "user",
          content:
            `Date: ${date}\n` +
            (profileName ? `Person: ${profileName}\n` : "") +
            (checkin
              ? `Today they feel energy ${checkin.energy}/5, mood ${checkin.mood}/5.\n`
              : "") +
            `Plan:\n${timeline}`,
        },
      ],
    });

    return json({ summary: textOf(message) });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
