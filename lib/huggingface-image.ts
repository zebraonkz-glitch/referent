import {
  InferenceClient,
  InferenceClientHubApiError,
  InferenceClientProviderApiError,
} from "@huggingface/inference";

import { AppError } from "@/lib/app-error";

const DEFAULT_HF_MODEL = "black-forest-labs/FLUX.1-schnell";
const HF_TIMEOUT_MS = 120_000;

function readEnv(name: string): string | undefined {
  const value = process.env[name];

  if (!value) {
    return undefined;
  }

  return value.trim().replace(/^["']|["']$/g, "");
}

function getHuggingFaceConfig() {
  const apiKey = readEnv("HUGGINGFACE_API_KEY") ?? readEnv("HF_TOKEN");

  if (!apiKey) {
    throw new AppError("IMAGE_CONFIG_ERROR");
  }

  const model = readEnv("HUGGINGFACE_MODEL") ?? DEFAULT_HF_MODEL;

  return { apiKey, model };
}

function mapHttpStatusToError(status: number): AppError {
  if (status === 401 || status === 403) {
    return new AppError("IMAGE_CONFIG_ERROR");
  }

  if (status === 429) {
    return new AppError("AI_RATE_LIMIT");
  }

  if (status === 503) {
    return new AppError("IMAGE_UNAVAILABLE");
  }

  if (status >= 500) {
    return new AppError("IMAGE_UNAVAILABLE");
  }

  return new AppError("IMAGE_UNAVAILABLE");
}

function mapInferenceError(error: unknown): AppError {
  if (
    error instanceof InferenceClientProviderApiError ||
    error instanceof InferenceClientHubApiError
  ) {
    return mapHttpStatusToError(error.httpResponse.status);
  }

  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return new AppError("IMAGE_TIMEOUT");
    }

    const message = error.message.toLowerCase();

    if (message.includes("loading") || message.includes("unavailable")) {
      return new AppError("IMAGE_UNAVAILABLE");
    }
  }

  return new AppError("IMAGE_UNAVAILABLE");
}

export async function generateHuggingFaceImage(
  prompt: string,
): Promise<{ dataUrl: string; mimeType: string }> {
  const { apiKey, model } = getHuggingFaceConfig();
  const client = new InferenceClient(apiKey);

  try {
    const image = await client.textToImage(
      {
        provider: "hf-inference",
        model,
        inputs: prompt,
      },
      {
        signal: AbortSignal.timeout(HF_TIMEOUT_MS),
      },
    );

    const buffer = Buffer.from(await image.arrayBuffer());
    const mimeType = image.type.startsWith("image/") ? image.type : "image/png";
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return { dataUrl, mimeType };
  } catch (error) {
    throw mapInferenceError(error);
  }
}
