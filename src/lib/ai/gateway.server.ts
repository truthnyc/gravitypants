import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { GatewayError, streamResponse } from "@lovable.dev/ai-gateway";

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
  let streamError: unknown;
  const result = streamText({
    onError: ({ error }) => {
      streamError = error;
    },
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
  try {
    return await result.text;
  } catch (e) {
    throw streamError ?? e;
  }
}

/** Map gateway failures to a short message the app can show. */
export function gatewayErrorMessage(e: unknown): string {
  const status = (e as { statusCode?: number })?.statusCode;
  if (status === 402) return "The billing helper is out of AI credits right now. Please try again later.";
  if (status === 429) return "The billing helper is busy. Please wait a minute and try again.";
  if (status === 403) return "The billing helper isn't available for this workspace.";
  return "The billing helper couldn't answer right now. Please try again later.";
}

/** New marketing calls use the native Gateway SDK; existing AI flows stay unchanged. */
export async function gatewayMarketingText(system: string, input: string): Promise<string> {
  try {
    const stream = await streamResponse({ model: "openai/gpt-6-astra", instructions: system, input: `Return JSON.\n${input}`, reasoning: { effort: "low" }, text: { format: { type: "json_object" } } });
    let text = "";
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") text += event.delta;
      if (event.type === "response.refusal.delta" || event.type === "response.incomplete") throw new Error("The Marketing Hub couldn't complete this draft.");
    }
    if (!text.trim()) throw new Error("The Marketing Hub didn't return a draft.");
    return text;
  } catch (error) {
    if (error instanceof GatewayError) {
      console.error("Marketing AI", error.code, error.httpStatus, error.ids);
      if (error.httpStatus === 402) throw new Error("The Marketing Hub needs more Lovable AI credits.");
      if (error.httpStatus === 429) throw new Error("The Marketing Hub is busy. Wait a minute before trying again.");
      if (error.httpStatus === 403) throw new Error("AI access is restricted for this workspace.");
    }
    throw new Error("Couldn't finish the draft. Your input is unchanged; you can try again.");
  }
}
