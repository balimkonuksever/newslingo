-- Replace space-only checks with full whitespace checks so tabs and newlines
-- cannot be stored as paragraph content.
ALTER TABLE "ArticleParagraph"
DROP CONSTRAINT "ArticleParagraph_english_not_blank",
DROP CONSTRAINT "ArticleParagraph_turkish_not_blank";

ALTER TABLE "ArticleParagraph"
ADD CONSTRAINT "ArticleParagraph_english_not_blank" CHECK ("english" ~ '[^[:space:]]'),
ADD CONSTRAINT "ArticleParagraph_turkish_not_blank" CHECK ("turkish" ~ '[^[:space:]]');
