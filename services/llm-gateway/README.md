# LLM Gateway

Central routing layer for quality-first inference:

- `private-fast` -> Hostinger/local small model
- `coding` -> Azure Ollama stronger model
- `deep-reasoning` -> cloud fallback model (if configured)
- `summarize` -> Azure Ollama
- `embed` -> Hostinger/Azure embedding path
- `vision-doc-analysis` -> Azure or cloud multimodal model

## Responsibilities
- Provider/model selection
- Prompt redaction for secrets
- Context packing from user-authorized records
- Provider observability (latency, failures, token usage)
- Circuit-breaker fallback if a provider is unavailable

## Integration
- API uses this strategy in `apps/api/src/llm.ts`.
- Shared policy definitions live in `src/index.ts`.
