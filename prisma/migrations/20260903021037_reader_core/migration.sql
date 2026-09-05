-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('A2', 'B1', 'B2', 'C1');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('FETCHED', 'PROCESSING', 'DRAFT', 'PUBLISHED', 'FAILED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortSummary" TEXT,
    "categoryId" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceImageUrl" TEXT,
    "imageAttribution" TEXT,
    "sourcePublishedAt" TIMESTAMP(3) NOT NULL,
    "publishedOnSiteAt" TIMESTAMP(3),
    "wordCount" INTEGER NOT NULL,
    "readingTimeMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleParagraph" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "english" TEXT NOT NULL,
    "turkish" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleParagraph_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_displayOrder_idx" ON "Category"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Article_sourceUrl_key" ON "Article"("sourceUrl");

-- CreateIndex
CREATE INDEX "Article_categoryId_status_sourcePublishedAt_idx" ON "Article"("categoryId", "status", "sourcePublishedAt");

-- CreateIndex
CREATE INDEX "Article_status_publishedOnSiteAt_idx" ON "Article"("status", "publishedOnSiteAt");

-- CreateIndex
CREATE INDEX "Article_difficulty_status_idx" ON "Article"("difficulty", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleParagraph_articleId_order_key" ON "ArticleParagraph"("articleId", "order");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleParagraph" ADD CONSTRAINT "ArticleParagraph_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "Category"
ADD CONSTRAINT "Category_displayOrder_positive" CHECK ("displayOrder" > 0);

ALTER TABLE "Article"
ADD CONSTRAINT "Article_wordCount_positive" CHECK ("wordCount" > 0),
ADD CONSTRAINT "Article_readingTimeMinutes_positive" CHECK ("readingTimeMinutes" > 0),
ADD CONSTRAINT "Article_published_timestamp_required" CHECK (
    "status" <> 'PUBLISHED' OR "publishedOnSiteAt" IS NOT NULL
);

ALTER TABLE "ArticleParagraph"
ADD CONSTRAINT "ArticleParagraph_order_positive" CHECK ("order" > 0),
ADD CONSTRAINT "ArticleParagraph_english_not_blank" CHECK (char_length(btrim("english")) > 0),
ADD CONSTRAINT "ArticleParagraph_turkish_not_blank" CHECK (char_length(btrim("turkish")) > 0);
