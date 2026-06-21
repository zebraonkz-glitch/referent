import type { ParsedArticle } from "@/lib/parse-article";
import { generateArticleAction } from "@/lib/generate-article-action";
import { generateArticleIllustration } from "@/lib/generate-article-illustration";

export type ArticlePublication = {
  telegramPost: string;
  imagePrompt: string;
  illustrationUrl: string;
};

export async function generateArticlePublication(
  article: ParsedArticle,
  sourceUrl: string,
): Promise<ArticlePublication> {
  const [telegramPost, illustration] = await Promise.all([
    generateArticleAction(article, "telegram", { sourceUrl }),
    generateArticleIllustration(article),
  ]);

  return {
    telegramPost,
    imagePrompt: illustration.imagePrompt,
    illustrationUrl: illustration.dataUrl,
  };
}
