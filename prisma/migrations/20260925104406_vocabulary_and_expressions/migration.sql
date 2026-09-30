-- CreateEnum
CREATE TYPE "ExpressionType" AS ENUM ('IDIOM', 'PHRASAL_VERB', 'COLLOCATION', 'COMMON_EXPRESSION', 'SLANG', 'NEWS_ENGLISH');

-- CreateTable
CREATE TABLE "VocabularyEntry" (
    "id" TEXT NOT NULL,
    "surfaceWord" TEXT NOT NULL,
    "normalizedWord" TEXT NOT NULL,
    "lemma" TEXT,
    "partOfSpeech" TEXT,
    "englishDefinition" TEXT NOT NULL,
    "turkishMeaning" TEXT NOT NULL,
    "exampleSentence" TEXT,
    "ipa" TEXT,
    "contextSentence" TEXT NOT NULL,
    "contextHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleVocabulary" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "vocabularyEntryId" TEXT NOT NULL,
    "sourceSentence" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleVocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expression" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "normalizedExpression" TEXT NOT NULL,
    "type" "ExpressionType" NOT NULL,
    "difficulty" "Difficulty",
    "englishMeaning" TEXT NOT NULL,
    "turkishMeaning" TEXT NOT NULL,
    "exampleEnglish" TEXT,
    "exampleTurkish" TEXT,
    "usageNote" TEXT,
    "literalWarning" TEXT,
    "pronunciation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryExpression" (
    "categoryId" TEXT NOT NULL,
    "expressionId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CategoryExpression_pkey" PRIMARY KEY ("categoryId","expressionId")
);

-- CreateTable
CREATE TABLE "ArticleExpression" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "expressionId" TEXT NOT NULL,
    "paragraphId" TEXT NOT NULL,
    "surfaceText" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "source" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleExpression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyEntry_normalizedWord_contextHash_provider_provide_key" ON "VocabularyEntry"("normalizedWord", "contextHash", "provider", "providerVersion", "schemaVersion");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleVocabulary_articleId_vocabularyEntryId_key" ON "ArticleVocabulary"("articleId", "vocabularyEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleVocabulary_articleId_displayOrder_key" ON "ArticleVocabulary"("articleId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Expression_slug_key" ON "Expression"("slug");

-- CreateIndex
CREATE INDEX "Expression_normalizedExpression_idx" ON "Expression"("normalizedExpression");

-- CreateIndex
CREATE INDEX "CategoryExpression_categoryId_displayOrder_idx" ON "CategoryExpression"("categoryId", "displayOrder");

-- CreateIndex
CREATE INDEX "ArticleExpression_articleId_displayOrder_idx" ON "ArticleExpression"("articleId", "displayOrder");

-- CreateIndex
CREATE INDEX "ArticleExpression_expressionId_idx" ON "ArticleExpression"("expressionId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleExpression_paragraphId_startOffset_expressionId_key" ON "ArticleExpression"("paragraphId", "startOffset", "expressionId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleParagraph_id_articleId_key" ON "ArticleParagraph"("id", "articleId");

-- AddForeignKey
ALTER TABLE "ArticleVocabulary" ADD CONSTRAINT "ArticleVocabulary_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleVocabulary" ADD CONSTRAINT "ArticleVocabulary_vocabularyEntryId_fkey" FOREIGN KEY ("vocabularyEntryId") REFERENCES "VocabularyEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryExpression" ADD CONSTRAINT "CategoryExpression_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryExpression" ADD CONSTRAINT "CategoryExpression_expressionId_fkey" FOREIGN KEY ("expressionId") REFERENCES "Expression"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleExpression" ADD CONSTRAINT "ArticleExpression_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleExpression" ADD CONSTRAINT "ArticleExpression_expressionId_fkey" FOREIGN KEY ("expressionId") REFERENCES "Expression"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleExpression" ADD CONSTRAINT "ArticleExpression_paragraphId_articleId_fkey" FOREIGN KEY ("paragraphId", "articleId") REFERENCES "ArticleParagraph"("id", "articleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "VocabularyEntry"
ADD CONSTRAINT "VocabularyEntry_schemaVersion_positive" CHECK ("schemaVersion" > 0),
ADD CONSTRAINT "VocabularyEntry_contextHash_sha256" CHECK ("contextHash" ~ '^[0-9a-f]{64}$'),
ADD CONSTRAINT "VocabularyEntry_normalizedWord_not_blank" CHECK ("normalizedWord" ~ '[^[:space:]]'),
ADD CONSTRAINT "VocabularyEntry_englishDefinition_not_blank" CHECK ("englishDefinition" ~ '[^[:space:]]'),
ADD CONSTRAINT "VocabularyEntry_turkishMeaning_not_blank" CHECK ("turkishMeaning" ~ '[^[:space:]]'),
ADD CONSTRAINT "VocabularyEntry_contextSentence_not_blank" CHECK ("contextSentence" ~ '[^[:space:]]');

ALTER TABLE "ArticleVocabulary"
ADD CONSTRAINT "ArticleVocabulary_displayOrder_positive" CHECK ("displayOrder" > 0),
ADD CONSTRAINT "ArticleVocabulary_sourceSentence_not_blank" CHECK ("sourceSentence" ~ '[^[:space:]]');

ALTER TABLE "Expression"
ADD CONSTRAINT "Expression_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
ADD CONSTRAINT "Expression_expression_not_blank" CHECK ("expression" ~ '[^[:space:]]'),
ADD CONSTRAINT "Expression_normalizedExpression_not_blank" CHECK ("normalizedExpression" ~ '[^[:space:]]'),
ADD CONSTRAINT "Expression_englishMeaning_not_blank" CHECK ("englishMeaning" ~ '[^[:space:]]'),
ADD CONSTRAINT "Expression_turkishMeaning_not_blank" CHECK ("turkishMeaning" ~ '[^[:space:]]');

ALTER TABLE "CategoryExpression"
ADD CONSTRAINT "CategoryExpression_displayOrder_positive" CHECK ("displayOrder" > 0);

ALTER TABLE "ArticleExpression"
ADD CONSTRAINT "ArticleExpression_offsets_valid" CHECK ("startOffset" >= 0 AND "endOffset" > "startOffset"),
ADD CONSTRAINT "ArticleExpression_displayOrder_positive" CHECK ("displayOrder" > 0),
ADD CONSTRAINT "ArticleExpression_surfaceText_not_blank" CHECK ("surfaceText" ~ '[^[:space:]]'),
ADD CONSTRAINT "ArticleExpression_sentence_not_blank" CHECK ("sentence" ~ '[^[:space:]]'),
ADD CONSTRAINT "ArticleExpression_confidence_range" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1));
