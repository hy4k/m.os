import { env } from "./config.js";
import { redactSecrets } from "./security.js";

export type LlmPolicy =
  | "private-fast"
  | "coding"
  | "deep-reasoning"
  | "summarize"
  | "embed"
  | "vision-doc-analysis";

type LlmProvider = "azure-ollama" | "hostinger-ollama" | "cloud";

function providerForPolicy(policy: LlmPolicy): { provider: LlmProvider; model: string; baseUrl: string } {
  if (policy === "deep-reasoning" && env.CLOUD_LLM_BASE_URL && env.CLOUD_LLM_MODEL) {
    return { provider: "cloud", model: env.CLOUD_LLM_MODEL, baseUrl: env.CLOUD_LLM_BASE_URL };
  }
  if (policy === "private-fast" || policy === "embed") {
    return { provider: "hostinger-ollama", model: env.HOSTINGER_OLLAMA_MODEL, baseUrl: env.HOSTINGER_OLLAMA_BASE_URL };
  }
  return { provider: "azure-ollama", model: env.AZURE_OLLAMA_MODEL, baseUrl: env.AZURE_OLLAMA_BASE_URL };
}

export async function runCompletion(input: {
  policy: LlmPolicy;
  prompt: string;
  context?: string;
}): Promise<{ output: string; provider: LlmProvider; model: string }> {
  const selected = providerForPolicy(input.policy);
  const fullPrompt = `${input.context ? `Context:\n${input.context}\n\n` : ""}User prompt:\n${input.prompt}`;
  const redacted = redactSecrets(fullPrompt);

  if (selected.provider === "cloud") {
    const response = await fetch(`${selected.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.CLOUD_LLM_API_KEY ?? ""}`
      },
      body: JSON.stringify({
        model: selected.model,
        messages: [{ role: "user", content: redacted }],
        temperature: 0.2
      })
    });
    if (!response.ok) {
      throw new Error(`Cloud LLM call failed: ${response.status}`);
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return {
      output: payload.choices?.[0]?.message?.content ?? "",
      provider: selected.provider,
      model: selected.model
    };
  }

  const response = await fetch(`${selected.baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: selected.model,
      prompt: redacted,
      stream: false
    })
  });
  if (!response.ok) {
    throw new Error(`Ollama call failed: ${response.status}`);
  }
  const payload = (await response.json()) as { response?: string };
  return {
    output: payload.response ?? "",
    provider: selected.provider,
    model: selected.model
  };
}

export async function embedText(input: string): Promise<number[]> {
  const response = await fetch(`${env.AZURE_OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.OLLAMA_EMBEDDING_MODEL,
      prompt: input
    })
  });
  if (!response.ok) {
    throw new Error(`Embedding call failed: ${response.status}`);
  }
  const payload = (await response.json()) as { embedding?: number[] };
  return payload.embedding ?? [];
}
