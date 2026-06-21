import type { ParsedArticle } from "@/lib/parse-article";
import { AppError } from "@/lib/app-error";
import { validateArticleContent } from "@/lib/generate-article-action";
import { generateIllustrationPrompt } from "@/lib/generate-illustration-prompt";
import { generateHuggingFaceImage } from "@/lib/huggingface-image";

export type ArticleIllustration = {
  imagePrompt: string;
  dataUrl: string;
};

export async function generateArticleIllustration(
  article: ParsedArticle,
): Promise<ArticleIllustration> {
  validateArticleContent(article);

  const imagePrompt = await generateIllustrationPrompt(article);

  if (!imagePrompt) {
    throw new AppError("AI_UNAVAILABLE");
  }

  const { dataUrl } = await generateHuggingFaceImage(imagePrompt);

  return { imagePrompt, dataUrl };
}
