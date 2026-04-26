# Azure Ollama Runtime

This phase makes the Azure Ollama connection explicit and testable.

## Required Environment

Set these in production/staging:

```bash
AZURE_OLLAMA_BASE_URL=http://<azure-ollama-host>:11434
AZURE_OLLAMA_MODEL=gemma4:e4b
AZURE_OLLAMA_FALLBACK_MODELS=gemma3:12b,qwen3-coder:latest
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
# m.OS copilot: Ollama /api/chat (Gemma 4 on Azure) + optional system prompt override
# MOS_SYSTEM_PROMPT="..."   # long text is OK
OLLAMA_NUM_CTX=16384
OLLAMA_ASSISTANT_TEMPERATURE=0.35
```

`GET /api/llm/status` also returns `mosAssistant` (model, `numCtx`, `temperature`, and whether the system prompt is the built-in default or `MOS_SYSTEM_PROMPT`). The main dashboard copilot always uses the Azure endpoint with the `life-os` policy in the route table, not the Hostinger (small) model.

## Pull Models On Azure

Run on the Azure machine that hosts Ollama:

```bash
ollama pull gemma4:e4b
ollama pull nomic-embed-text
ollama pull gemma3:12b
ollama pull qwen3-coder:latest
```

## Verify From m.OS

The API exposes:

```bash
GET /api/llm/status
```

The web UI shows:
- whether Azure Ollama is reachable
- whether the selected Gemma model is installed
- the **life-os** route (Gemma 4 m.OS brain) and chip layout for RAG + graph
- optional `mosAssistant` tuning (`OLLAMA_NUM_CTX`, temperature)

## Current Important Note

m.OS is now ready to connect to Azure Ollama, but it is only truly connected once `AZURE_OLLAMA_BASE_URL` points to the real Azure Ollama host and `/api/llm/status` reports `Azure Ollama online`.
