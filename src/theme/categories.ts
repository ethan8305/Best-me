import { Category } from "../types";

/** Display metadata for each life category (colors mirror tailwind.config.js). */
export const CATEGORY_META: Record<Category, { label: string; color: string; emoji: string }> = {
  work: { label: "Work", color: "#5B8DEF", emoji: "💻" },
  movement: { label: "Movement", color: "#3DD68C", emoji: "🏃" },
  family: { label: "Connection", color: "#F2A65A", emoji: "🤝" },
  alone: { label: "Alone time", color: "#A98BFF", emoji: "🌙" },
  rest: { label: "Rest", color: "#6FD0E0", emoji: "☕" },
};
