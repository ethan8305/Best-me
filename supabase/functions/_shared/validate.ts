// Strict input validation for the Claude proxy functions.
//
// Everything arriving here is untrusted. Caps keep a hostile or buggy client
// from inflating token spend, and shape checks mean only known fields ever
// reach the prompt. User text is always data, never instructions: it is
// interpolated into the user turn only, the system prompt stays authoritative,
// and claude-reflect constrains output with a JSON schema.

const CATEGORIES = new Set(["work", "movement", "family", "alone", "rest"]);

export const LIMITS = {
  maxBlocks: 50,
  maxRatings: 50,
  maxNotesChars: 4000,
  maxTitleChars: 200,
  maxNameChars: 100,
  maxBodyBytes: 64 * 1024,
};

export class ValidationError extends Error {}

const DAY_MINUTES = 24 * 60;

function str(v: unknown, max: number, field: string): string {
  if (typeof v !== "string" || v.length > max) {
    throw new ValidationError(`invalid ${field}`);
  }
  return v;
}

function num(v: unknown, min: number, max: number, field: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    throw new ValidationError(`invalid ${field}`);
  }
  return v;
}

function isoDate(v: unknown): string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new ValidationError("invalid date");
  }
  return v;
}

function category(v: unknown): string {
  if (typeof v !== "string" || !CATEGORIES.has(v)) {
    throw new ValidationError("invalid category");
  }
  return v;
}

/** Read and size-cap the request body before JSON.parse. */
export async function readJsonBody(req: Request): Promise<unknown> {
  const raw = await req.text();
  if (raw.length > LIMITS.maxBodyBytes) throw new ValidationError("body too large");
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError("invalid JSON");
  }
}

export interface SummaryPayload {
  date: string;
  blocks: { title: string; category: string; start: number; end: number }[];
  checkin?: { energy: number; mood: number };
  profileName?: string;
}

export function validateSummaryPayload(body: unknown): SummaryPayload {
  if (typeof body !== "object" || body === null) throw new ValidationError("invalid body");
  const b = body as Record<string, unknown>;

  const rawBlocks = Array.isArray(b.blocks) ? b.blocks : [];
  if (rawBlocks.length > LIMITS.maxBlocks) throw new ValidationError("too many blocks");

  return {
    date: isoDate(b.date),
    blocks: rawBlocks.map((blk) => {
      const o = (blk ?? {}) as Record<string, unknown>;
      return {
        title: str(o.title, LIMITS.maxTitleChars, "block title"),
        category: category(o.category),
        start: num(o.start, 0, DAY_MINUTES, "block start"),
        end: num(o.end, 0, DAY_MINUTES, "block end"),
      };
    }),
    checkin:
      b.checkin != null
        ? {
            energy: num((b.checkin as Record<string, unknown>).energy, 1, 5, "energy"),
            mood: num((b.checkin as Record<string, unknown>).mood, 1, 5, "mood"),
          }
        : undefined,
    profileName:
      b.profileName != null ? str(b.profileName, LIMITS.maxNameChars, "name") : undefined,
  };
}

export interface ReflectPayload {
  date: string;
  ratings: {
    category: string;
    estimatedMinutes: number;
    actualMinutes?: number;
    completed: boolean;
    rating?: number;
  }[];
  estimationFactors: Record<string, number>;
  notes?: string;
}

export function validateReflectPayload(body: unknown): ReflectPayload {
  if (typeof body !== "object" || body === null) throw new ValidationError("invalid body");
  const b = body as Record<string, unknown>;

  const rawRatings = Array.isArray(b.ratings) ? b.ratings : [];
  if (rawRatings.length > LIMITS.maxRatings) throw new ValidationError("too many ratings");

  const factors: Record<string, number> = {};
  if (b.estimationFactors != null) {
    for (const [k, v] of Object.entries(b.estimationFactors as Record<string, unknown>)) {
      if (!CATEGORIES.has(k)) continue; // drop unknown keys silently
      factors[k] = num(v, 0.1, 5, "estimation factor");
    }
  }

  return {
    date: isoDate(b.date),
    ratings: rawRatings.map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        category: category(o.category),
        estimatedMinutes: num(o.estimatedMinutes, 0, DAY_MINUTES, "estimatedMinutes"),
        actualMinutes:
          o.actualMinutes != null
            ? num(o.actualMinutes, 0, DAY_MINUTES, "actualMinutes")
            : undefined,
        completed: Boolean(o.completed),
        rating: o.rating != null ? num(o.rating, 1, 5, "rating") : undefined,
      };
    }),
    estimationFactors: factors,
    notes: b.notes != null ? str(b.notes, LIMITS.maxNotesChars, "notes") : undefined,
  };
}
