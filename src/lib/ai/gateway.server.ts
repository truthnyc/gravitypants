import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const RUN_ID = "X-Lovable-AIG-Run-ID";
export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
export const DEFAULT_MODEL = "openai/gpt-6-astra";

/** One-shot Responses call through the Lovable AI Gateway; streams, returns final text. */
export async function gatewayText(system: string, messages: ModelMessage[], signal?: AbortSignal): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN_ID, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
      return res;
    },
  });
  const result = streamText({
    model: provider.responses(DEFAULT_MODEL),
    system,
    messages,
    ...(signal ? { abortSignal: signal } : {}),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return await result.text;
}

/** Map gateway failures to a short message the app can show. */
export function gatewayErrorMessage(e: unknown): string {
  const status = (e as { statusCode?: number })?.statusCode;
  if (status === 402) return "The billing helper is out of AI credits right now. Please try again later.";
  if (status === 429) return "The billing helper is busy. Please wait a minute and try again.";
  if (status === 403) return "The billing helper isn't available for this workspace.";
  return "The billing helper couldn't answer right now. Please try again later.";
}
