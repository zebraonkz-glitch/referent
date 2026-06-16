import { NextRequest, NextResponse } from "next/server";

type Action = "summary" | "theses" | "telegram";

const actionTitles: Record<Action, string> = {
  summary: "О чем статья?",
  theses: "Тезисы",
  telegram: "Пост для Telegram",
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

  // Заглушка до подключения парсинга и AI
  const result = [
    `Действие: ${actionTitles[action]}`,
    `Статья: ${url}`,
    "",
    "Интерфейс готов. Следующий шаг — подключить парсинг статьи и AI-генерацию ответа.",
  ].join("\n");

  return NextResponse.json({ result });
}
