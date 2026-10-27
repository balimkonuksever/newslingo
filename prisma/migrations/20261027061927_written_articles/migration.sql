-- CreateEnum
CREATE TYPE "ArticleKind" AS ENUM ('NEWS', 'EXPLAINER');

-- CreateEnum
CREATE TYPE "SourceLicence" AS ENUM ('OGL_3_0');

-- DropIndex
DROP INDEX "Article_categoryId_status_sourcePublishedAt_idx";

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "datedAt" TIMESTAMP(3),
ADD COLUMN     "kind" "ArticleKind" NOT NULL DEFAULT 'NEWS',
ADD COLUMN     "sourceLicence" "SourceLicence",
ALTER COLUMN "sourceName" DROP NOT NULL,
ALTER COLUMN "sourceUrl" DROP NOT NULL,
ALTER COLUMN "sourcePublishedAt" DROP NOT NULL;

-- Every existing article is news, dated by its source (added by hand).
UPDATE "Article" SET "datedAt" = "sourcePublishedAt";

ALTER TABLE "Article" ALTER COLUMN "datedAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "ArticleReference" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "checkedAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleReference_articleId_order_key" ON "ArticleReference"("articleId", "order");

-- CreateIndex
CREATE INDEX "Article_categoryId_status_datedAt_idx" ON "Article"("categoryId", "status", "datedAt");

-- AddForeignKey
ALTER TABLE "ArticleReference" ADD CONSTRAINT "ArticleReference_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints, added by hand because Prisma does not model them.
-- News keeps its source and is dated by the source's publication time; an
-- explainer has no source, and lists references instead.
ALTER TABLE "Article"
ADD CONSTRAINT "Article_news_has_source" CHECK (
    "kind" <> 'NEWS' OR (
        "sourceName" IS NOT NULL
        AND "sourceUrl" IS NOT NULL
        AND "sourcePublishedAt" IS NOT NULL
        AND "datedAt" = "sourcePublishedAt"
    )
),
ADD CONSTRAINT "Article_explainer_has_no_source" CHECK (
    "kind" <> 'EXPLAINER' OR (
        "sourceName" IS NULL
        AND "sourceUrl" IS NULL
        AND "sourcePublishedAt" IS NULL
        AND "sourceLicence" IS NULL
    )
);

ALTER TABLE "ArticleReference"
ADD CONSTRAINT "ArticleReference_order_positive" CHECK ("order" > 0),
ADD CONSTRAINT "ArticleReference_title_not_blank" CHECK ("title" ~ '[^[:space:]]'),
ADD CONSTRAINT "ArticleReference_publisher_not_blank" CHECK ("publisher" ~ '[^[:space:]]'),
ADD CONSTRAINT "ArticleReference_url_not_blank" CHECK ("url" ~ '[^[:space:]]');
