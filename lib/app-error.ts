export type ErrorCode =
  | "ARTICLE_FETCH_FAILED"
  | "ARTICLE_PARSE_FAILED"
  | "AI_UNAVAILABLE"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMIT"
  | "AI_CONFIG_ERROR"
  | "IMAGE_CONFIG_ERROR"
  | "IMAGE_UNAVAILABLE"
  | "IMAGE_TIMEOUT"
  | "INVALID_URL"
  | "MISSING_URL"
  | "INVALID_REQUEST"
  | "UNKNOWN";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  ARTICLE_FETCH_FAILED: "Не удалось загрузить статью по этой ссылке.",
  ARTICLE_PARSE_FAILED:
    "Не удалось извлечь текст статьи. Попробуйте другую ссылку или проверьте, что страница содержит статью.",
  AI_UNAVAILABLE: "Сервис AI временно недоступен. Попробуйте позже.",
  AI_TIMEOUT: "AI не успел обработать статью. Попробуйте ещё раз или выберите более короткую статью.",
  AI_RATE_LIMIT: "Слишком много запросов. Подождите минуту и попробуйте снова.",
  AI_CONFIG_ERROR: "AI не настроен. Обратитесь к администратору приложения.",
  IMAGE_CONFIG_ERROR: "Генерация изображений не настроена. Добавьте HUGGINGFACE_API_KEY.",
  IMAGE_UNAVAILABLE: "Не удалось сгенерировать изображение. Попробуйте позже.",
  IMAGE_TIMEOUT: "Генерация изображения заняла слишком много времени. Попробуйте ещё раз.",
  INVALID_URL: "Укажите корректную ссылку, например: https://example.com/article",
  MISSING_URL: "Введите URL англоязычной статьи.",
  INVALID_REQUEST: "Некорректный запрос. Обновите страницу и попробуйте снова.",
  UNKNOWN: "Что-то пошло не так. Попробуйте ещё раз.",
};

export type AppErrorResponse = {
  code: ErrorCode;
  message: string;
};

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
  }

  toJSON(): AppErrorResponse {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError("UNKNOWN");
}

export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code];
}
