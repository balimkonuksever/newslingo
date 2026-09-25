import type { Difficulty } from "@/generated/prisma/enums";

/** The supported CEFR levels, easiest first. */
export const DIFFICULTIES = [
  "A2",
  "B1",
  "B2",
  "C1",
] as const satisfies readonly Difficulty[];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  A2: "Easy",
  B1: "Intermediate",
  B2: "Upper Intermediate",
  C1: "Advanced",
};
