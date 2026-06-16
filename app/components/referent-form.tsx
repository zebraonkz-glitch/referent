"use client";

import { useState } from "react";

type Action = "summary" | "theses" | "telegram";

type ParsedArticle = {
  date: string | null;
  title: string | null;
  content: string | null;
};

type AnalyzeResponse = {
  parsed?: ParsedArticle;
  result?: string;
  error?: string;
};

const actions: { id: Action; label: string; description: string }[] = [
  {
    id: "summary",
    label: "О чем статья?",
    description: "Краткое описание содержания статьи",
  },
  {
    id: "theses",
    label: "Тезисы",
    description: "Основные тезисы и ключевые мысли",
  },
  {
    id: "telegram",
    label: "Пост для Telegram",
    description: "Готовый пост для публикации в Telegram",
  },
];

function formatParsedJson(parsed: ParsedArticle): string {
  return JSON.stringify(parsed, null, 2);
}

export function ReferentForm() {
  const [url, setUrl] = useState("");
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [parsed, setParsed] = useState<ParsedArticle | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleAction(action: Action) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Введите URL англоязычной статьи");
      setParsed(null);
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Укажите корректный URL, например https://example.com/article");
      setParsed(null);
      return;
    }

    setError("");
    setActiveAction(action);
    setIsLoading(true);
    setParsed(null);

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

      if (!data.parsed) {
        throw new Error("Сервер не вернул данные статьи");
      }

      setParsed(data.parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setParsed(null);
    } finally {
      setIsLoading(false);
    }
  }

  const activeLabel = actions.find((item) => item.id === activeAction)?.label;
  const jsonResult = parsed ? formatParsedJson(parsed) : "";

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
          Вставьте ссылку на статью и выберите действие — сначала покажем распарсенные данные
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
          placeholder="https://example.com/article"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
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
          {isLoading ? (
            <div className="flex h-full min-h-36 flex-col items-center justify-center gap-3 text-slate-400">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
              <p>Парсим статью...</p>
            </div>
          ) : parsed ? (
            <div className="space-y-5">
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="font-medium text-sky-300">date</dt>
                  <dd className="mt-1 text-slate-200">{parsed.date ?? "null"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-sky-300">title</dt>
                  <dd className="mt-1 text-slate-200">{parsed.title ?? "null"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-sky-300">content</dt>
                  <dd className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap text-slate-200">
                    {parsed.content ?? "null"}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  JSON
                </p>
                <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-4 font-mono text-sm leading-7 text-slate-200">
                  {jsonResult}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-7 text-slate-500">
              Введите URL и нажмите любую кнопку — здесь появятся поля date, title, content
              и JSON с результатом парсинга.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
