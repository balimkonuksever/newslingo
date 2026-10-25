-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('PUBLISH', 'ARCHIVE', 'RESTORE', 'CHANGE_CATEGORY', 'CHANGE_DIFFICULTY');

-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "reason" TEXT,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationEvent_articleId_createdAt_idx" ON "ModerationEvent"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationEvent_actorId_idx" ON "ModerationEvent"("actorId");

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "ModerationEvent"
ADD CONSTRAINT "ModerationEvent_reason_not_blank" CHECK ("reason" IS NULL OR "reason" ~ '[^[:space:]]'),
ADD CONSTRAINT "ModerationEvent_reason_required" CHECK ("action" = 'PUBLISH' OR "reason" IS NOT NULL);

-- The audit trail is append-only: refuse any change to a recorded event.
-- TRUNCATE, which only the test-database reset uses, does not fire it.
CREATE FUNCTION "moderation_event_is_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ModerationEvent rows cannot be changed or deleted';
END;
$$;

CREATE TRIGGER "ModerationEvent_append_only"
BEFORE UPDATE OR DELETE ON "ModerationEvent"
FOR EACH ROW EXECUTE FUNCTION "moderation_event_is_append_only"();
