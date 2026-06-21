import { generateArticleAction } from "@/lib/generate-article-action";
import { generateArticleIllustration } from "@/lib/generate-article-illustration";
import { AppError, isAppError, type AppErrorResponse } from "@/lib/app-error";
import { fetchAndParseArticle } from "@/lib/parse-article";
import { NextRequest, NextResponse } from "next/server";

type Action = "summary" | "theses" | "telegram" | "illustration";

const actionTitles: Record<Action, string> = {
  summary: "О чем статья?",
  theses: "Тезисы",
  telegram: "Пост для Telegram",
  illustration: "Иллюстрация",
};

const generatedActions = ["summary", "theses", "telegram"] as const;

function isGeneratedAction(action: Action): action is (typeof generatedActions)[number] {
  return generatedActions.includes(action as (typeof generatedActions)[number]);
}

function errorResponse(error: AppErrorResponse, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  let body: { url?: string; action?: Action };

  try {
    body = await request.json();
  } catch {
    return errorResponse(new AppError("INVALID_REQUEST").toJSON(), 400);
  }

  const { url, action } = body;

  if (!url?.trim()) {
    return errorResponse(new AppError("MISSING_URL").toJSON(), 400);
  }

  if (!action || !(action in actionTitles)) {
    return errorResponse(new AppError("INVALID_REQUEST").toJSON(), 400);
  }

  try {
    new URL(url);
  } catch {
    return errorResponse(new AppError("INVALID_URL").toJSON(), 400);
  }

  try {
    const parsed = await fetchAndParseArticle(url);

    if (action === "illustration") {
      const { imagePrompt, dataUrl } = await generateArticleIllustration(parsed);

      return NextResponse.json({
        result: dataUrl,
        imagePrompt,
        mode: "illustration",
        action: actionTitles[action],
      });
    }

    if (isGeneratedAction(action)) {
      const generated = await generateArticleAction(parsed, action, {
        sourceUrl: action === "telegram" ? url : undefined,
      });

      return NextResponse.json({
        result: generated,
        mode: "generated",
        action: actionTitles[action],
      });
    }

    return errorResponse(new AppError("INVALID_REQUEST").toJSON(), 400);
  } catch (error) {
    if (isAppError(error)) {
      return errorResponse(error.toJSON(), 422);
    }

    return errorResponse(new AppError("UNKNOWN").toJSON(), 422);
  }
}
