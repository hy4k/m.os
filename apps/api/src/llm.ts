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

type ProviderRoute = { provider: LlmProvider; model: string; baseUrl: string };

export function providerForPolicy(policy: LlmPolicy): ProviderRoute {
  if (policy === "deep-reasoning" && env.CLOUD_LLM_BASE_URL && env.CLOUD_LLM_MODEL) {
    return { provider: "cloud", model: env.CLOUD_LLM_MODEL, baseUrl: env.CLOUD_LLM_BASE_URL };
  }
  if (policy === "private-fast" || policy === "embed") {
    return { provider: "hostinger-ollama", model: env.HOSTINGER_OLLAMA_MODEL, baseUrl: env.HOSTINGER_OLLAMA_BASE_URL };
  }
  return { provider: "azure-ollama", model: env.AZURE_OLLAMA_MODEL, baseUrl: env.AZURE_OLLAMA_BASE_URL };
}

export function llmRoutes() {
  const policies: LlmPolicy[] = ["private-fast", "coding", "deep-reasoning", "summarize", "embed", "vision-doc-analysis"];
  return policies.map((policy) => ({
    policy,
    ...providerForPolicy(policy)
  }));
}

function fallbackModels() {
  return env.AZURE_OLLAMA_FALLBACK_MODELS
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

async function generateWithOllama(route: ProviderRoute, prompt: string) {
  const candidateModels = route.provider === "azure-ollama"
    ? [route.model, ...fallbackModels()]
    : [route.model];

  let lastError: Error | null = null;
  for (const model of candidateModels) {
    const response = await fetch(`${route.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    });

    if (response.ok) {
      const payload = (await response.json()) as { response?: string };
      return { output: payload.response ?? "", model };
    }

    lastError = new Error(`Ollama model ${model} failed: ${response.status}`);
  }

  throw lastError ?? new Error("Ollama call failed");
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

  const result = await generateWithOllama(selected, redacted);
  return {
    output: result.output,
    provider: selected.provider,
    model: result.model
  };
}

export async function ollamaStatus(baseUrl: string, expectedModel?: string) {
  const startedAt = Date.now();
  try {
    const [versionResponse, tagsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/version`),
      fetch(`${baseUrl}/api/tags`)
    ]);

    if (!versionResponse.ok || !tagsResponse.ok) {
      return {
        ok: false,
        baseUrl,
        latencyMs: Date.now() - startedAt,
        error: `version=${versionResponse.status} tags=${tagsResponse.status}`,
        models: [] as string[],
        expectedModel,
        expectedModelInstalled: false
      };
    }

    const version = await versionResponse.json() as { version?: string };
    const tags = await tagsResponse.json() as { models?: Array<{ name?: string; model?: string }> };
    const models = (tags.models ?? [])
      .map((model) => model.name ?? model.model)
      .filter((model): model is string => Boolean(model));

    return {
      ok: true,
      baseUrl,
      version: version.version ?? "unknown",
      latencyMs: Date.now() - startedAt,
      models,
      expectedModel,
      expectedModelInstalled: expectedModel ? models.some((model) => model === expectedModel || model.startsWith(`${expectedModel}:`)) : undefined
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown Ollama error",
      models: [] as string[],
      expectedModel,
      expectedModelInstalled: false
    };
  }
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
