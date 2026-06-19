import { generateArticleAction } from "@/lib/generate-article-action";
import { fetchAndParseArticle } from "@/lib/parse-article";
import { translateArticle } from "@/lib/translate-article";
import { NextRequest, NextResponse } from "next/server";

type Action = "summary" | "theses" | "telegram" | "translate";

const actionTitles: Record<Action, string> = {
  summary: "О чем статья?",
  theses: "Тезисы",
  telegram: "Пост для Telegram",
  translate: "Перевод",
};

const generatedActions = ["summary", "theses", "telegram"] as const;

function isGeneratedAction(action: Action): action is (typeof generatedActions)[number] {
  return generatedActions.includes(action as (typeof generatedActions)[number]);
}

export async function POST(request: NextRequest) {
  let body: { url?: string; action?: Action };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const { url, action } = body;

  if (!url || !action || !(action in actionTitles)) {
    return NextResponse.json(
      { error: "Укажите URL статьи и тип действия" },
      { status: 400 },
    );
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Некорректный URL" }, { status: 400 });
  }

  try {
    const parsed = await fetchAndParseArticle(url);

    if (action === "translate") {
      const translation = await translateArticle(parsed);

      return NextResponse.json({
        result: translation,
        mode: "translation",
        action: actionTitles[action],
      });
    }

    if (isGeneratedAction(action)) {
      const generated = await generateArticleAction(parsed, action);

      return NextResponse.json({
        result: generated,
        mode: "generated",
        action: actionTitles[action],
      });
    }

    return NextResponse.json(
      { error: "Неизвестное действие" },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось обработать статью";

    return NextResponse.json({ error: message }, { status: 422 });
  }
}
