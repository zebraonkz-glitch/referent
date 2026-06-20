"use client";

import { useEffect, useState } from "react";

type Action = "summary" | "theses" | "telegram" | "translate";

type ResultMode = "generated" | "translation";

type AnalyzeResponse = {
  result?: string;
  mode?: ResultMode;
  error?: string;
};

const actions: {
  id: Action;
  label: string;
  description: string;
  title: string;
}[] = [
  {
    id: "summary",
    label: "О чем статья?",
    description: "Краткое описание содержания статьи",
    title: "Кратко объяснить, о чём статья: тема, главная мысль и кому будет полезна",
  },
  {
    id: "theses",
    label: "Тезисы",
    description: "Основные тезисы и ключевые мысли",
    title: "Выделить 5–10 ключевых тезисов и основных выводов из статьи",
  },
  {
    id: "telegram",
    label: "Пост для Telegram",
    description: "Готовый пост для публикации в Telegram",
    title: "Подготовить короткий пост для Telegram со ссылкой на источник",
  },
  {
    id: "translate",
    label: "Перевод",
    description: "Перевод статьи на русский через DeepSeek",
    title: "Перевести статью на русский язык с сохранением смысла и структуры",
  },
];

const processTexts: Record<Action, string> = {
  summary: "Анализирую статью…",
  theses: "Формирую тезисы…",
  telegram: "Готовлю пост…",
  translate: "Перевожу статью…",
};

export function ReferentForm() {
  const [url, setUrl] = useState("");
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [resultText, setResultText] = useState("");
  const [resultMode, setResultMode] = useState<ResultMode | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processStatus, setProcessStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading || !activeAction) {
      return;
    }

    setProcessStatus("Загружаю статью…");

    const timer = window.setTimeout(() => {
      setProcessStatus(processTexts[activeAction]);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [isLoading, activeAction]);

  async function handleAction(action: Action) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Введите URL англоязычной статьи");
      setResultText("");
      setResultMode(null);
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Укажите корректный URL, например https://example.com/article");
      setResultText("");
      setResultMode(null);
      return;
    }

    setError("");
    setActiveAction(action);
    setIsLoading(true);
    setResultText("");
    setResultMode(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, action }),
      });

      const data = (await response.json()) as AnalyzeResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось обработать статью");
      }

      if (!data.result || (data.mode !== "generated" && data.mode !== "translation")) {
        throw new Error("Сервер не вернул результат");
      }

      setResultMode(data.mode);
      setResultText(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setResultText("");
      setResultMode(null);
    } finally {
      setIsLoading(false);
      setProcessStatus(null);
    }
  }

  const activeLabel = actions.find((item) => item.id === activeAction)?.label;
  const hasTextResult =
    (resultMode === "generated" || resultMode === "translation") && resultText;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">
          Referent
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Анализ англоязычных статей
        </h1>
        <p className="text-slate-400">
          Вставьте ссылку на статью и выберите действие
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
        <label htmlFor="article-url" className="mb-2 block text-sm font-medium text-slate-300">
          URL англоязычной статьи
        </label>
        <input
          id="article-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Введите URL статьи, например: https://example.com/article"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
        />
        <p className="mt-2 text-xs text-slate-500">
          Укажите ссылку на англоязычную статью
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              title={action.title}
              onClick={() => handleAction(action.id)}
              disabled={isLoading}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-left transition hover:border-sky-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block font-medium text-slate-100">{action.label}</span>
              <span className="mt-1 block text-sm text-slate-400">{action.description}</span>
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
      </section>

      {processStatus ? (
        <div className="flex items-center gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
          <span>{processStatus}</span>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-slate-100">Результат</h2>
          {activeLabel ? (
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
              {activeLabel}
            </span>
          ) : null}
        </div>

        <div className="min-h-48 rounded-xl border border-dashed border-slate-700 bg-slate-950/80 p-5">
          {hasTextResult ? (
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
              {resultText}
            </div>
          ) : (
            <p className="text-sm leading-7 text-slate-500">
              Введите URL и нажмите кнопку — здесь появится описание статьи, тезисы,
              пост для Telegram или перевод.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
