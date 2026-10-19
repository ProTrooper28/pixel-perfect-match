/**
 * Evaluation model — provider seam.
 *
 * Same registration pattern as `services/judging/ai-evaluation.service`: the
 * pipeline never constructs a provider itself, so swapping the model (or
 * running a fake in tests) is a registration call, not a pipeline change.
 *
 *   registerEvaluationModel(provider)  — pin an explicit provider (or null to
 *                                        force "no model")
 *   (no registration)                  — the built-in OpenAI-compatible
 *                                        provider is used when its env keys
 *                                        are present, otherwise "no model"
 *
 * Keys are read server-side only (see env.ts) and never reach the browser.
 */

import { readEnv } from "./env";

export interface EvaluationModelRequest {
  system: string;
  user: string;
}

export interface EvaluationModelProvider {
  /** Stable id recorded on the run (`runs.model` is the concrete model). */
  id: string;
  label: string;
  model: string | null;
  /** False when the provider cannot serve requests (missing key, …). */
  isAvailable(): boolean;
  /** Produce the raw evaluation JSON text for one submission. */
  request(request: EvaluationModelRequest): Promise<string>;
}

/** No usable model is configured → the run fails with a setup message. */
export class EvaluationModelUnavailableError extends Error {
  constructor(
    message = "No evaluation model is configured. Set EVAL_AGENT_API_KEY (plus optional EVAL_AGENT_BASE_URL / EVAL_AGENT_MODEL) or call registerEvaluationModel().",
  ) {
    super(message);
    this.name = "EvaluationModelUnavailableError";
  }
}

export class EvaluationModelRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationModelRequestError";
  }
}

/* -------------------------------------------------------- env provider cfg */

export interface EnvModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** Resolve the env-driven configuration, or null when no key is present. */
export function envModelConfig(): EnvModelConfig | null {
  const apiKey = readEnv("EVAL_AGENT_API_KEY");
  if (!apiKey) return null;
  const baseUrl = (readEnv("EVAL_AGENT_BASE_URL") ?? "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );
  const model = readEnv("EVAL_AGENT_MODEL") ?? "gpt-4o-mini";
  return { apiKey, baseUrl, model };
}

/* -------------------------------------------------- OpenAI-compatible impl */

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

/** Normalise `choices[0].message.content` (string or content parts). */
function extractContent(data: ChatCompletionResponse): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === "object" && "text" in part
          ? String((part as { text: unknown }).text ?? "")
          : "",
      )
      .join("");
  }
  return "";
}

/**
 * Built-in provider: any OpenAI-compatible `/chat/completions` endpoint
 * (OpenAI, a unified gateway such as OpenLLM, Groq, OpenRouter, a local
 * server, …) selected purely by `EVAL_AGENT_*` environment variables.
 */
export function openAiCompatibleModelProvider(
  config: EnvModelConfig,
): EvaluationModelProvider {
  return {
    id: "openai-compatible",
    label: "OpenAI-compatible chat completions",
    model: config.model,
    isAvailable: () => Boolean(config.apiKey),
    async request({ system, user }): Promise<string> {
      const timeout =
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(90_000)
          : undefined;

      let response: Response;
      try {
        response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            temperature: 0.2,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
          signal: timeout ?? null,
        });
      } catch (error) {
        throw new EvaluationModelRequestError(
          `Model request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 400);
        throw new EvaluationModelRequestError(
          `Model endpoint returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
        );
      }

      const data = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
      const text = data ? extractContent(data).trim() : "";
      if (!text) {
        throw new EvaluationModelRequestError("Model endpoint returned an empty completion");
      }
      return text;
    },
  };
}

/* --------------------------------------------------------------- registry */

/** undefined = never registered (auto/env); null = explicitly disabled. */
let registeredProvider: EvaluationModelProvider | null | undefined = undefined;

/**
 * Pin the provider for the pipeline. Pass `null` to force "no model"
 * (tests), `undefined` to return to env-driven resolution.
 */
export function registerEvaluationModel(
  provider: EvaluationModelProvider | null | undefined,
): void {
  registeredProvider = provider;
}

/** The provider the pipeline will use, or null when none is configured. */
export function activeEvaluationModel(): EvaluationModelProvider | null {
  if (registeredProvider !== undefined) return registeredProvider;
  const config = envModelConfig();
  if (!config) return null;
  return openAiCompatibleModelProvider(config);
}
