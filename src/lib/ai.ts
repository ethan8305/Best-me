import { Block, Category, DailyCheckin } from "../types";
import { isSupabaseConfigured, supabase } from "./supabase";

/**
 * Thin client over the Claude-backed Edge Functions. The app never holds the
 * Anthropic key — these proxy through Supabase (see supabase/functions/*).
 * When Supabase isn't configured (offline/dev), callers fall back gracefully.
 */

export interface ReflectResult {
  note: string;
  estimationFactors: Record<Category, number>;
  suggestions: string[];
}

export async function generateDaySummary(input: {
  date: string;
  blocks: Pick<Block, "title" | "category" | "start" | "end">[];
  checkin?: DailyCheckin;
  profileName?: string;
}): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.functions.invoke("claude-summary", {
    body: input,
  });
  if (error) return null;
  return (data as { summary?: string })?.summary ?? null;
}

export async function reflectOnDay(input: {
  date: string;
  ratings: {
    category: Category;
    estimatedMinutes: number;
    actualMinutes?: number;
    completed: boolean;
    rating?: number;
  }[];
  estimationFactors: Partial<Record<Category, number>>;
  notes?: string;
}): Promise<ReflectResult | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.functions.invoke("claude-reflect", {
    body: input,
  });
  if (error) return null;
  return data as ReflectResult;
}
