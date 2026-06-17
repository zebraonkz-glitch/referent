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
        parsed,
        result: translation,
        mode: "translation",
        action: actionTitles[action],
      });
    }

    const result = JSON.stringify(parsed, null, 2);

    return NextResponse.json({
      parsed,
      result,
      mode: "parsed",
      action: actionTitles[action],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось обработать статью";

    return NextResponse.json({ error: message }, { status: 422 });
  }
}
