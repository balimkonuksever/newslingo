/*
 * The Real English expression cards. This is production reference data:
 * provisioning upserts the cards by slug, so a slug is a permanent identifier
 * and must never be renamed. A category page lists its cards in the order
 * they appear here.
 *
 * Claude (Opus 5.5) wrote the cards and their original examples in a Claude
 * Code session on 2026-09-30. The user, a native Turkish speaker, checks the
 * Turkish of every card, and `reviewed` records the day. The CEFR levels are
 * editorial estimates, not verified labels, so never use them as evaluation
 * data.
 */
import type { ReferenceExpression } from "../../expression-library";
import { AI_EXPRESSIONS } from "./ai";
import { ENTERTAINMENT_EXPRESSIONS } from "./entertainment";
import { GENERAL_EXPRESSIONS } from "./general";
import { TECHNOLOGY_EXPRESSIONS } from "./technology";

export const REFERENCE_EXPRESSIONS: readonly ReferenceExpression[] = [
  ...AI_EXPRESSIONS,
  ...TECHNOLOGY_EXPRESSIONS,
  ...ENTERTAINMENT_EXPRESSIONS,
  ...GENERAL_EXPRESSIONS,
];
