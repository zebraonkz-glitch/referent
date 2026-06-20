import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ErrorCode } from "@/lib/app-error";
import { getErrorMessage } from "@/lib/app-error";

type ErrorAlertProps = {
  code?: ErrorCode;
  message?: string;
  title?: string;
};

const errorTitles: Partial<Record<ErrorCode, string>> = {
  ARTICLE_FETCH_FAILED: "Ошибка загрузки",
  ARTICLE_PARSE_FAILED: "Ошибка парсинга",
  AI_UNAVAILABLE: "AI недоступен",
  AI_TIMEOUT: "Превышено время ожидания",
  AI_RATE_LIMIT: "Слишком много запросов",
  AI_CONFIG_ERROR: "Ошибка конфигурации",
  INVALID_URL: "Некорректная ссылка",
  MISSING_URL: "Ссылка не указана",
  INVALID_REQUEST: "Некорректный запрос",
  UNKNOWN: "Ошибка",
};

export function ErrorAlert({ code = "UNKNOWN", message, title }: ErrorAlertProps) {
  const resolvedMessage = message ?? getErrorMessage(code);
  const resolvedTitle = title ?? errorTitles[code] ?? "Ошибка";

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{resolvedTitle}</AlertTitle>
      <AlertDescription>{resolvedMessage}</AlertDescription>
    </Alert>
  );
}
