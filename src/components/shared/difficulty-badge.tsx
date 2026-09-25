import type { Difficulty } from "@/generated/prisma/enums";
import { DIFFICULTY_LABELS } from "@/lib/difficulty";

const levelStyles: Record<Difficulty, string> = {
  A2: "bg-level-a2-surface text-level-a2",
  B1: "bg-level-b1-surface text-level-b1",
  B2: "bg-level-b2-surface text-level-b2",
  C1: "bg-level-c1-surface text-level-c1",
};

/**
 * A CEFR level badge. Sighted readers see the level code, and the name too
 * when `showLabel` is set; screen readers always hear both.
 */
export function DifficultyBadge({
  level,
  showLabel = false,
}: {
  level: Difficulty;
  showLabel?: boolean;
}) {
  const label = DIFFICULTY_LABELS[level];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide ${levelStyles[level]}`}
    >
      <span aria-hidden="true">
        {showLabel ? `${level} · ${label}` : level}
      </span>
      <span className="sr-only">{`Level ${level}, ${label}`}</span>
    </span>
  );
}
