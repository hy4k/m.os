export type LlmPolicy =
  | "private-fast"
  | "coding"
  | "deep-reasoning"
  | "summarize"
  | "embed"
  | "vision-doc-analysis";

export interface ProviderTarget {
  name: "azure-ollama" | "hostinger-ollama" | "cloud";
  model: string;
  baseUrl: string;
  apiKey?: string;
}

export interface RoutingConfig {
  azure: ProviderTarget;
  hostinger: ProviderTarget;
  cloud?: ProviderTarget;
}

export function routePolicy(policy: LlmPolicy, cfg: RoutingConfig): ProviderTarget {
  if (policy === "deep-reasoning" && cfg.cloud) {
    return cfg.cloud;
  }
  if (policy === "private-fast" || policy === "embed") {
    return cfg.hostinger;
  }
  return cfg.azure;
}
